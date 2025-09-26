/**
 * 综合审查服务
 * 整合规则检查、AI分析和专业验证功能
 */

import { DocumentContent, DocumentStructure, validateDocumentDetailed, DetailedValidationResult } from './document-processor'
import { performAIAnalysis, AIAnalysisResult, AIAnalysisOptions } from './ai-analysis-service'
import { getAllReviewRules, getRulesByCategory, getRulesBySeverity } from './administrative-penalty-rules'

const AI_SEMANTIC_REVIEW_DISABLED = process.env.AI_SEMANTIC_REVIEW_DISABLED === 'true'

export interface ComprehensiveReviewOptions {
  enableAI?: boolean
  enableSemanticCheck?: boolean
  enableLanguageCheck?: boolean
  enableLogicCheck?: boolean
  strictMode?: boolean
  includeDetailedRules?: boolean
}

export interface ComprehensiveReviewResult {
  // 基础信息
  documentInfo: {
    fileName: string
    wordCount: number
    paragraphs: number
    sections: number
  }

  // 验证结果
  validation: DetailedValidationResult

  // AI分析结果（如果启用）
  aiAnalysis?: AIAnalysisResult

  // 综合评分
  finalScore: number

  // 问题汇总
  allIssues: Array<{
    id: string
    source: 'rules' | 'ai'
    type: 'critical' | 'warning' | 'info'
    category: string
    title: string
    description: string
    location: string
    suggestion: string
    confidence: number
  }>

  // 分类统计
  statistics: {
    totalIssues: number
    criticalIssues: number
    warningIssues: number
    infoIssues: number
    ruleIssues: number
    aiIssues: number
  }

  // 处理信息
  processingInfo: {
    processingTime: number
    rulesApplied: number
    aiEnabled: boolean
    modelUsed?: string
  }

  // 专业建议
  recommendations: {
    priority: 'high' | 'medium' | 'low'
    actions: string[]
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
    complianceStatus: 'compliant' | 'needs_improvement' | 'non_compliant'
  }
}

/**
 * 执行综合审查
 */
