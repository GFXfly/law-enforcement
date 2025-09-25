import { DocumentContent, DocumentStructure } from './document-processor'
import { getAllReviewRules, getRulesByCategory } from './administrative-penalty-rules'

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
  const allRules = getAllReviewRules()
  const mandatoryRules = getRulesByCategory('必备要素')
  const proceduralRules = getRulesByCategory('程序规范').concat(getRulesByCategory('救济途径'))
  const formatRules = getRulesByCategory('格式要求')
  const languageRules = getRulesByCategory('语言规范')

  const basePrompt = `你是一位资深的行政执法文书审查专家，同时也是语言文字及逻辑推理的顶级校对顾问。请在深刻理解文书整体含义的前提下，综合法律审查与高阶语义校验能力，对以下行政处罚决定书进行逐条核查。必须严格依据《中华人民共和国行政处罚法》第四十四条及《行政处罚决定书审查标准》，逐项列出发现的问题。

## 文档基本信息
- 文档标题：${structure.title}
- 文档字数：${content.wordCount}字
- 段落数量：${content.paragraphs.length}段
- 章节结构：${structure.sections.length}个章节

## 文档内容
${content.text}

## 专业审查标准

### 一、必备要素完整性审查（依据行政处罚法第44条）
请重点检查以下法定必备要素：

1. **当事人信息**：
   - 当事人的姓名或者名称是否完整准确
   - 地址信息是否详细完整
   - 身份证明（身份证号/统一社会信用代码）是否提供

2. **违法事实认定**：
   - 违反法律、法规、规章的事实是否清晰具体
   - 是否明确违法行为的时间、地点、方式
   - 证据材料是否充分，证据链是否完整

3. **法律依据引用**：
   - 违法依据引用是否准确完整
   - 处罚依据是否明确具体
   - 法条引用格式是否规范
   - 自由裁量权行使是否有充分说明

4. **处罚决定内容**：
   - 处罚种类是否明确
   - 履行方式和期限是否具体
   - 缴纳方式是否详细说明

5. **救济途径告知**：
   - 行政复议权利告知是否规范
   - 行政诉讼权利告知是否完整
   - 复议期限（60日）和诉讼期限（6个月）是否明确
   - 复议机关是否明确指明

6. **执法机关信息**：
   - 作出决定的行政机关名称是否完整
   - 作出决定的日期是否明确
   - 是否标注盖章位置

### 二、程序合规性审查
- 检查是否存在程序违法风险
- 评估处罚程序的合法性
- 确认程序权利的保障情况

### 三、格式规范性审查
- 文书标题规范性
- 案件编号格式
- 文书结构完整性
- 标点符号使用规范

### 四、语言与文本准确性审查
- 是否使用规范的法律用语，避免口语化、套话或模糊表述
- 排查错别字、同音/近形字误用、数字/单位书写不规范
- 检查标点符号是否正确使用（尤其是冒号、顿号、书名号、括号）
- 名称、时间、金额、地址等关键信息前后是否保持一致
- 是否存在重复、冗余或明显翻译腔/自动生成痕迹的句子
- 判断每句话是否准确传达应有含义，避免歧义

### 五、逻辑一致性与上下文关联审查
- 事实认定与法律适用是否存在跳跃或矛盾
- 处罚决定与前述事实、法律依据是否一一对应
- 当事人信息、违规金额、时间节点等是否在全文保持一致
- 检查是否引用了不存在或前文未出现的事实/证据
- 判断是否存在上下文断裂、因果倒置、概念混用等现象

### 六、文本语义深度校验（高级要求）
- 检查容易混淆的专有名词、地名、机构名称是否写错
- 识别可能的错别字（例如常用字误写、简繁体混用、字符缺失）
- 检查序号、条款、金额、日期等是否与上下文、标题、证据表述一致
- 判断引用法律条款与实际事实是否匹配，避免误援引或条款缺失
- 分析是否存在不合理推断、逻辑闭合缺陷或潜在自相矛盾表述
- 如果发现严重不合理的推理、数字明显错误或事实矛盾，请特别说明原因

## 输出格式要求
请严格按照以下JSON格式输出分析结果：

{
  "issues": [
    {
      "type": "critical|warning|info",
      "category": "必备要素|程序规范|格式要求|语言规范|救济途径",
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
function performFallbackAnalysis(content: DocumentContent, structure: DocumentStructure): AIAnalysisResult {
  const issues: AIAnalysisIssue[] = []
  const allRules = getAllReviewRules()

  // 使用专业审查规则进行分析
  allRules.forEach((rule, index) => {
    try {
      const result = rule.checkFunction(content, structure)

      if (!result.passed && result.issues.length > 0) {
        // 为每个发现的问题创建一个AIAnalysisIssue
        result.issues.forEach((issueText, issueIndex) => {
          const suggestion = result.suggestions[issueIndex] || result.suggestions[0] || '建议按照相关法规要求进行修改'

          issues.push({
            id: `rule_${rule.id}_${issueIndex}`,
            type: rule.severity,
            category: rule.category,
            title: rule.name,
            description: `${issueText}。${rule.description}`,
            location: '相关段落',
            suggestion: suggestion,
            confidence: 88 // 基于规则的分析具有较高可信度
          })
        })
      }
    } catch (error) {
      console.error(`规则 ${rule.id} 执行失败:`, error)
      // 忽略单个规则错误，继续执行其他规则
    }
  })

  // 计算评分（基于问题数量和严重性）
  const criticalIssues = issues.filter(issue => issue.type === 'critical').length
  const warningIssues = issues.filter(issue => issue.type === 'warning').length
  const infoIssues = issues.filter(issue => issue.type === 'info').length

  let languageScore = 100
  let logicScore = 100

  // 语言相关扣分
  const languageIssues = issues.filter(issue => issue.category === '语言规范' || issue.category === '格式要求')
  languageScore -= languageIssues.filter(i => i.type === 'critical').length * 20
  languageScore -= languageIssues.filter(i => i.type === 'warning').length * 10
  languageScore -= languageIssues.filter(i => i.type === 'info').length * 5

  // 逻辑相关扣分
  const logicIssues = issues.filter(issue => issue.category === '必备要素' || issue.category === '程序规范' || issue.category === '救济途径')
  logicScore -= logicIssues.filter(i => i.type === 'critical').length * 20
  logicScore -= logicIssues.filter(i => i.type === 'warning').length * 10
  logicScore -= logicIssues.filter(i => i.type === 'info').length * 5

  languageScore = Math.max(0, languageScore)
  logicScore = Math.max(0, logicScore)

  // 生成整体评估
  let overallAssessment = ''
  if (criticalIssues === 0 && warningIssues <= 2 && infoIssues <= 5) {
    overallAssessment = '文书质量良好，符合基本规范要求，建议关注细节完善'
  } else if (criticalIssues === 0 && warningIssues <= 5) {
    overallAssessment = '文书质量一般，存在一些规范性问题，需要按优先级改进'
  } else if (criticalIssues <= 2) {
    overallAssessment = '文书存在重要问题，需要重点关注法定要素和程序合规性'
  } else {
    overallAssessment = '文书质量较差，存在多项严重问题，建议全面审查和修订'
  }

  return {
    issues,
    summary: {
      totalIssues: issues.length,
      languageScore,
      logicScore,
      overallAssessment: overallAssessment + '（基于专业规则分析）'
    },
    processingDetails: {
      modelUsed: 'professional-rules-engine',
      processingTime: 100
    }
  }
}
