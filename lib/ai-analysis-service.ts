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

  const basePrompt = `你是一位资深的行政执法文书审查专家，同时也是语言文字及逻辑推理的顶级校对顾问。请运用DeepSeek v3.1的强大语义理解能力，对以下行政处罚决定书进行全方位、深层次的专业审查。

## 审查任务与要求

请在深刻理解文书整体含义、前后文逻辑关系、隐含语义的前提下，运用你的专业知识和推理能力，对文书进行全面剖析。重点关注：

### 深度语义理解要求
1. **整体文书逻辑脉络**：理解违法事实→证据→法律适用→处罚决定的完整逻辑链条
2. **语义一致性检查**：识别文书中任何前后矛盾、表述不一致的问题
3. **隐含信息挖掘**：发现文字表面未明确但逻辑上存在的问题
4. **专业术语精准性**：确保法律条文引用、专业概念使用的准确性
5. **因果关系合理性**：验证违法行为与处罚结果之间的逻辑关联

### 全面审查维度
- 必须严格依据《中华人民共和国行政处罚法》第四十四条及《行政处罚决定书审查标准》
- 运用你的专业判断，识别可能导致败诉的法律风险点
- 关注执法实务中的常见问题和疏漏
- 提供具有可操作性的专业改进建议

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

### 二、当事人信息完整性审查（分类细化）
**请根据当事人类型进行针对性审查：**

#### A. 企业法人当事人信息审查
- **企业名称**：是否与营业执照、登记证书完全一致
- **统一社会信用代码**：是否为18位标准格式，与实际登记信息匹配
- **住所（注册地址）**：是否详细完整，包含省市区街道门牌号
- **法定代表人信息**：
  * 姓名是否完整准确
  * 身份证号码是否为18位标准格式
  * 是否与工商登记信息一致
- **联系方式**：电话号码格式是否正确，地址是否可送达
- **经营范围**：是否与违法行为相关（如适用）

#### B. 个体工商户当事人信息审查
- **字号名称**：如"杭州临安老毕包子铺"等完整字号
- **统一社会信用代码（注册号）**：
  * 新版：18位统一社会信用代码（如92330185MA2KEJ8838）
  * 旧版：13位注册号
- **经营场所**：详细的经营地址，确保可送达
- **经营者（负责人）信息**：
  * 经营者姓名（如"叶胜男"）
  * 身份证号码：18位标准格式（如330124199206242720）
- **联系方式**：
  * 联系电话：手机或固话格式正确
  * 联系地址：与经营场所可以不同，但须详细完整
- **主体资格证照**：营业执照等证照名称

#### C. 个人当事人信息审查
- **个人姓名**：姓名完整，避免简称或昵称
- **身份证件信息**：
  * 身份证号码：18位标准格式
  * 其他有效证件：如军官证、护照等及其号码
- **住址信息**：
  * 户籍地址或经常居住地
  * 详细到门牌号，确保可送达
- **联系方式**：
  * 联系电话：手机号码格式验证
  * 其他联系方式：微信、邮箱等（如有）
- **年龄/出生日期**：是否与身份证号码匹配
- **职业信息**：如涉及职业相关违法行为需注明

#### D. 通用审查要点
- **信息一致性**：同一当事人在全文中的信息是否前后一致
- **格式规范性**：证件号码、电话号码、地址格式是否符合标准
- **可送达性**：地址和联系方式是否真实有效，便于执法送达
- **关联性验证**：当事人信息与违法行为是否存在合理关联
- **证据支撑**：当事人身份是否有相应证据材料支撑

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

### 九、文本语义深度校验（AI强化分析）
**运用AI深度理解能力，请重点分析：**
- **语义连贯性**：文书各部分之间的逻辑连接是否自然流畅
- **专业术语准确性**：法律条文、专有名词、地名、机构名称的精确性
- **数据一致性**：序号、条款、金额、日期等在全文中的一致性
- **逻辑推理验证**：从违法事实到处罚决定的推理过程是否严密
- **隐性矛盾识别**：发现文字表面合理但深层逻辑存在的矛盾
- **语言表达质量**：用词是否准确、句式是否规范、表述是否明确
- **风险点预警**：识别可能在行政复议或诉讼中被质疑的薄弱环节

#### 🔍 不当表述与异常内容检测（重点强化）
**请特别关注并严格识别以下异常内容：**
- **口语化表述**：检测明显的口语化、网络用语、方言表达
  * 例如："好的吗"、"再见了哦"、"这个还是不行的"
  * 例如："嗯"、"呀"、"呢"、"啊"等语气词
  * 例如："搞定"、"弄好"、"搞清楚"等非正式表达
- **情感性语言**：识别带有明显主观情感色彩的表述
  * 例如："太好了"、"真是的"、"算了吧"等
- **不相关内容**：发现与行政处罚决定书主题无关的内容
  * 例如：个人闲聊、生活琐事、无关话题
  * 例如：商业广告、宣传内容、推销信息
- **语体风格不符**：识别与公文写作规范不符的表达方式
  * 例如：过于随意、过于亲昵、过于严厉的表述
  * 例如：缺乏客观性、带有明显倾向性的语言
- **逻辑突兀性**：发现在文书逻辑流程中突然出现的异常表述
  * 例如：在严肃的法律条文中穿插日常对话
  * 例如：在事实陈述中出现主观评价或感慨

#### ⚠️ 异常检测要求
对于发现的任何不当表述，必须：
1. **精确定位**：明确指出异常内容的具体位置和完整表述
2. **性质判断**：判断是口语化、情感化、无关内容或其他类型
3. **严重程度**：评估对文书专业性和权威性的影响程度
4. **整改建议**：提供具体的规范化表述建议

### 十、结构完整性与内容匹配度检查（重点补强）
**请特别关注以下结构性问题，这是常见但容易被忽视的缺陷：**

#### A. 标题-内容不匹配问题
- **空白标签识别**：检查是否存在有标题/标签但无实际内容的情况
  * 例如："其他联系方式："后面无内容 ← 重点检查此类问题
  * 例如："备注："、"说明："等标签后无具体内容
  * 例如："附件："、"相关材料："等后无列表或说明
  * 例如："联系电话："、"传真："等后面是空白
- **不完整条目**：识别明显未完成的句子或段落
- **冗余标题**：发现可能多余或不必要的标题和标签

#### B. 内容完整性验证
- **必要信息缺失**：检查是否所有标题都有对应的实际内容
- **逻辑结构完整**：验证文书的信息结构是否完整合理
- **格式一致性**：同类信息的表述格式是否统一

#### C. 针对性改进建议
对发现的结构性问题，必须提供明确的解决方案：
- **补充建议**：具体应该补充什么内容
- **删除建议**：哪些多余的标题应该删除
- **重组建议**：如何优化信息结构

### 十一、AI深度分析要求
请运用强大的语言模型能力，进行以下深度分析：
1. **全文语义图谱构建**：理解文书的整体语义结构和关键信息点
2. **关键要素关联分析**：分析当事人、违法行为、证据、法条、处罚之间的关联性
3. **结构完整性扫描**：逐行检查标题与内容的匹配度，识别所有空白或不完整的条目
4. **潜在风险评估**：基于执法实务经验，预测可能的法律风险
5. **改进优化建议**：提供具体、可操作的专业改进方案

## 输出格式要求
请严格按照以下JSON格式输出分析结果：

{
  "issues": [
    {
      "type": "critical|warning|info",
      "category": "首部信息|企业当事人信息|个体户当事人信息|个人当事人信息|当事人信息通用|违法事实与证据|处罚依据与决定|履行与权利告知|尾部信息|格式与语言规范|逻辑一致性|结构完整性|不当表述",
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

## 评分标准与专业要求

### 严格评分标准
- **critical（严重问题）**：缺失法定要素、程序违法、引用法条错误、重大逻辑矛盾（每项扣15-25分）
- **warning（警告问题）**：格式不规范、表述不完善、救济告知不全、语义不清（每项扣8-15分）
- **info（优化建议）**：用词建议、格式优化、表述改进、语言规范（每项扣3-8分）

### AI深度分析专业要求
1. **精准定位**：每个问题必须精确定位到具体的文字段落或条款
2. **深度分析**：不仅指出问题，更要分析问题的根本原因和潜在影响
3. **专业判断**：基于法律条文和执法实践，给出专业性判断
4. **风险预警**：重点识别可能导致败诉或程序瑕疵的高风险点
5. **可操作建议**：提供具体、详细、可直接采纳的改进方案
6. **语义理解**：充分运用语言模型的优势，深度理解文本语义和逻辑关系

### 分析深度要求
- **表层问题**：明显的格式、用词、引用错误
- **中层问题**：逻辑关系、语义一致性、专业规范性
- **深层问题**：潜在法律风险、程序完整性、实务操作可行性

请运用DeepSeek v3.1的强大分析能力，以最高的专业标准完成这份执法文书的全面审查，确保分析结果具有重要的实务指导价值。`

  // 根据选项调整提示词
  let enhancedPrompt = basePrompt

  if (options.strictMode) {
    enhancedPrompt += `\n\n## 🔍 严格审查模式
当前启用严格审查模式，请运用DeepSeek v3.1的精准分析能力：
- 对所有细微问题都要识别和标注，包括轻微的格式偏差
- 深度挖掘潜在的法律风险和程序瑕疵
- 以最高标准评估文书的专业性和规范性
- 重点关注可能被行政相对人质疑的薄弱环节`
  }

  if (options.enableSemanticCheck) {
    enhancedPrompt += `\n\n## 🧠 深度语义分析模式
请充分发挥AI语义理解优势，深入分析：
- **逻辑链条完整性**：从违法事实到处罚决定的推理过程是否严密
- **语义一致性**：全文中相同概念、数据、表述的一致性
- **隐含信息识别**：挖掘文字背后的逻辑关系和潜在问题
- **专业概念精准性**：法律术语、专有名词的准确使用
- **因果关系合理性**：违法行为与处罚措施之间的逻辑关联
- **表述歧义性**：识别可能引起多种理解的模糊表述`
  }

  if (options.enableLanguageCheck) {
    enhancedPrompt += `\n\n## ✍️ 语言文字专业校验
请运用语言专家的视角，全面检查：
- **法律文书用语规范性**：是否符合执法文书的标准表达方式
- **语言风格一致性**：避免口语化、非正式表述
- **句式结构优化**：确保句子结构清晰、逻辑明确
- **标点符号精确性**：标点使用是否符合公文写作规范
- **用词精准性**：是否使用最恰当、最专业的词汇
- **表达简洁性**：是否存在冗余、重复或不必要的表述`
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
          content: `你是一位资深的行政执法文书审查专家，拥有20年以上的执法实务经验，专门负责行政处罚决定书的专业审查工作。你深度掌握《中华人民共和国行政处罚法》及相关法规，熟悉执法文书的规范要求，具备敏锐的法律逻辑思维和语言文字功底。

你的核心职责是：
1. 对行政处罚决定书进行全面、深入、精准的专业审查
2. 识别文书中的法律风险点、程序瑕疵、表述问题
3. 提供具有实务指导价值的专业改进建议
4. 确保文书符合法定要求，降低行政复议、行政诉讼败诉风险

请以最高的专业标准和严谨态度完成审查任务。`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.05, // 进一步降低随机性，确保专业性和一致性
      max_tokens: 4000, // 增加输出长度，确保深度分析
      top_p: 0.85
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
 * AI复合验证功能 - 过滤规则检测的误判
 */
export async function performRuleValidation(
  content: DocumentContent,
  ruleIssues: AIAnalysisIssue[]
): Promise<AIAnalysisIssue[]> {
  if (ruleIssues.length === 0) {
    return ruleIssues
  }

  console.log('[AI Validation] 开始AI复合验证，检查规则误判...')
  console.log('[AI Validation] 待验证问题数量:', ruleIssues.length)

  try {
    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      console.warn('[AI Validation] DeepSeek API key not found, skipping validation')
      return ruleIssues
    }

    const validatedIssues: AIAnalysisIssue[] = []

    // 分批验证，避免单次请求过长
    const batchSize = 3
    for (let i = 0; i < ruleIssues.length; i += batchSize) {
      const batch = ruleIssues.slice(i, i + batchSize)
      const batchResults = await validateIssueBatch(content, batch, apiKey)
      validatedIssues.push(...batchResults)
    }

    console.log('[AI Validation] 验证完成，原问题数:', ruleIssues.length, '过滤后:', validatedIssues.length)
    return validatedIssues

  } catch (error) {
    console.error('[AI Validation] Error during validation:', error)
    console.log('[AI Validation] 验证失败，保留所有原始问题')
    return ruleIssues
  }
}

