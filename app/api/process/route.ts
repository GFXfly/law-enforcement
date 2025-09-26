import { type NextRequest, NextResponse } from "next/server"
import { parseDocumentContent, analyzeDocumentStructure, validateDocumentType } from "@/lib/document-processor"
import { performAIAnalysis, type AIAnalysisOptions } from "@/lib/ai-analysis-service"
import { getAllReviewRules } from "@/lib/administrative-penalty-rules"
import { storeProcessingResult, generateJobId } from "@/lib/storage"

const AI_SEMANTIC_REVIEW_DISABLED = process.env.AI_SEMANTIC_REVIEW_DISABLED === "true"

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
    const hasAiApiKey = Boolean(process.env.DEEPSEEK_API_KEY)
    const aiProcessingEnabled = !AI_SEMANTIC_REVIEW_DISABLED && options.enableAI !== false && hasAiApiKey

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

        const aiAnalysisResults = aiProcessingEnabled
          ? await performAIAnalysis(documentContent, documentStructure, aiAnalysisOptions)
          : {
              issues: [],
              summary: {
                totalIssues: 0,
                languageScore: 90,
                logicScore: 90,
                overallAssessment: 'AI语义审查暂未启用',
              },
              processingDetails: {
                modelUsed: 'disabled',
                processingTime: 0,
              },
            }

        if (!aiProcessingEnabled) {
          console.log('[Processing] AI语义审查已暂时停用，本次仅执行规则审查')
        }

        // Step 7: Generate final results
        const allIssues = [...ruleCheckResults.issues, ...aiAnalysisResults.issues]
        const criticalIssues = allIssues.filter(issue => issue.type === "critical")
        const warningIssues = allIssues.filter(issue => issue.type === "warning")
        const infoIssues = allIssues.filter(issue => issue.type === "info")

        // Calculate score based on issues（更平衡的扣分系数）
        let score = 100
        score -= criticalIssues.length * 10  // critical: -10 points
        score -= warningIssues.length * 5    // warning: -5 points
        score -= infoIssues.length * 1       // info: -1 point
        score = Math.max(score, 40) // 保持底分以反映基础完成度

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
            aiAnalyzed: aiProcessingEnabled,
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

    const aiEnabled = aiProcessingEnabled

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

// Administrative penalty decision book rule checks based on official standard
async function performRuleChecks(content: any, structure: any, _options: ProcessingOptions) {
  const rules = getAllReviewRules()
  const issues: any[] = []
  const summaries: Array<{
    id: string
    summary: string
    category?: string
    status: '符合' | '存在问题'
    details?: string
    suggestions?: string[]
  }> = []

  rules.forEach((rule) => {
    const result = rule.checkFunction(content, structure)

    // 新格式：result 是 ReviewIssue[] 数组
    const hasIssues = Array.isArray(result) && result.length > 0
    if (hasIssues) {
      const details = result.map(issue => issue.problem).join('；')
      const suggestions = result.map(issue => issue.solution)

      summaries.push({
        id: rule.id,
        summary: rule.name,
        category: rule.category,
        status: '存在问题',
        details,
        suggestions,
      })

      result.forEach((reviewIssue, issueIndex) => {
        issues.push({
          id: `${rule.id}_${issueIndex + 1}`,
          type: reviewIssue.severity,
          category: rule.category,
          title: rule.name,
          description: reviewIssue.problem,
          location: reviewIssue.location,
          suggestion: reviewIssue.solution,
        })
      })
    }
  })

  return { issues, summaries }
}
