import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { ResultsOverview } from "@/components/results-overview"
import { FileResultsList } from "@/components/file-results-list"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

// 客户端组件,禁用静态生成和缓存
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Default fallback data if no real results are found
const defaultResults = {
  id: "penalty_check_20250924_001",
  timestamp: "2025-09-24 20:45:32",
  totalFiles: 1, // Single file since system only supports one administrative penalty decision document
  totalIssues: 8,
  criticalIssues: 2,
  warningIssues: 4,
  infoIssues: 2,
  processingTime: "2.3秒",
  overallScore: 82,
  aiEnabled: false,
  files: [
    {
      id: "file_1",
      name: "行政处罚决定书.pdf",
      size: "2.4 MB",
      status: "warning",
      score: 82,
      issues: [
        {
          id: "issue_1",
          type: "critical",
          category: "法律条款",
          title: "缺少处罚依据的具体法条",
          description: "根据《行政处罚法》第四十四条规定，处罚决定书应当载明处罚的事实、理由及依据",
          location: "第2页，处罚决定部分",
          suggestion: "请补充具体的法律条款，如《XX法》第XX条第X款",
        },
        {
          id: "issue_2",
          type: "critical",
          category: "程序要件",
          title: "未载明听证权利告知",
          description: "对于较大数额罚款，应当告知当事人有要求举行听证的权利",
          location: "第3页，权利告知部分",
          suggestion: "请补充听证权利告知内容，包括听证申请期限和方式",
        },
        {
          id: "issue_3",
          type: "warning",
          category: "格式规范",
          title: "当事人基本信息不完整",
          description: "当事人身份证号码格式不规范，建议使用标准格式",
          location: "第1页，当事人信息栏",
          suggestion: "身份证号码应为18位，建议核实并规范格式",
        },
        {
          id: "issue_4",
          type: "warning",
          category: "履行与权利告知",
          title: "行政复议期限表述不准确",
          description: "行政复议申请期限表述为'30日内'，应明确为'60日内'",
          location: "第3页，救济途径告知",
          suggestion: "根据《行政复议法》规定，应为收到决定书之日起60日内",
        },
        {
          id: "issue_5",
          type: "warning",
          category: "执行要求",
          title: "缺少罚款缴纳具体方式",
          description: "未明确说明罚款缴纳的具体方式和账户信息",
          location: "第3页，执行部分",
          suggestion: "请补充缴款账户、缴款方式等具体信息",
        },
        {
          id: "issue_6",
          type: "warning",
          category: "印章规范",
          title: "执法机关印章位置偏移",
          description: "执法机关印章与签名日期位置不够规范",
          location: "第3页，落款部分",
          suggestion: "建议调整印章位置，确保与机关名称和日期对齐",
        },
        {
          id: "issue_7",
          type: "info",
          category: "格式优化",
          title: "建议统一日期格式",
          description: "文档中日期格式不统一，有'2025年9月24日'和'2025-09-24'两种格式",
          location: "全文",
          suggestion: "建议统一使用'YYYY年MM月DD日'格式",
        },
        {
          id: "issue_8",
          type: "info",
          category: "文字规范",
          title: "个别用词可以更加规范",
          description: "部分表述可以更加严谨和规范",
          location: "第2页，违法事实认定",
          suggestion: "建议使用更加规范的法律用语",
        },
      ],
    },
  ],
}

function ResultsContent() {
  const [results, setResults] = useState(defaultResults)
  const [isLoading, setIsLoading] = useState(true)
  const searchParams = useSearchParams()
  const selectedRecordId = searchParams?.get("id") || null

  useEffect(() => {
    const loadResults = async () => {
      setIsLoading(true)
      try {
        const reviewRecords: Array<any> = JSON.parse(localStorage.getItem("reviewRecords") || "[]")
        let targetResults: any = null
        let targetMetadata: any = null

        if (selectedRecordId) {
          const targetRecord = reviewRecords.find((record: any) => record.id === selectedRecordId)
          if (targetRecord?.results) {
            targetResults = targetRecord.results
            targetMetadata = {
              fileName: targetRecord.fileName,
              timestamp: targetRecord.timestamp,
              userIP: targetRecord.userIP,
            }
          } else {
            try {
              const response = await fetch(`/api/results/${selectedRecordId}`)
              if (response.ok) {
                const data = await response.json()
                targetResults = data.results
                targetMetadata = data.metadata

                const hydratedRecord = {
                  id: data.resultId || selectedRecordId,
                  fileName: data.metadata?.fileName || targetRecord?.fileName || '未知文件',
                  timestamp: data.metadata?.timestamp || new Date().toISOString(),
                  results: data.results,
                  userIP: data.metadata?.userIP || targetRecord?.userIP || 'unknown',
                }

                const mergedRecords = [
                  hydratedRecord,
                  ...reviewRecords.filter((record: any) => record.id !== hydratedRecord.id),
                ]
                localStorage.setItem("reviewRecords", JSON.stringify(mergedRecords))
              }
            } catch (fetchError) {
              console.warn("[Results] Failed to fetch stored result for", selectedRecordId, fetchError)
            }
          }
        }

        if (!targetResults && reviewRecords.length > 0) {
          targetResults = reviewRecords[0].results
        }

        if (!targetResults) {
          setResults(defaultResults)
          return
        }

        const aiEnabled =
          targetResults.aiEnabled ??
          (Array.isArray(targetResults.files)
            ? targetResults.files.some((file: any) => file?.processingDetails?.aiAnalyzed)
            : false)

        setResults({
          ...defaultResults,
          ...targetResults,
          aiEnabled,
        })

        if (targetMetadata) {
          console.log("[Results] Viewing record", selectedRecordId, targetMetadata)
        }
      } catch (error) {
        console.error("[Results] Error loading selected results:", error)
        setResults(defaultResults)
      } finally {
        setIsLoading(false)
      }
    }

    loadResults()
  }, [selectedRecordId])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">正在加载审查结果...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">审查结果</h1>
            <p className="text-muted-foreground mt-1">
              共处理 {results.totalFiles} 个文件，发现 {results.totalIssues} 个问题
            </p>
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            导出报告
          </Button>
        </div>

        <ResultsOverview results={results} />
        <FileResultsList results={results} />
      </main>
    </div>
  )
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">正在加载审查结果...</p>
            </div>
          </div>
        </main>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  )
}