/**
 * 验证单批问题
 */
async function validateIssueBatch(
  content: DocumentContent,
  issues: AIAnalysisIssue[],
  apiKey: string
): Promise<AIAnalysisIssue[]> {
  const validationPrompt = buildValidationPrompt(content, issues)

  const requestBody = {
    model: 'deepseek-v3.1',
    messages: [
      {
        role: 'system',
        content: `你是一位资深的行政执法文书审查专家，专门负责验证规则检测结果的准确性。你的任务是判断规则检测发现的问题是否为误判。

你具备以下能力：
1. 深度理解执法文书的语义和逻辑结构
2. 识别不同的表述方式和格式变体
3. 区分实质问题和格式偏好
4. 准确判断规则检测的误报

请基于文档实际内容，客观判断每个问题是否属于误判。`
      },
      {
        role: 'user',
        content: validationPrompt
      }
    ],
    temperature: 0.1,
    max_tokens: 2000,
    top_p: 0.9
  }

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }

  const result = await response.json()
  const aiResponse = result.choices?.[0]?.message?.content

  if (!aiResponse) {
    throw new Error('Empty response from AI')
  }

  return parseValidationResponse(aiResponse, issues)
}

/**
 * 构建验证提示词
 */
function buildValidationPrompt(content: DocumentContent, issues: AIAnalysisIssue[]): string {
  return `## 文档验证任务

请对以下规则检测发现的问题进行验证，判断哪些是误判（实际文档中已经满足要求但格式不同）。

### 文档内容
${content.text}

### 待验证的问题列表
${issues.map((issue, index) => `
**问题${index + 1}:**
- 标题: ${issue.title}
- 描述: ${issue.description}
- 位置: ${issue.location}
- 建议: ${issue.suggestion}
`).join('\n')}

### 验证标准
请基于以下原则进行判断：

1. **实质重于形式**: 如果文档实际包含相关内容，只是表述方式或格式与规则期望略有不同，应判为误判
2. **语义等价性**: 不同的表述方式如果语义相同，应视为满足要求
3. **格式灵活性**: 序号格式（如"1、2、3"vs"证据一、证据二"）、标点符号等细微差异不应影响实质判断
4. **内容完整性**: 重点关注内容是否实际存在，而非具体格式

### 特别关注的验证重点
- **证据列举**: 文档中是否实际存在逐项证据，不论是"1、2、3"还是"证据一、二、三"格式
- **信息完整性**: 当事人信息、法条引用等是否实际存在
- **逻辑关系**: 违法事实与处罚决定之间是否有合理关联

### 输出格式
请严格按照以下JSON格式输出验证结果：

{
  "validatedIssues": [
    {
      "issueIndex": 0,
      "isValidIssue": true,
      "reason": "确实存在问题的具体原因"
    },
    {
      "issueIndex": 1,
      "isValidIssue": false,
      "reason": "误判原因：文档中实际已包含相关内容，只是格式不同"
    }
  ]
}

请仔细分析文档内容，准确判断每个问题的有效性。`
}

/**
 * 解析验证响应
 */
function parseValidationResponse(aiResponse: string, originalIssues: AIAnalysisIssue[]): AIAnalysisIssue[] {
  try {
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn('[AI Validation] No JSON found in response, keeping all issues')
      return originalIssues
    }

    const parsed = JSON.parse(jsonMatch[0])
    const validatedIssues = parsed.validatedIssues || []

    const filteredIssues: AIAnalysisIssue[] = []

    validatedIssues.forEach((validation: any) => {
      const index = validation.issueIndex
      const isValid = validation.isValidIssue
      const reason = validation.reason || ''

      if (index >= 0 && index < originalIssues.length) {
        if (isValid) {
          // 保留确实存在问题的项目
          filteredIssues.push(originalIssues[index])
          console.log(`[AI Validation] 保留问题 ${index + 1}: ${originalIssues[index].title}`)
        } else {
          // 记录被过滤的误判项目
          console.log(`[AI Validation] 过滤误判 ${index + 1}: ${originalIssues[index].title} - ${reason}`)
        }
      }
    })

    return filteredIssues

  } catch (error) {
    console.error('[AI Validation] Error parsing validation response:', error)
    console.log('[AI Validation] 解析失败，保留所有原始问题')
    return originalIssues
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