export async function performComprehensiveReview(
  content: DocumentContent,
  structure: DocumentStructure,
  options: ComprehensiveReviewOptions = {}
): Promise<ComprehensiveReviewResult> {
  const startTime = Date.now()

  // 默认选项
  const reviewOptions = {
    enableAI: false,
    enableSemanticCheck: true,
    enableLanguageCheck: true,
    enableLogicCheck: true,
    strictMode: false,
    includeDetailedRules: true,
    ...options
  }

  console.log('[综合审查] 开始执行综合审查...')

  // 1. 执行专业规则验证
  console.log('[综合审查] 执行专业规则验证...')
  const validation = validateDocumentDetailed(content, structure)

  // 2. 执行AI分析（如果启用）
  let aiAnalysis: AIAnalysisResult | undefined
  const aiShouldRun = reviewOptions.enableAI && !AI_SEMANTIC_REVIEW_DISABLED

  if (aiShouldRun) {
    console.log('[综合审查] 执行AI语义分析...')
    try {
      const aiOptions: AIAnalysisOptions = {
        enableSemanticCheck: reviewOptions.enableSemanticCheck,
        enableLanguageCheck: reviewOptions.enableLanguageCheck,
        enableLogicCheck: reviewOptions.enableLogicCheck,
        strictMode: reviewOptions.strictMode
      }
      aiAnalysis = await performAIAnalysis(content, structure, aiOptions)
    } catch (error) {
      console.warn('[综合审查] AI分析失败，将跳过AI结果:', error)
    }
  } else {
    console.log('[综合审查] AI语义审查已暂时停用，跳过AI流程')
  }

  // 3. 汇总所有问题
  const allIssues: ComprehensiveReviewResult['allIssues'] = []

  // 添加规则检查问题
  validation.categoryResults.forEach(category => {
    category.issues.forEach(issue => {
      allIssues.push({
        id: `rule_${issue.ruleId}`,
        source: 'rules',
        type: issue.severity,
        category: category.category,
        title: issue.ruleName,
        description: issue.description,
        location: issue.issues.length > 0 ? `发现 ${issue.issues.length} 项问题` : '相关段落',
        suggestion: issue.suggestions.join('；') || '建议按照相关法规要求进行修改',
        confidence: 95 // 规则检查具有高可信度
      })
    })
  })

  // 添加AI分析问题（如果有）
  if (aiShouldRun && aiAnalysis) {
    aiAnalysis.issues.forEach(issue => {
      // 避免重复问题（基于类别和标题的简单去重）
      const isDuplicate = allIssues.some(existingIssue =>
        existingIssue.category === issue.category &&
        existingIssue.title === issue.title
      )

      if (!isDuplicate) {
        allIssues.push({
          id: issue.id,
          source: 'ai',
          type: issue.type,
          category: issue.category,
          title: issue.title,
          description: issue.description,
          location: issue.location,
          suggestion: issue.suggestion,
          confidence: issue.confidence || 85
        })
      }
    })
  }

  // 4. 计算统计信息
  const statistics = {
    totalIssues: allIssues.length,
    criticalIssues: allIssues.filter(i => i.type === 'critical').length,
    warningIssues: allIssues.filter(i => i.type === 'warning').length,
    infoIssues: allIssues.filter(i => i.type === 'info').length,
    ruleIssues: allIssues.filter(i => i.source === 'rules').length,
    aiIssues: allIssues.filter(i => i.source === 'ai').length
  }

  // 5. 计算最终评分（综合规则验证和AI分析）
  let finalScore = validation.overallScore
  if (aiShouldRun && aiAnalysis) {
    // 加权平均：规则验证70%，AI分析30%
    const aiScore = Math.min(aiAnalysis.summary.languageScore, aiAnalysis.summary.logicScore)
    finalScore = Math.round(finalScore * 0.7 + aiScore * 0.3)
  }

  // 6. 生成专业建议
  const recommendations = generateRecommendations(statistics, finalScore, validation, aiAnalysis)

  // 7. 计算处理时间
  const processingTime = Date.now() - startTime

  console.log(`[综合审查] 审查完成，耗时: ${processingTime}ms`)

  return {
    documentInfo: {
      fileName: content.metadata.fileName,
      wordCount: content.wordCount,
      paragraphs: content.paragraphs.length,
      sections: structure.sections.length
    },
    validation,
    aiAnalysis,
    finalScore,
    allIssues,
    statistics,
    processingInfo: {
      processingTime,
      rulesApplied: getAllReviewRules().length,
      aiEnabled: aiShouldRun && !!aiAnalysis,
      modelUsed: aiAnalysis?.processingDetails?.modelUsed
    },
    recommendations
  }
}

/**
 * 生成专业建议
 */
