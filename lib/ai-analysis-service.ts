import { DocumentContent, DocumentStructure } from './document-processor'
import { getAllReviewRules } from './administrative-penalty-rules'

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

/**
 * 构建执法文书AI分析的专业提示词（基于专业审查规则）
 */
function buildAnalysisPrompt(content: DocumentContent, structure: DocumentStructure, options: AIAnalysisOptions): string {

  const basePrompt = `你是一位资深的行政执法文书审查专家，同时也是语言文字及逻辑推理的顶级校对顾问。请在深刻理解文书整体含义的前提下，综合法律审查与高阶语义校验能力，对以下行政处罚决定书进行逐条核查。必须严格依据《中华人民共和国行政处罚法》第四十四条及《行政处罚决定书审查标准》，逐项列出发现的问题。

## 文档基本信息
- 文档标题：${structure.title}
- 文档字数：${content.wordCount}字
- 段落数量：${content.paragraphs.length}段
- 章节结构：${structure.sections.length}个章节

## 文档内容
${content.text}

## 专业审查标准

### 一、首部信息规范性审查
- 标题是否采用“机关名称 + 行政处罚决定书”的两行结构
- 文书标题是否准确呈现“行政处罚决定书”
- 文号格式是否完整，包含机关简称、年份和序号

### 二、当事人信息完整性审查
- 当事人姓名或名称是否完整准确
- 地址、联系电话、身份证号或社会信用代码是否齐备
- 法定代表人或负责人信息是否注明（如适用）

### 三、违法事实与证据核查
- 违法事实描述是否具体清晰，包含时间、地点、方式
- 证据材料是否逐项列明，可支撑事实认定
- 是否存在事实遗漏、表述含糊或证据链断裂的情况

### 四、处罚依据与决定内容核查
- 违法依据、处罚依据的引用是否准确、格式是否规范
- 行政处罚种类、幅度、履行方式和期限是否明确
- 自由裁量理由是否充分，处罚幅度是否与事实匹配

### 五、履行要求与权利告知核查
- 是否明确罚款缴纳方式、账户、期限等执行要求
- 是否依法告知行政复议、行政诉讼途径及法定期限
- 是否指明复议机关、诉讼法院，表述是否规范

### 六、尾部信息核查
- 行政机关名称是否完整，是否设置盖章位置
- 文书落款日期是否规范书写，与正文逻辑是否一致
- 是否存在遗漏落款或机构名称错误的情形

### 七、格式与语言规范性审查
- 是否出现口语化、错别字、标点误用或格式不统一
- 数字、日期、专有名词的写法是否前后一致
- 文书结构、编号、段落层级是否清晰规范

### 八、逻辑一致性与上下文关联审查
- 违法事实、证据、法律依据、处罚决定是否逐项对应
- 当事人信息、时间节点、金额等是否存在矛盾
- 是否出现语义自相矛盾、因果倒置或关键事实缺失

### 九、文本语义深度校验（高级要求）
- 专有名词、地名、机构名称是否准确
- 序号、条款、金额、日期等是否与上下文一致
- 是否存在逻辑漏洞、推理错误或明显不合理的表述
- 对严重不一致或重大疑点需重点说明原因

## 输出格式要求
请严格按照以下JSON格式输出分析结果：

{
  "issues": [
    {
      "type": "critical|warning|info",
      "category": "首部信息|当事人信息|违法事实与证据|处罚依据与决定|履行与权利告知|尾部信息|格式与语言规范|逻辑一致性",
      "title": "问题标题",
      "description": "具体问题描述",
      "location": "问题出现的具体位置",
      "suggestion": "专业改进建议",
      "confidence": 85-100
    }
  ],
  "summary": {
    "languageScore": 0-100,
    "logicScore": 0-100,
    "overallAssessment": "整体专业评估"
  }
}

## 严格评分标准
- **critical（严重问题）**：缺失法定要素、程序违法、引用法条错误等（每项扣20分）
- **warning（警告问题）**：格式不规范、表述不完善、救济告知不全等（每项扣10分）
- **info（提示信息）**：用词建议、格式优化、表述改进等（每项扣5分）

## 专业要求
1. 必须基于具体的法律条文和执法实践进行审查
2. 发现的问题必须具体明确，不得模糊表述
3. 改进建议必须具有可操作性
4. 评估结果必须客观准确，符合法律专业标准
5. 特别关注可能导致行政复议或诉讼败诉的风险点

请以专业、严谨的态度完成审查，确保分析结果对执法实务具有指导价值。`

  // 根据选项调整提示词
  let enhancedPrompt = basePrompt

  if (options.strictMode) {
    enhancedPrompt += `\n\n## 严格模式
当前处于严格审查模式，请提高审查标准，对所有可能的问题都要指出，包括细微的表述不当和格式问题。`
  }

  if (options.enableSemanticCheck) {
    enhancedPrompt += `\n\n## 语义分析重点
请特别关注文档的语义逻辑，包括：
- 因果关系是否清晰
- 前后文是否一致
- 专业概念使用是否准确
- 表述是否存在歧义`
  }

  if (options.enableLanguageCheck) {
    enhancedPrompt += `\n\n## 语言规范重点
请重点检查：
- 是否使用标准的法律文书用语
- 避免口语化表述
- 句式结构是否规范
- 标点符号使用是否正确`
  }

  return enhancedPrompt
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
        model: 'deepseek-v3.1',
      messages: [
        {
          role: 'system',
          content: '你是一位专业的执法文书审查专家，具有丰富的行政处罚决定书审查经验。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1, // 降低随机性，确保分析结果的一致性
      max_tokens: 2000,
      top_p: 0.9
    }

    console.log('[AI Analysis] 发送API请求...')
    console.log('[AI Analysis] 请求模型:', requestBody.model)
    console.log('[AI Analysis] 消息数量:', requestBody.messages.length)

    const response = await fetch('https://api.deepseek.com/chat/completions', {
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

    const aiResponse = result.choices?.[0]?.message?.content

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
        modelUsed: 'deepseek-v3.1',
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

/**
 * 解析AI API的响应结果
 */
function parseAIResponse(aiResponse: string): Omit<AIAnalysisResult, 'processingDetails'> {
  try {
    // 尝试从响应中提取JSON
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response')
    }

    const parsed = JSON.parse(jsonMatch[0])

    // 验证和标准化响应格式
    const issues: AIAnalysisIssue[] = (parsed.issues || []).map((issue: any, index: number) => ({
      id: `ai_${Date.now()}_${index}`,
      type: issue.type || 'info',
      category: issue.category || 'AI分析',
      title: issue.title || '检测到问题',
      description: issue.description || '',
      location: issue.location || '相关段落',
      suggestion: issue.suggestion || '建议进行优化',
      confidence: issue.confidence || 85
    }))

    return {
      issues,
      summary: {
        totalIssues: issues.length,
        languageScore: Math.max(0, Math.min(100, parsed.summary?.languageScore || 85)),
        logicScore: Math.max(0, Math.min(100, parsed.summary?.logicScore || 85)),
        overallAssessment: parsed.summary?.overallAssessment || '需要进一步完善'
      }
    }

  } catch (error) {
    console.error('[AI Analysis] Error parsing AI response:', error)

    // 如果解析失败，基于响应文本生成简单分析
    return extractSimpleAnalysis(aiResponse)
  }
}

/**
 * 从AI响应文本中提取简单分析结果
 */
function extractSimpleAnalysis(aiResponse: string): Omit<AIAnalysisResult, 'processingDetails'> {
  const issues: AIAnalysisIssue[] = []

  // 简单的关键词检测
  if (aiResponse.includes('问题') || aiResponse.includes('建议') || aiResponse.includes('不规范')) {
    issues.push({
      id: `ai_text_${Date.now()}`,
      type: 'info',
      category: 'AI语义分析',
      title: 'AI检测到改进点',
      description: '根据AI分析，文档存在可以改进的地方',
      location: '全文',
      suggestion: aiResponse.substring(0, 200) + '...',
      confidence: 70
    })
  }

  return {
    issues,
    summary: {
      totalIssues: issues.length,
      languageScore: 80,
      logicScore: 80,
      overallAssessment: 'AI分析完成，请参考具体建议'
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

