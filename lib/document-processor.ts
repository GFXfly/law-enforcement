import mammoth from "mammoth"
import { getAllReviewRules, getRulesBySeverity } from './administrative-penalty-rules'

export interface DocumentContent {
  text: string
  html: string
  wordCount: number
  paragraphs: string[]
  metadata: {
    fileName: string
    fileSize: number
    extractedAt: string
  }
}

export interface DocumentStructure {
  title: string
  titleLines?: string[]
  sections: Array<{
    heading: string
    content: string
    level: number
  }>
  tables: Array<{
    rows: string[][]
    location: string
  }>
  lists: Array<{
    items: string[]
    type: 'ordered' | 'unordered'
    location: string
  }>
}

export interface DetailedValidationResult {
  isValid: boolean
  overallScore: number
  confidence: number
  summary: {
    totalIssues: number
    criticalIssues: number
    warningIssues: number
    infoIssues: number
  }
  categoryResults: Array<{
    category: string
    score: number
    issues: Array<{
      ruleId: string
      ruleName: string
      severity: 'critical' | 'warning' | 'info'
      description: string
      issues: string[]
      suggestions: string[]
    }>
  }>
  reasons: string[]
}

/**
 * 解析DOCX文档内容
 */
export async function parseDocumentContent(file: File): Promise<DocumentContent> {
  try {
    // 将文件转换为Buffer (mammoth需要Buffer而不是ArrayBuffer)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 使用mammoth提取文本内容
    const textResult = await mammoth.extractRawText({ buffer: buffer })

    // 使用mammoth提取HTML内容（包含格式）
    const htmlResult = await mammoth.convertToHtml({ buffer: buffer })

    // 分析文档结构
    const text = textResult.value
    const html = htmlResult.value

    // 按段落分割文本
    const paragraphs = text
      .split('\n')
      .filter(p => p.trim().length > 0)
      .map(p => p.trim())

    // 计算字数
    const wordCount = text.length

    return {
      text,
      html,
      wordCount,
      paragraphs,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        extractedAt: new Date().toISOString(),
      }
    }
  } catch (error) {
    console.error('文档解析失败:', error)
    throw new Error(`文档解析失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 分析文档结构
 */
export function analyzeDocumentStructure(content: DocumentContent): DocumentStructure {
  const { paragraphs, html } = content

  const normalizedParagraphs = paragraphs.map((p) => p.trim()).filter((p) => p.length > 0)
  const firstLine = normalizedParagraphs[0] || ''
  const secondLine = normalizedParagraphs[1] || ''

  // 简单的标题检测（基于行长度和常见标题模式）
  const detectTitle = (text: string): boolean => {
    const titlePatterns = [
      /行政处罚决定书/,
      /处罚决定/,
      /决定书/,
      /^.{1,50}处罚.{1,20}$/
    ]

    return titlePatterns.some(pattern => pattern.test(text)) ||
           (text.length < 50 && text.length > 5 && !text.includes('。'))
  }

  // 检测章节标题
  const detectSectionHeading = (text: string): { isHeading: boolean, level: number } => {
    // 检测编号格式 (一、二、三、) (1、2、3、) ((一)(二)(三))
    const headingPatterns = [
      { pattern: /^[一二三四五六七八九十]+[、．]/, level: 1 },
      { pattern: /^[1-9][0-9]*[、．]/, level: 2 },
      { pattern: /^\([一二三四五六七八九十]+\)/, level: 1 },
      { pattern: /^\([1-9][0-9]*\)/, level: 2 },
      { pattern: /^第[一二三四五六七八九十]+[章节条款]/, level: 1 }
    ]

    for (const { pattern, level } of headingPatterns) {
      if (pattern.test(text)) {
        return { isHeading: true, level }
      }
    }

    return { isHeading: false, level: 0 }
  }

  // 提取文档标题
  let title = paragraphs.find(p => detectTitle(p)) || '行政处罚决定书'

  const titleLines: string[] = []
  if (firstLine) titleLines.push(firstLine)
  if (secondLine) titleLines.push(secondLine)

  if (firstLine && secondLine && /行政处罚决定书/.test(secondLine)) {
    title = `${firstLine}${secondLine}`
  }

  // 提取章节结构
  const sections: Array<{ heading: string, content: string, level: number }> = []
  let currentSection: { heading: string, content: string[], level: number } | null = null

  // 辅助函数：添加章节到结果数组
  const addSection = (section: { heading: string, content: string[], level: number }) => {
    sections.push({
      heading: section.heading,
      content: section.content.join('\n'),
      level: section.level
    })
  }

  paragraphs.forEach(paragraph => {
    const { isHeading, level } = detectSectionHeading(paragraph)

    if (isHeading) {
      // 保存前一个章节
      if (currentSection) {
        addSection(currentSection)
      }

      // 开始新章节
      currentSection = {
        heading: paragraph,
        content: [],
        level
      }
    } else if (currentSection) {
      // 添加内容到当前章节
      currentSection.content.push(paragraph)
    }
  })

  // 保存最后一个章节
  if (currentSection) {
    addSection(currentSection)
  }

  // 简单的表格检测（基于HTML）
  const tables: Array<{ rows: string[][], location: string }> = []
  const tableMatches = html.match(/<table[^>]*>.*?<\/table>/gi) || []
  tableMatches.forEach((tableHtml, index) => {
    // 简化的表格解析
    const rows: string[][] = []
    const rowMatches = tableHtml.match(/<tr[^>]*>.*?<\/tr>/gi) || []
    rowMatches.forEach(rowHtml => {
      const cells = rowHtml.match(/<td[^>]*>(.*?)<\/td>/gi) || []
      const cellTexts = cells.map(cell => cell.replace(/<[^>]*>/g, '').trim())
      if (cellTexts.length > 0) {
        rows.push(cellTexts)
      }
    })

    if (rows.length > 0) {
      tables.push({
        rows,
        location: `表格${index + 1}`
      })
    }
  })

  // 列表检测
  const lists: Array<{ items: string[], type: 'ordered' | 'unordered', location: string }> = []
  const listMatches = html.match(/<[ou]l[^>]*>.*?<\/[ou]l>/gi) || []
  listMatches.forEach((listHtml, index) => {
    const isOrdered = listHtml.startsWith('<ol')
    const itemMatches = listHtml.match(/<li[^>]*>(.*?)<\/li>/gi) || []
    const items = itemMatches.map(item => item.replace(/<[^>]*>/g, '').trim())

    if (items.length > 0) {
      lists.push({
        items,
        type: isOrdered ? 'ordered' : 'unordered',
        location: `列表${index + 1}`
      })
    }
  })

  return {
    title,
    titleLines,
    sections,
    tables,
    lists
  }
}

/**
 * 验证文档类型是否为行政处罚决定书
 */
export function validateDocumentType(content: DocumentContent): {
  isValid: boolean
  confidence: number
  reasons: string[]
} {
  const { text, paragraphs } = content
  const reasons: string[] = []
  let score = 0

  const normalizedParagraphs = paragraphs.map(paragraph => paragraph.trim()).filter(paragraph => paragraph.length > 0)
  const firstLine = normalizedParagraphs[0] || ''
  const secondLine = normalizedParagraphs[1] || ''

  // 检查关键词
  const keywordChecks = [
    { keywords: ['行政处罚', '处罚决定'], weight: 30, name: '包含处罚相关关键词' },
    { keywords: ['当事人', '违法行为'], weight: 20, name: '包含当事人和违法行为' },
    { keywords: ['依据', '法律', '法规'], weight: 15, name: '包含法律依据' },
    { keywords: ['决定', '处以', '罚款'], weight: 20, name: '包含处罚决定' },
    { keywords: ['复议', '诉讼', '救济'], weight: 10, name: '包含救济途径' },
    { keywords: ['执法机关', '年', '月', '日'], weight: 5, name: '包含执法机关和日期' }
  ]

  keywordChecks.forEach(({ keywords, weight, name }) => {
    const hasKeywords = keywords.some(keyword => text.includes(keyword))
    if (hasKeywords) {
      score += weight
      reasons.push(name)
    }
  })

  const matchedKeywordCount = keywordChecks.reduce((count, { keywords }) => {
    return count + (keywords.some(keyword => text.includes(keyword)) ? 1 : 0)
  }, 0)

  // 核心标题判定
  const coreTitlePatterns = [
    /行政处罚决定书/,
    /行政处罚决定\s*$/,
  ]
  const hasCoreTitle = coreTitlePatterns.some(pattern => pattern.test(firstLine)) ||
    coreTitlePatterns.some(pattern => pattern.test(text))

  if (hasCoreTitle) {
    reasons.push('检测到行政处罚决定书核心标题')
    score += 10
  }

  const hasTwoLineTitle = Boolean(firstLine && secondLine && /行政处罚决定书/.test(secondLine))
  if (hasTwoLineTitle) {
    reasons.push('标题符合“机关名称 + 行政处罚决定书”两行格式')
    score += 10
  }

  // 必要要素检查
  const essentialKeywords = ['当事人', '违法', '处罚', '依据', '救济']
  const essentialMatches = essentialKeywords.filter(keyword => text.includes(keyword))
  if (essentialMatches.length >= 3) {
    reasons.push('包含核心要素信息')
    score += 10
  }

  // 检查文档结构完整性
  const structureChecks = [
    { check: () => paragraphs.length >= 5, weight: 10, name: '文档结构完整（段落数量合理）' },
    { check: () => text.length >= 200, weight: 5, name: '内容长度符合要求' },
    { check: () => /\d{4}年\d{1,2}月\d{1,2}日/.test(text), weight: 10, name: '包含日期格式' }
  ]

  structureChecks.forEach(({ check, weight, name }) => {
    if (check()) {
      score += weight
      reasons.push(name)
    }
  })

  if (!hasCoreTitle) {
    reasons.push('未检测到典型的行政处罚决定书标题')
  }
  if (essentialMatches.length < 3) {
    reasons.push('核心要素出现次数不足')
  }
  if (!hasTwoLineTitle) {
    reasons.push('标题格式未检测到“机关名称 + 行政处罚决定书”两行排列')
  }

  const confidence = Math.min(score, 100)
  const isValid = hasCoreTitle && hasTwoLineTitle && matchedKeywordCount >= 4 && essentialMatches.length >= 3 && confidence >= 70

  return {
    isValid,
    confidence,
    reasons
  }
}

/**
 * 详细验证文档是否符合行政处罚决定书规范（使用专业审查规则）
 */
export function validateDocumentDetailed(content: DocumentContent, structure: DocumentStructure): DetailedValidationResult {
  const allRules = getAllReviewRules()
  const categoryResults: DetailedValidationResult['categoryResults'] = []
  const allIssues: Array<{
    ruleId: string
    ruleName: string
    severity: 'critical' | 'warning' | 'info'
    description: string
    issues: string[]
    suggestions: string[]
  }> = []

  // 按类别分组规则
  const rulesByCategory = allRules.reduce((acc, rule) => {
    if (!acc[rule.category]) {
      acc[rule.category] = []
    }
    acc[rule.category].push(rule)
    return acc
  }, {} as Record<string, typeof allRules>)

  // 逐个类别检查
  Object.entries(rulesByCategory).forEach(([category, rules]) => {
    const categoryIssues: DetailedValidationResult['categoryResults'][0]['issues'] = []
    let categoryScore = 100

    rules.forEach(rule => {
      try {
        const result = rule.checkFunction(content, structure)

        // 新的返回格式是 ReviewIssue[] 数组
        if (Array.isArray(result) && result.length > 0) {
          const issueData = {
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            description: rule.description,
            issues: result.map(issue => issue.problem),
            suggestions: result.map(issue => issue.solution)
          }

          categoryIssues.push(issueData)
          allIssues.push(issueData)

          // 计算扣分
          const deductionMap = {
            'critical': 20,
            'warning': 10,
            'info': 5
          }
          categoryScore -= deductionMap[rule.severity] * result.length
        }
      } catch (error) {
        console.error(`规则检查失败 [${rule.id}]:`, error)
        // 规则检查失败时不影响整体流程
      }
    })

    categoryResults.push({
      category,
      score: Math.max(0, categoryScore),
      issues: categoryIssues
    })
  })

  // 计算整体统计信息
  const criticalIssues = allIssues.filter(issue => issue.severity === 'critical').length
  const warningIssues = allIssues.filter(issue => issue.severity === 'warning').length
  const infoIssues = allIssues.filter(issue => issue.severity === 'info').length
  const totalIssues = criticalIssues + warningIssues + infoIssues

  // 计算整体评分
  let overallScore = 100
  overallScore -= criticalIssues * 20
  overallScore -= warningIssues * 10
  overallScore -= infoIssues * 5
  overallScore = Math.max(0, overallScore)

  // 生成原因说明
  const reasons: string[] = []
  if (criticalIssues > 0) {
    reasons.push(`发现${criticalIssues}个严重问题，涉及法定要素缺失`)
  }
  if (warningIssues > 0) {
    reasons.push(`发现${warningIssues}个警告问题，需要规范改进`)
  }
  if (infoIssues > 0) {
    reasons.push(`发现${infoIssues}个提示问题，建议优化`)
  }

  // 判定是否有效（严格标准：无严重问题且总评分>=70）
  const isValid = criticalIssues === 0 && overallScore >= 70

  // 计算可信度（基于规则覆盖程度和问题严重性）
  const rulesCoverage = Math.min(100, (content.text.length / 500) * 100) // 基于内容长度的覆盖度
  const problemSeverityFactor = criticalIssues > 0 ? 0.6 : warningIssues > 0 ? 0.8 : 0.9
  const confidence = Math.round(rulesCoverage * problemSeverityFactor)

  return {
    isValid,
    overallScore: Math.round(overallScore),
    confidence: Math.max(0, Math.min(100, confidence)),
    summary: {
      totalIssues,
      criticalIssues,
      warningIssues,
      infoIssues
    },
    categoryResults,
    reasons
  }
}