function generateRecommendations(
  statistics: ComprehensiveReviewResult['statistics'],
  finalScore: number,
  validation: DetailedValidationResult,
  aiAnalysis?: AIAnalysisResult
): ComprehensiveReviewResult['recommendations'] {
  const actions: string[] = []
  let priority: 'high' | 'medium' | 'low' = 'low'
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
  let complianceStatus: 'compliant' | 'needs_improvement' | 'non_compliant' = 'compliant'

  // 根据严重问题数量确定优先级和风险等级
  if (statistics.criticalIssues > 0) {
    priority = 'high'
    riskLevel = statistics.criticalIssues >= 3 ? 'critical' : 'high'
    complianceStatus = 'non_compliant'

    actions.push(`立即处理 ${statistics.criticalIssues} 个严重问题，涉及法定要素缺失或程序违法`)
    actions.push('重点关注当事人信息、违法事实认定、法律依据引用等核心要素')
    actions.push('建议法律专家进行复核，确保合规性')
  } else if (statistics.warningIssues > 3) {
    priority = 'medium'
    riskLevel = 'medium'
    complianceStatus = 'needs_improvement'

    actions.push(`及时修正 ${statistics.warningIssues} 个警告问题`)
    actions.push('完善格式规范和表述完整性')
  } else {
    priority = 'low'
    riskLevel = 'low'
    complianceStatus = statistics.warningIssues > 0 ? 'needs_improvement' : 'compliant'

    if (statistics.infoIssues > 0) {
      actions.push(`优化 ${statistics.infoIssues} 个提示问题，提升文书质量`)
    }
  }

  // 基于评分添加建议
  if (finalScore < 60) {
    actions.push('文书质量不符合基本要求，建议全面重新审查和修订')
  } else if (finalScore < 80) {
    actions.push('文书质量需要改进，建议按优先级逐项完善')
  } else if (finalScore < 90) {
    actions.push('文书质量良好，建议关注细节完善')
  } else {
    actions.push('文书质量优秀，符合规范要求')
  }

  // 添加AI分析相关建议
  if (aiAnalysis && aiAnalysis.summary.languageScore < 80) {
    actions.push('注意语言表述的规范性，避免口语化表述')
  }

  if (aiAnalysis && aiAnalysis.summary.logicScore < 80) {
    actions.push('加强逻辑结构的完整性，确保事实认定与法律适用的一致性')
  }

  // 添加救济途径专门建议
  const hasRemedyIssues = validation.categoryResults.some(category =>
    category.category === '履行与权利告知' && category.issues.length > 0
  )
  if (hasRemedyIssues) {
    actions.push('完善救济途径告知，明确行政复议和诉讼的期限、机关信息')
  }

  return {
    priority,
    actions: actions.length > 0 ? actions : ['文书符合基本要求，建议定期复查'],
    riskLevel,
    complianceStatus
  }
}

/**
 * 按类别获取问题统计
 */
export function getIssuesByCategory(result: ComprehensiveReviewResult) {
  const categoryStats: Record<string, {
    total: number
    critical: number
    warning: number
    info: number
    issues: ComprehensiveReviewResult['allIssues']
  }> = {}

  result.allIssues.forEach(issue => {
    if (!categoryStats[issue.category]) {
      categoryStats[issue.category] = {
        total: 0,
        critical: 0,
        warning: 0,
        info: 0,
        issues: []
      }
    }

    const cat = categoryStats[issue.category]
    cat.total++
    cat[issue.type]++
    cat.issues.push(issue)
  })

  return categoryStats
}

/**
 * 获取最高优先级问题
 */
export function getHighPriorityIssues(result: ComprehensiveReviewResult) {
  return result.allIssues
    .filter(issue => issue.type === 'critical')
    .sort((a, b) => b.confidence - a.confidence) // 按可信度降序
}

/**
 * 生成审查报告摘要
 */
export function generateReviewSummary(result: ComprehensiveReviewResult): string {
  const { statistics, finalScore, recommendations } = result

  let summary = `文书综合评分：${finalScore}分\n\n`

  summary += `问题统计：\n`
  summary += `- 严重问题：${statistics.criticalIssues}个\n`
  summary += `- 警告问题：${statistics.warningIssues}个\n`
  summary += `- 提示信息：${statistics.infoIssues}个\n\n`

  summary += `合规状态：${
    recommendations.complianceStatus === 'compliant' ? '符合要求' :
    recommendations.complianceStatus === 'needs_improvement' ? '需要改进' : '不符合要求'
  }\n`

  summary += `风险等级：${
    recommendations.riskLevel === 'low' ? '低风险' :
    recommendations.riskLevel === 'medium' ? '中等风险' :
    recommendations.riskLevel === 'high' ? '高风险' : '严重风险'
  }\n\n`

  summary += `主要建议：\n`
  recommendations.actions.forEach((action, index) => {
    summary += `${index + 1}. ${action}\n`
  })

  return summary
}
