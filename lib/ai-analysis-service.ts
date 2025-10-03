import { DocumentContent, DocumentStructure } from './document-processor'
import { getAllReviewRules } from './administrative-penalty-rules'

const DEEPSEEK_CHAT_COMPLETION_URL = process.env.DEEPSEEK_API_URL?.trim() || 'https://api.deepseek.com/chat/completions'
const DEEPSEEK_MODEL_ID = process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-reasoner'
const DEEPSEEK_MODEL_VERSION = process.env.DEEPSEEK_MODEL_VERSION?.trim() || 'v3.2'
const DEEPSEEK_MODEL_LABEL = DEEPSEEK_MODEL_VERSION
  ? `${DEEPSEEK_MODEL_ID}-${DEEPSEEK_MODEL_VERSION}`
  : DEEPSEEK_MODEL_ID

export interface AIAnalysisOptions {
  enableSemanticCheck?: boolean
  enableLanguageCheck?: boolean
  enableLogicCheck?: boolean
  strictMode?: boolean
}

export interface AIAnalysisIssue {
  id: string
  type: "critical" | "warning" | "info"
  category: string
  title: string
  description: string
  location: string
  suggestion: string
  confidence?: number
}

export interface AIAnalysisResult {
  issues: AIAnalysisIssue[]
  summary: {
    totalIssues: number
    languageScore: number
    logicScore: number
    overallAssessment: string
  }
  processingDetails: {
    modelUsed: string
    processingTime: number
    tokensUsed?: number
  }
}

export interface RuleIssueForValidation {
  id: string
  type: 'critical' | 'warning' | 'info'
  category: string
  title: string
  description: string
  location: string
  suggestion: string
}

