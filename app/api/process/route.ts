import { type NextRequest, NextResponse } from "next/server"
import { parseDocumentContent, analyzeDocumentStructure, validateDocumentType } from "@/lib/document-processor"
import { performAIAnalysis, type AIAnalysisOptions } from "@/lib/ai-analysis-service"
import { storeProcessingResult, generateJobId } from "@/lib/storage"

interface ProcessingOptions {
  enableAI?: boolean
  enableRuleCheck?: boolean
  strictMode?: boolean
  aiOptions?: {
    enableSemanticCheck?: boolean
    enableLanguageCheck?: boolean
    enableLogicCheck?: boolean
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]
    const optionsString = formData.get("options") as string
    const options: ProcessingOptions = optionsString ? JSON.parse(optionsString) : {}

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "没有指定要处理的文件" }, { status: 400 })
    }

    // Create processing job
    const jobId = generateJobId()
    console.log(`[Processing] Starting job ${jobId} with ${files.length} files`)

    // Process each file
    const processedFiles = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      console.log(`[Processing] Processing file: ${file.name}`)

      try {
        // Step 1: Document type validation
        console.log(`[Processing] Step 1: Validating document type for ${file.name}`)

        // Step 2: Extract document content
        console.log(`[Processing] Step 2: Extracting content from ${file.name}`)
        const documentContent = await parseDocumentContent(file)

        // Step 3: Validate document type
        const typeValidation = validateDocumentType(documentContent)

        if (!typeValidation.isValid) {
          return NextResponse.json({
            error: "document_type_error",
            message: "文档不符合行政处罚决定书格式",
            details: {
              confidence: typeValidation.confidence,
              reasons: typeValidation.reasons
            }
          }, { status: 400 })
        }

        // Step 4: Analyze document structure
        console.log(`[Processing] Step 3: Analyzing document structure for ${file.name}`)
        const documentStructure = analyzeDocumentStructure(documentContent)

        // Step 5: Rule-based checks (basic implementation)
        console.log(`[Processing] Step 4: Running rule checks for ${file.name}`)
        const ruleCheckResults = await performRuleChecks(documentContent, documentStructure, options)

        // Step 6: AI analysis using professional service
        console.log(`[Processing] Step 5: AI analysis for ${file.name}`)
        const aiAnalysisOptions: AIAnalysisOptions = {
          enableSemanticCheck: options.aiOptions?.enableSemanticCheck !== false,
          enableLanguageCheck: options.aiOptions?.enableLanguageCheck !== false,
          enableLogicCheck: options.aiOptions?.enableLogicCheck !== false,
          strictMode: options.strictMode || false
        }
        const aiAnalysisResults = options.enableAI !== false
          ? await performAIAnalysis(documentContent, documentStructure, aiAnalysisOptions)
          : { issues: [], summary: { totalIssues: 0, languageScore: 85, logicScore: 85, overallAssessment: 'AI分析已禁用' } }

        // Step 7: Generate final results
        const allIssues = [...ruleCheckResults.issues, ...aiAnalysisResults.issues]
        const criticalIssues = allIssues.filter(issue => issue.type === "critical")
        const warningIssues = allIssues.filter(issue => issue.type === "warning")
        const infoIssues = allIssues.filter(issue => issue.type === "info")

        // Calculate score based on issues
        let score = 100
        score -= criticalIssues.length * 15  // Each critical issue: -15 points
        score -= warningIssues.length * 8    // Each warning: -8 points
        score -= infoIssues.length * 3       // Each info: -3 points
        score = Math.max(score, 0)

        processedFiles.push({
          id: `file_${i + 1}`,
          name: file.name,
          size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
          status: score >= 85 ? "success" : score >= 70 ? "warning" : "error",
          score,
          wordCount: documentContent.wordCount,
          documentType: documentStructure.title,
          issues: allIssues,
          processingDetails: {
            typeValidation,
            contentExtracted: true,
            structureAnalyzed: true,
            rulesChecked: options.enableRuleCheck !== false,
            aiAnalyzed: options.enableAI !== false,
            ruleSummaries: ruleCheckResults.summaries,
          }
        })

        console.log(`[Processing] Completed processing ${file.name}: ${allIssues.length} issues found, score: ${score}`)

      } catch (error) {
        console.error(`[Processing] Error processing file ${file.name}:`, error)
        processedFiles.push({
          id: `file_${i + 1}`,
          name: file.name,
          size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
          status: "error",
          score: 0,
          issues: [{
            id: `error_${i + 1}`,
            type: "critical" as const,
            category: "处理错误",
            title: "文档处理失败",
            description: `处理文档时发生错误: ${error instanceof Error ? error.message : '未知错误'}`,
            location: "整个文档",
            suggestion: "请检查文档格式是否正确，或重新上传文档"
          }],
          error: error instanceof Error ? error.message : "处理失败"
        })
      }
    }

    // Calculate overall statistics
    const totalIssues = processedFiles.reduce((sum, file) => sum + file.issues.length, 0)
    const criticalIssues = processedFiles.reduce((sum, file) =>
      sum + file.issues.filter(issue => issue.type === "critical").length, 0)
    const warningIssues = processedFiles.reduce((sum, file) =>
      sum + file.issues.filter(issue => issue.type === "warning").length, 0)
    const infoIssues = processedFiles.reduce((sum, file) =>
      sum + file.issues.filter(issue => issue.type === "info").length, 0)
    const averageScore = processedFiles.length > 0 ?
      Math.round(processedFiles.reduce((sum, file) => sum + file.score, 0) / processedFiles.length) : 0

    const aiEnabled = options.enableAI !== false

    const results = {
      id: jobId,
      timestamp: new Date().toLocaleString('zh-CN'),
      totalFiles: files.length,
      totalIssues,
      criticalIssues,
      warningIssues,
      infoIssues,
      processingTime: "实时处理",
      overallScore: averageScore,
      aiEnabled,
      files: processedFiles
    }

    // Store results using persistent storage
    await storeProcessingResult(jobId, files[0].name, results,
      request.headers.get('x-forwarded-for') || 'unknown')

    console.log(`[Processing] Job ${jobId} completed successfully`)

    return NextResponse.json({
      success: true,
      jobId,
      results
    })
  } catch (error) {
    console.error("Processing error:", error)
    return NextResponse.json({
      error: "处理请求失败",
      message: error instanceof Error ? error.message : "未知错误"
    }, { status: 500 })
  }
}

