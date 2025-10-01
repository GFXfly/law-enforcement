import type { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { FileText, AlertTriangle, AlertCircle, Info, Lightbulb, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Issue {
  id: string
  type: "critical" | "warning" | "info"
  category: string
  title: string
  description: string
  location: string
  suggestion: string
}

interface RuleSummary {
  id: string
  summary: string
  category?: string
  status: "符合" | "存在问题"
  details?: string
  suggestions?: string[]
}

interface FileProcessingDetails {
  ruleSummaries?: RuleSummary[]
  modelUsed?: string
  aiAnalyzed?: boolean
  ruleValidationDiscarded?: string[]
}

interface FileResult {
  id: string
  name: string
  size: string
  status: "completed" | "warning" | "error"
  score: number
  issues: Issue[]
  processingDetails?: FileProcessingDetails
}

interface FileResultsListProps {
  files: FileResult[]
}

const ISSUE_TYPE_META: Record<"critical" | "warning" | "info", { title: string; badgeVariant: "destructive" | "outline" | "secondary"; icon: ReactNode }> = {
  critical: {
    title: "严重问题",
    badgeVariant: "destructive",
    icon: <AlertCircle className="h-4 w-4 text-destructive" />,
  },
  warning: {
    title: "警告问题",
    badgeVariant: "secondary",
    icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  },
  info: {
    title: "提示信息",
    badgeVariant: "outline",
    icon: <Info className="h-4 w-4 text-blue-500" />,
  },
} as const

export function FileResultsList({ files }: FileResultsListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "secondary"
      case "warning":
        return "default"
      case "error":
        return "destructive"
      default:
        return "outline"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "通过"
      case "warning":
        return "警告"
      case "error":
        return "错误"
      default:
        return "未知"
    }
  }

  if (!files || !Array.isArray(files)) {
    return null
  }

  return (
    <div className="space-y-6">
      {files.map((file) => {
        const groupedIssues = {
          critical: file.issues.filter((issue) => issue.type === "critical"),
          warning: file.issues.filter((issue) => issue.type === "warning"),
          info: file.issues.filter((issue) => issue.type === "info"),
        }

        const issueGroups = [
          ["critical", groupedIssues.critical],
          ["warning", groupedIssues.warning],
          ["info", groupedIssues.info],
        ] as const

        const aiModel = file.processingDetails?.modelUsed

        return (
          <Card key={file.id} className="overflow-hidden">
            <CardHeader className="bg-muted/40">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-foreground">{file.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">文件大小 {file.size}</p>
                  </div>
                </div>
                <div className="flex items-center gap-5 md:justify-end">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">综合评分</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-2xl font-semibold text-foreground">{file.score}</span>
                      <Progress value={file.score} className="w-20 h-2" />
                    </div>
                  </div>
                  <Badge variant={getStatusColor(file.status)} className="text-xs px-3 py-1">
                    {getStatusText(file.status)}
                  </Badge>
                  {aiModel && (
                    <Badge variant="outline" className="text-xs px-3 py-1">
                      AI: {aiModel}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 py-6">
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="px-3 py-1 rounded-full bg-muted/60 text-muted-foreground/90">
                  总计 {file.issues.length} 个问题
                </span>
                <span className="px-3 py-1 rounded-full bg-destructive/10 text-destructive">
                  严重 {groupedIssues.critical.length}
                </span>
                <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700">
                  警告 {groupedIssues.warning.length}
                </span>
                <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700">
                  提示 {groupedIssues.info.length}
                </span>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {issueGroups.map(([type, issues]) => {
                  if (issues.length === 0) return null

                  const meta = ISSUE_TYPE_META[type]

                  return (
                    <div key={type} className="space-y-3 rounded-xl border border-border/60 bg-background/80 p-4 shadow-sm">
                      <div className="flex items-center gap-2">
                        {meta.icon}
                        <span className="text-sm font-semibold text-foreground">
                          {meta.title}（{issues.length}）
                        </span>
                      </div>

                      <div className="space-y-3">
                        {issues.map((issue) => {
                          const getBorderClass = () => {
                            switch (type) {
                              case "critical": return "border-l-red-500"
                              case "warning": return "border-l-yellow-500"
                              case "info": return "border-l-blue-500"
                              default: return "border-l-gray-300"
                            }
                          }

                          const getBadgeClass = () => {
                            switch (type) {
                              case "critical": return "bg-red-50 text-red-700 border-red-200"
                              case "warning": return "bg-yellow-50 text-yellow-700 border-yellow-200"
                              case "info": return "bg-blue-50 text-blue-700 border-blue-200"
                              default: return "bg-gray-50 text-gray-700 border-gray-200"
                            }
                          }

                          return (
                            <div
                              key={issue.id}
                              className={`border-l-4 ${getBorderClass()} rounded-lg border border-border/60 bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow`}
                            >
                              {/* 顶部标签栏 */}
                              <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-muted/40 border-b border-border/50">
                                <Badge variant="outline" className={`text-xs ${getBadgeClass()}`}>
                                  {meta.title}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {issue.category}
                                </Badge>
                              </div>

                              {/* 内容区域 */}
                              <div className="p-3 space-y-2">
                                {/* 问题标题 */}
                                <h5 className="text-sm font-semibold text-foreground leading-relaxed">
                                  {issue.title}
                                </h5>

                                {/* 问题描述 */}
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {issue.description}
                                </p>

                                {/* 建议框 */}
                                {issue.suggestion && (
                                  <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-2">
                                    <div className="flex items-start gap-1.5">
                                      <Lightbulb className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
                                      <div className="flex-1">
                                        <p className="text-xs font-medium text-amber-900 dark:text-amber-100 mb-0.5">
                                          修改建议
                                        </p>
                                        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                                          {issue.suggestion}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* 位置信息 */}
                                <div className="text-xs text-muted-foreground pt-1.5 border-t border-border/40">
                                  📍 {issue.location}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {file.issues.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/30 py-10">
                  <CheckCircle2 className="h-8 w-8 text-secondary" />
                  <p className="text-sm text-muted-foreground">未发现问题，该文书符合规范要求</p>
                </div>
              )}

            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