function sanitizeChineseText(text: string): string {
  if (!text) return '内容待补充'

  let result = text
    .replace(/\r?\n+/g, ' ') // 合并换行
    .replace(/\s+/g, ' ') // 压缩空白
    .replace(/\\"/g, '"') // 还原转义引号
    .replace(/^[\[{]+|[\]}]+$/g, '') // 去除首尾大括号
    .replace(/^["'""]+|["'""]+$/g, '') // 去除首尾引号
    .trim()

  // 移除残留的英文键名提示，如 "issues": 但保留数字和中文
  result = result.replace(/"[A-Za-z_]+"\s*[:：]/g, '')

  // ⚠️ 修复：只去除非数字、非中文周围的引号，避免误删数字
  // 改为：去除独立的引号（前后不是数字或中文的引号）
  result = result.replace(/(?<![0-9\u4e00-\u9fa5])["'""`]+(?![0-9\u4e00-\u9fa5])/g, '')

  // 去除首尾引号（这个保留）
  result = result.replace(/^["'""`]+|["'""`]+$/g, '')

  // ⚠️ 关键修复：不再使用中文匹配来提取内容，这会丢失数字和标点
  // 直接使用清理后的文本，只要包含中文就认为有效
  if (/[\u4e00-\u9fa5]/.test(result)) {
    // 有中文内容，进行最终清理
    result = result
      .replace(/\s*[,;，；]\s*/g, match => match.includes('，') || match.includes('；') ? match.trim() : '，')
      .replace(/\s*[:：]\s*/g, '：')
      .replace(/(?<=\p{Script=Han})\s+(?=\p{Script=Han})/gu, '') // 移除中文字符之间的多余空格
      .replace(/\s+/g, ' ')
      .trim()
  }

  return result.length > 0 ? result : '内容待补充'
}

function extractParagraphLocation(rawLocation?: string): string | null {
  if (!rawLocation) return null
  const normalized = rawLocation.replace(/\s+/g, '')

  const paragraphMatch = normalized.match(/第(\d+)段/)
  if (paragraphMatch) {
    return `第${paragraphMatch[1]}段`
  }

  const sectionMatch = normalized.match(/第([一二三四五六七八九十百千]+)部分/)
  if (sectionMatch) {
    return `第${sectionMatch[1]}部分`
  }

  const pageParagraphMatch = normalized.match(/第(\d+)页第(\d+)段/)
  if (pageParagraphMatch) {
    return `第${pageParagraphMatch[1]}页第${pageParagraphMatch[2]}段`
  }

  return null
}

function refineLocation(rawLocation: string, description: string): string {
  const cleaned = sanitizeChineseText(rawLocation)
  if (cleaned && cleaned !== '内容待补充') {
    return cleaned
  }

  const text = `${rawLocation ?? ''} ${description ?? ''}`

  const mapping: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /(标题|抬头|两行结构)/, label: '标题部分' },
    { pattern: /(文号|案号|字号)/, label: '文号部分' },
    { pattern: /(当事人|被处罚人|法定代表人)/, label: '当事人信息段' },
    { pattern: /(违法事实|经查|调查|事实)/, label: '违法事实部分' },
    { pattern: /(证据|笔录|材料)/, label: '证据说明部分' },
    { pattern: /(处罚决定|决定如下|责令|处以)/, label: '处罚决定段' },
    { pattern: /(复议|诉讼|救济|期限|缴纳|滞纳金)/, label: '救济及履行要求段' },
    { pattern: /(落款|盖章|机关|日期|署名)/, label: '落款部分' },
    { pattern: /(附表|附件|表格)/, label: '附件部分' }
  ]

  for (const { pattern, label } of mapping) {
    if (pattern.test(text)) {
      return label
    }
  }

  return '全文'
}

function sanitizeIssue(issue: AIAnalysisIssue): AIAnalysisIssue {
  const description = sanitizeChineseText(issue.description)
  const explicitLocation = extractParagraphLocation(issue.location)
  return {
    ...issue,
    category: sanitizeChineseText(issue.category),
    title: sanitizeChineseText(issue.title),
    description,
    location: explicitLocation ?? refineLocation(issue.location, description),
    suggestion: sanitizeChineseText(issue.suggestion)
  }
}

function buildRuleValidationPrompt(content: DocumentContent, issues: RuleIssueForValidation[]): string {
  const issuesDescription = issues.map((issue, index) =>
    `${index + 1}. [${issue.id}] ${issue.title}\n   问题：${issue.description}\n   位置：${issue.location}`
  ).join('\n\n')

  return `你是行政处罚决定书审查专家，需要复核以下规则检测出的问题是否为误报。

**重要原则**：
1. 如果文书中确实包含相关内容，即使表述方式不同，也应判定为误报
2. 只有真正缺失关键信息时才保留问题
3. 例如："罚款300元"和"罚款人民币300元"都是有效的

**文书内容**：
${content.text.substring(0, 3000)}${content.text.length > 3000 ? '...' : ''}

**待复核的问题**：
${issuesDescription}

请对每个问题判断是否为误报，输出JSON格式：

\`\`\`json
{
  "validatedIssues": [
    {
      "id": "问题ID",
      "verdict": "keep",
      "reason": "确实缺失XX信息"
    },
    {
      "id": "问题ID",
      "verdict": "discard",
      "reason": "文书中已包含XX内容"
    }
  ]
}
\`\`\`

verdict只能是"keep"(保留)或"discard"(误报)。`
}

function parseRuleValidationResponse(responseText: string, fallbackIssues: RuleIssueForValidation[]): Map<string, { verdict: 'keep' | 'discard'; reason?: string }> {
  const payload = extractJsonPayload(responseText)
  if (!payload) {
    throw new Error('No JSON payload in validation response')
  }

  const parsed = JSON.parse(payload)
  const rawList = Array.isArray(parsed?.validatedIssues) ? parsed.validatedIssues : []

  const result = new Map<string, { verdict: 'keep' | 'discard'; reason?: string }>()
  for (const item of rawList) {
    if (!item || typeof item !== 'object') continue
    const id = typeof item.id === 'string' ? item.id : ''
    const verdict = item.verdict === 'discard' ? 'discard' : 'keep'
    const reason = sanitizeChineseText(item.reason || '')
    if (!id) continue

    result.set(id, { verdict, reason })
  }

  // 确保未返回的规则默认保留
  for (const issue of fallbackIssues) {
    if (!result.has(issue.id)) {
      result.set(issue.id, { verdict: 'keep' })
    }
  }

  return result
}

function extractJsonPayload(aiResponse: string): string | null {
  if (!aiResponse) return null

  // 优先尝试截取首尾大括号之间的内容
  const firstBrace = aiResponse.indexOf('{')
  const lastBrace = aiResponse.lastIndexOf('}')

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = aiResponse.slice(firstBrace, lastBrace + 1)
    try {
      JSON.parse(candidate)
      return candidate
    } catch (_error) {
      // 继续尝试使用正则匹配
    }
  }

  const jsonMatches = aiResponse.match(/\{[\s\S]*\}/g)
  if (!jsonMatches) return null

  for (const match of jsonMatches) {
    try {
      JSON.parse(match)
      return match
    } catch (_error) {
      continue
    }
  }

  return null
}

/**
 * 构建简洁自然的AI审查提示词
 */
function buildAnalysisPrompt(content: DocumentContent, structure: DocumentStructure, options: AIAnalysisOptions): string {
  const strictModeNote = options.strictMode ? '请特别严格地审查所有细节问题。' : ''

  return `你是一位资深的行政处罚决定书审查专家，请仔细审查以下文书，指出存在的问题并给出改进建议。

**重要原则**：
1. 基于文书的实际内容进行判断，不要因为格式或表述方式不同而误报
2. 如果文书中明确包含某项内容（如"罚款300元"），即使表述简洁，也应认为已满足要求
3. 只有真正缺失关键信息或存在明显错误时才报告问题
4. 给出的建议必须具体可操作${strictModeNote}

**重点关注**：
- 必备要素完整性：
  * 当事人信息(根据"当事人:"后的名称自动判断类型)：
    - 判断规则：如果是人名则为个人,如果包含"公司、企业、商店、厂、中心、合作社、个体工商户"等则为单位
    - 个人当事人必需信息：姓名、住所(住址)、身份证号、联系电话
    - 单位当事人必需信息：名称、住所(住址)、统一社会信用代码、单位负责人信息(姓名、身份证号、联系方式)
    - 注意："法定代表人(负责人、经营者)"是正确表述,括号内是不同类型单位的不同称呼(公司用"法定代表人",个体户用"负责人"或"经营者"),不要报告此类格式问题
    - 不要报告"类型认定不清",而应根据判断结果直接指出缺失的具体信息要素
  * 违法事实、证据、法律依据、处罚决定、救济告知是否完整
- 格式规范性：
  * 信息字段不应有多余空格(如"统一社会信用代码 : 123"应为"统一社会信用代码:123")
  * 空白字段应删除(如"其他联系方式:"后无内容应删除整行)
  * 标点符号使用规范
- 逻辑一致性：事实、证据、法律依据、处罚决定之间是否对应，前后是否矛盾
- 法律准确性：引用的法律条款是否准确，处罚幅度是否合理
- 程序规范性：陈述申辩、听证、复议诉讼告知等程序是否齐全

**文书内容**：
${content.text}

请按以下JSON格式输出分析结果：

\`\`\`json
{
  "issues": [
    {
      "type": "critical|warning|info",
      "category": "当事人信息|违法事实与证据|处罚依据与决定|履行与权利告知|格式与语言规范|逻辑一致性",
      "title": "问题简要标题",
      "description": "具体问题描述",
      "location": "问题位置",
      "suggestion": "改进建议",
      "confidence": 85
    }
  ],
  "summary": {
    "languageScore": 85,
    "logicScore": 85,
    "overallAssessment": "整体评价"
  }
}
\`\`\`

如果没有发现问题，issues数组可以为空。评分标准：90分以上优秀，80-89分良好，70-79分合格，70分以下需要改进。`
}

/**
 * 调用DeepSeek API进行AI分析
 */
export async function performAIAnalysis(
  content: DocumentContent,
  structure: DocumentStructure,
  options: AIAnalysisOptions = {}
): Promise<AIAnalysisResult> {
  const startTime = Date.now()

  console.log('[AI Analysis] 开始AI语义分析...')
  console.log('[AI Analysis] 文档字数:', content.wordCount)
  console.log('[AI Analysis] 选项:', options)

  try {
    // 构建分析提示词
    const prompt = buildAnalysisPrompt(content, structure, options)
    console.log('[AI Analysis] 提示词长度:', prompt.length)

    // 调用DeepSeek API
    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      console.warn('[AI Analysis] DeepSeek API key not found, using fallback analysis')
      console.log('[AI Analysis] 环境变量检查: DEEPSEEK_API_KEY =', apiKey ? '已设置' : '未设置')
      return performFallbackAnalysis(content, structure)
    }

    console.log('[AI Analysis] API Key已配置，准备调用DeepSeek API...')

    const requestBody = {
      model: DEEPSEEK_MODEL_ID,
      ...(DEEPSEEK_MODEL_VERSION ? { model_version: DEEPSEEK_MODEL_VERSION } : {}),
      messages: [
        {
          role: 'system',
          content: '你是一位专业的行政处罚决定书审查专家，具有丰富的执法文书审查经验。请客观准确地指出问题，避免过度严格或误报。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.5,  // 提高灵活性，在准确性和创造性之间平衡
      max_tokens: 4096,  // 增加输出长度，确保完整分析
      top_p: 0.95
    }

    console.log('[AI Analysis] 发送API请求...')
    console.log('[AI Analysis] 请求模型:', `${requestBody.model} (${DEEPSEEK_MODEL_LABEL})`)
    console.log('[AI Analysis] 消息数量:', requestBody.messages.length)

    const response = await fetch(DEEPSEEK_CHAT_COMPLETION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    })

    console.log('[AI Analysis] API响应状态:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[AI Analysis] API错误响应:', errorText)
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const result = await response.json()
    console.log('[AI Analysis] API响应结构:', Object.keys(result))
    console.log('[AI Analysis] 使用tokens:', result.usage)

    const modelMessage = result.choices?.[0]?.message
    let aiResponse = modelMessage?.content

    if (!aiResponse) {
      const reasoningContent = modelMessage?.reasoning_content
      if (Array.isArray(reasoningContent)) {
        aiResponse = reasoningContent
          .map((chunk: { text?: string }) => chunk?.text ?? '')
          .filter(Boolean)
          .join('\n')
          .trim() || undefined
      } else if (typeof reasoningContent === 'string') {
        aiResponse = reasoningContent
      }
    }

    if (!aiResponse) {
      console.error('[AI Analysis] 空的API响应:', result)
      throw new Error('Empty response from DeepSeek API')
    }

    console.log('[AI Analysis] AI响应长度:', aiResponse.length)
    console.log('[AI Analysis] AI响应前200字符:', aiResponse.substring(0, 200))

    // 解析AI响应
    const analysisResult = parseAIResponse(aiResponse)
    const processingTime = Date.now() - startTime

    return {
      ...analysisResult,
      processingDetails: {
        modelUsed: DEEPSEEK_MODEL_LABEL,
        processingTime,
        tokensUsed: result.usage?.total_tokens
      }
    }

  } catch (error) {
    console.error('[AI Analysis] Error calling DeepSeek API:', error)
    console.error('[AI Analysis] 错误类型:', error?.constructor?.name)
    console.error('[AI Analysis] 错误信息:', error?.message)

    // 区分不同类型的错误
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('[AI Analysis] 网络连接错误')
    } else if (error?.message?.includes('API error')) {
      console.error('[AI Analysis] API调用错误')
    } else {
      console.error('[AI Analysis] 未知错误')
    }

    // 如果API调用失败，使用回退分析
    console.log('[AI Analysis] 回退到基于规则的专业分析')
    return performFallbackAnalysis(content, structure)
  }
}

export async function performRuleValidation(
  content: DocumentContent,
  issues: RuleIssueForValidation[],
  options: { strictMode?: boolean } = {}
): Promise<{ keptIssues: RuleIssueForValidation[]; discardedIssueIds: string[] }> {
  if (!issues || issues.length === 0) {
    return { keptIssues: [], discardedIssueIds: [] }
  }

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    console.warn('[AI Validation] DeepSeek API key not found, skip AI validation')
    return { keptIssues: issues, discardedIssueIds: [] }
  }

  const prompt = buildRuleValidationPrompt(content, issues)

  try {
    const requestBody = {
      model: DEEPSEEK_MODEL_ID,
      ...(DEEPSEEK_MODEL_VERSION ? { model_version: DEEPSEEK_MODEL_VERSION } : {}),
      messages: [
        {
          role: 'system',
          content: '你是行政处罚决定书审查专家，需要判断规则检测的问题是否为误报。如果文书中确实包含相关内容，应判定为误报。'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,  // 较低温度保证判断一致性
      max_tokens: 2048,  // 增加输出空间
      top_p: 0.9
    }

    const response = await fetch(DEEPSEEK_CHAT_COMPLETION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Validation API error ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    const message = result.choices?.[0]?.message?.content || ''
    console.log('[AI Validation] Response:', message.substring(0, 200))

    const parsedMap = parseRuleValidationResponse(message, issues)

    const kept: RuleIssueForValidation[] = []
    const discarded: string[] = []

    for (const issue of issues) {
      const verdict = parsedMap.get(issue.id)
      if (verdict?.verdict === 'discard') {
        console.log(`[AI Validation] Discarding: ${issue.id} - ${verdict.reason}`)
        discarded.push(issue.id)
      } else {
        kept.push(issue)
      }
    }

    console.log(`[AI Validation] Kept ${kept.length}, discarded ${discarded.length} out of ${issues.length}`)
    return { keptIssues: kept, discardedIssueIds: discarded }
  } catch (error) {
    console.error('[AI Validation] Error validating rule issues:', error)
    return { keptIssues: issues, discardedIssueIds: [] }
  }
}

/**
 * 解析AI响应 - 支持JSON和自然语言两种模式
 */
function parseAIResponse(aiResponse: string): Omit<AIAnalysisResult, 'processingDetails'> {
  try {
    // 尝试提取JSON
    const jsonPayload = extractJsonPayload(aiResponse)
    if (!jsonPayload) {
      console.log('[AI Analysis] No JSON found, parsing as natural language')
      return parseNaturalLanguageResponse(aiResponse)
    }

    const parsed = JSON.parse(jsonPayload)

    // 标准化issues
    const issues: AIAnalysisIssue[] = (parsed.issues || []).map((issue: any, index: number) =>
      sanitizeIssue({
        id: `ai_${Date.now()}_${index}`,
        type: issue.type || 'info',
        category: issue.category || 'AI分析',
        title: issue.title || '检测到问题',
        description: issue.description || '',
        location: issue.location || '相关段落',
        suggestion: issue.suggestion || '建议进行优化',
        confidence: issue.confidence || 85
      })
    )

    return {
      issues,
      summary: {
        totalIssues: issues.length,
        languageScore: Math.max(0, Math.min(100, parsed.summary?.languageScore || 85)),
        logicScore: Math.max(0, Math.min(100, parsed.summary?.logicScore || 85)),
        overallAssessment: sanitizeChineseText(parsed.summary?.overallAssessment || '整体质量良好')
      }
    }
  } catch (error) {
    console.error('[AI Analysis] JSON parse error:', error)
    return parseNaturalLanguageResponse(aiResponse)
  }
}

/**
 * 解析自然语言响应
 */
function parseNaturalLanguageResponse(text: string): Omit<AIAnalysisResult, 'processingDetails'> {
  const issues: AIAnalysisIssue[] = []

  // 提取严重问题
  const criticalSection = text.match(/##?\s*严重问题[\s\S]*?(?=##|$)/i)
  if (criticalSection) {
    const criticalItems = criticalSection[0].match(/[-\d.]\s*.+/g) || []
    criticalItems.forEach((item, index) => {
      if (item.trim().length > 5) {
        issues.push(sanitizeIssue({
          id: `ai_critical_${Date.now()}_${index}`,
          type: 'critical',
          category: 'AI分析',
          title: '严重问题',
          description: item.replace(/^[-\d.]\s*/, '').trim(),
          location: '相关段落',
          suggestion: '建议立即修正',
          confidence: 90
        }))
      }
    })
  }

  // 提取警告问题
  const warningSection = text.match(/##?\s*警告问题[\s\S]*?(?=##|$)/i)
  if (warningSection) {
    const warningItems = warningSection[0].match(/[-\d.]\s*.+/g) || []
    warningItems.forEach((item, index) => {
      if (item.trim().length > 5) {
        issues.push(sanitizeIssue({
          id: `ai_warning_${Date.now()}_${index}`,
          type: 'warning',
          category: 'AI分析',
          title: '警告问题',
          description: item.replace(/^[-\d.]\s*/, '').trim(),
          location: '相关段落',
          suggestion: '建议优化',
          confidence: 85
        }))
      }
    })
  }

  // 提取总体评价
  const assessmentMatch = text.match(/##?\s*总体评价[\s\S]*?(?=##|$)/i)
  const overallAssessment = assessmentMatch
    ? sanitizeChineseText(assessmentMatch[0].replace(/##?\s*总体评价\s*/i, '').trim())
    : '文书已通过AI审查'

  // 基于问题数量计算评分
  const criticalCount = issues.filter(i => i.type === 'critical').length
  const warningCount = issues.filter(i => i.type === 'warning').length
  const baseScore = 95
  const score = Math.max(60, baseScore - criticalCount * 10 - warningCount * 5)

  return {
    issues,
    summary: {
      totalIssues: issues.length,
      languageScore: score,
      logicScore: score,
      overallAssessment
    }
  }
}

/**
 * 从AI响应文本中提取简单分析结果
 */
function extractSimpleAnalysis(aiResponse: string): Omit<AIAnalysisResult, 'processingDetails'> {
  const issues: AIAnalysisIssue[] = []

  // 简单的关键词检测
  if (aiResponse.includes('问题') || aiResponse.includes('建议') || aiResponse.includes('不规范')) {
    issues.push(sanitizeIssue({
      id: `ai_text_${Date.now()}`,
      type: 'info',
      category: 'AI语义分析',
      title: 'AI检测到改进点',
      description: '根据AI分析，文档存在可以改进的地方',
      location: '全文',
      suggestion: sanitizeChineseText(aiResponse.substring(0, 200) + '...'),
      confidence: 70
    }))
  }

  return {
    issues,
    summary: {
      totalIssues: issues.length,
      languageScore: 80,
      logicScore: 80,
      overallAssessment: sanitizeChineseText('AI分析完成，请参考具体建议')
    }
  }
}

/**
 * 回退分析方法（当AI API不可用时使用专业审查规则）
 */
function performFallbackAnalysis(_content: DocumentContent, _structure: DocumentStructure): AIAnalysisResult {
  return {
    issues: [],
    summary: {
      totalIssues: 0,
      languageScore: 90,
      logicScore: 90,
      overallAssessment: 'AI语义分析未启用，本次仅依据规则审查结果评估。'
    },
    processingDetails: {
      modelUsed: 'rule-fallback-disabled',
      processingTime: 0
    }
  }
}