// Administrative penalty decision sheet rule checks based on review standard
async function performRuleChecks(content: any, structure: any, _options: ProcessingOptions) {
  interface RuleDefinition {
    id: string
    summary: string
    severity: 'critical' | 'warning'
    category: string
    title: string
    description: string
    suggestion: string
    check: (ctx: {
      text: string
      paragraphs: string[]
      structure: any
    }) => { passed: boolean; details?: string }
  }

  const context = {
    text: content.text || '',
    paragraphs: content.paragraphs || [],
    structure: structure || {},
  }

  const tailText = context.text.slice(-600)
  const ruleDefinitions: RuleDefinition[] = [
    {
      id: 'title_format',
      summary: '标题格式',
      severity: 'critical',
      category: '标题规范',
      title: '标题格式不符合标准',
      description: '标题应由执法机关名称和“行政处罚决定书”组成上下两行。',
      suggestion: '请确认文书首页前两行分别为执法机关全称及“行政处罚决定书”。',
      check: ({ structure }) => {
        const lines: string[] = structure?.titleLines || []
        const first = (lines[0] || '').trim()
        const second = (lines[1] || '').trim()
        const passed = Boolean(first && second && /行政处罚决定书/.test(second))
        return {
          passed,
          details: passed ? `${first} / ${second}` : '未检测到“机关名称 + 行政处罚决定书”的标题两行格式',
        }
      },
    },
    {
      id: 'document_number',
      summary: '文号',
      severity: 'critical',
      category: '基本要素',
      title: '缺少文号信息',
      description: '行政处罚决定书应载明统一文号。',
      suggestion: '请补充如“临市监罚〔2025〕1号”或“临市监罚字〔2025〕1号”等规范文号。',
      check: ({ text }) => {
        const pattern = /[\u4e00-\u9fa5]{2,}〔\d{4}〕\d+号|第\d+号/g
        const match = text.match(pattern)
        return {
          passed: Boolean(match && match.length > 0),
          details: match ? match[0] : '未找到符合格式的文号（如“〔2025〕1号”）',
        }
      },
    },
    {
      id: 'party_information',
      summary: '当事人信息',
      severity: 'critical',
      category: '基本要素',
      title: '缺少当事人信息',
      description: '应包括当事人姓名/名称、住所、法定代表人或负责人等。',
      suggestion: '请补充当事人基本信息，包括姓名/名称、住所、法定代表人或负责人。',
      check: ({ text }) => {
        const hasParty = /当事人/.test(text)
        const hasAddress = /(住所|地址|所在地)/.test(text)
        const hasRepresentative = /(法定代表人|负责人|代理人)/.test(text)
        const passed = hasParty && (hasAddress || hasRepresentative)
        return {
          passed,
          details: passed ? '检测到当事人及相关信息' : '未完整检测到当事人姓名/住所/法定代表人等信息',
        }
      },
    },
    {
      id: 'facts_section',
      summary: '违法事实',
      severity: 'critical',
      category: '事实认定',
      title: '缺少违法事实陈述',
      description: '应记载违法事实、时间、地点、情节等。',
      suggestion: '请详细写明违法事实、时间地点、关键情节。',
      check: ({ text }) => {
        const passed = /(经查|查明|违法事实|调查)/.test(text)
        return {
          passed,
          details: passed ? '检测到违法事实段落' : '未检测到含“经查”或“违法事实”等字样的事实陈述',
        }
      },
    },
    {
      id: 'evidence_section',
      summary: '证据情况',
      severity: 'warning',
      category: '事实认定',
      title: '证据说明不足',
      description: '应列明认定事实所依据的证据及证据形式。',
      suggestion: '请补充证据清单和证据来源，如“以上事实有……证据证明”。',
      check: ({ text }) => {
        const passed = /(证据|证明材料|以上事实有)/.test(text)
        return {
          passed,
          details: passed ? '检测到证据描述' : '未检测到“证据”或“证明”等字样的证据说明',
        }
      },
    },
    {
      id: 'legal_basis',
      summary: '法律依据',
      severity: 'critical',
      category: '法律依据',
      title: '法律依据引用不足',
      description: '处罚决定应引用具体法律、法规、规章条款。',
      suggestion: '请补充“根据/依照《××法》第×条……”等准确条款引用。',
      check: ({ text }) => {
        const passed = /(依据|依照|根据).+《[^》]+》+第?[\d一二三四五六七八九十条款项之]*条/.test(text)
        return {
          passed,
          details: passed ? '检测到法律条款引用' : '未检测到“根据/依照《…》第…条”等完整法律依据',
        }
      },
    },
    {
      id: 'penalty_decision',
      summary: '处罚决定',
      severity: 'critical',
      category: '处罚决定',
      title: '处罚决定表述欠缺',
      description: '应明确载明处罚种类、幅度及履行方式。',
      suggestion: '请写明具体处罚内容，如罚款金额、没收物品、责令改正等。',
      check: ({ text }) => {
        const passed = /(决定|给予|罚款|没收|责令|处罚如下)/.test(text)
        return {
          passed,
          details: passed ? '检测到处罚决定段落' : '未检测到明确的处罚决定表述',
        }
      },
    },
    {
      id: 'execution_instructions',
      summary: '执行与履行说明',
      severity: 'warning',
      category: '执行要求',
      title: '未明确履行或执行要求',
      description: '应说明履行期限、方式以及逾期不履行的法律后果。',
      suggestion: '请补充罚款缴纳、整改期限、逾期后果等执行须知。',
      check: ({ text }) => {
        const passed = /(自收到本决定书之日起|逾期不缴|整改|履行|限于)/.test(text)
        return {
          passed,
          details: passed ? '检测到执行与履行相关提示' : '未检测到履行期限或逾期后果提示',
        }
      },
    },
    {
      id: 'relief_rights',
      summary: '救济途径告知',
      severity: 'critical',
      category: '程序要件',
      title: '缺少行政复议/诉讼权利告知',
      description: '应同时告知行政复议和行政诉讼途径、期限。',
      suggestion: '请补充行政复议、行政诉讼的提起机关、期限及方式。',
      check: ({ text }) => {
        const hasReview = /行政复议/.test(text)
        const hasLitigation = /行政诉讼/.test(text)
        return {
          passed: hasReview && hasLitigation,
          details: hasReview && hasLitigation ? '已检测到复议与诉讼权利告知' : '未同时检测到行政复议与行政诉讼告知',
        }
      },
    },
    {
      id: 'fine_payment',
      summary: '罚款缴纳信息',
      severity: 'warning',
      category: '执行要求',
      title: '罚款缴纳信息不完整',
      description: '罚款决定应说明缴纳期限、银行账号或缴纳方式。',
      suggestion: '请补充罚款缴纳地点、银行及账号或非现金支付方式。',
      check: ({ text }) => {
        const passed = /(银行|账号|缴至|缴纳|财政专户|收款人)/.test(text)
        return {
          passed,
          details: passed ? '检测到罚款缴纳信息' : '未检测到罚款缴纳相关信息',
        }
      },
    },
    {
      id: 'agency_and_seal',
      summary: '落款机关及印章',
      severity: 'critical',
      category: '落款信息',
      title: '缺少落款机关或印章信息',
      description: '文尾应载明处罚机关全称并加盖印章或注明。',
      suggestion: '请在文尾列出执法机关全称并加盖印章或注明印章情况。',
      check: ({ structure, text }) => {
        const lines: string[] = structure?.titleLines || []
        const firstLine = (lines[0] || '').trim()
        const tail = text.slice(-400)
        const passed = Boolean(firstLine && tail.includes(firstLine))
        return {
          passed,
          details: passed ? '文尾包含执法机关名称' : '文尾未检测到与标题一致的执法机关名称',
        }
      },
    },
    {
      id: 'date_at_end',
      summary: '日期',
      severity: 'warning',
      category: '落款信息',
      title: '文尾日期缺失或格式异常',
      description: '文尾应注明作出决定的具体日期。',
      suggestion: '请补充“YYYY年MM月DD日”格式的日期。',
      check: () => {
        const dateMatch = tailText.match(/\d{4}年\d{1,2}月\d{1,2}日/)
        return {
          passed: Boolean(dateMatch),
          details: dateMatch ? `检测到日期：${dateMatch[0]}` : '文尾未检测到标准日期格式',
        }
      },
    },
    {
      id: 'enforcer_signature',
      summary: '执法人员签名',
      severity: 'warning',
      category: '程序要件',
      title: '执法人员签名或证号缺失',
      description: '应标注执法人员姓名及执法证号。',
      suggestion: '请补充执法人员签名和执法证号信息。',
      check: ({ text }) => {
        const passed = /(执法人员|执法证|执法编号)/.test(text)
        return {
          passed,
          details: passed ? '检测到执法人员或证号信息' : '未检测到执法人员签名或执法证号',
        }
      },
    },
  ]

  const issues: any[] = []
  const summaries: Array<{ id: string; summary: string; status: '符合' | '存在问题'; details?: string }> = []

  ruleDefinitions.forEach((rule) => {
    const result = rule.check(context)
    summaries.push({
      id: rule.id,
      summary: rule.summary,
      status: result.passed ? '符合' : '存在问题',
      details: result.details,
    })

    if (!result.passed) {
      issues.push({
        id: rule.id,
        type: rule.severity,
        category: rule.category,
        title: rule.title,
        description: `${rule.description}${result.details ? `（${result.details}）` : ''}`,
        location: '全文',
        suggestion: rule.suggestion,
      })
    }
  })

  return { issues, summaries }
}
