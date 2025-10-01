import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, AlertCircle, Info, Lightbulb } from "lucide-react"

interface Issue {
  id: string
  type: "critical" | "warning" | "info"
  category: string
  title: string
  description: string
  location: string
  suggestion: string
}

interface FileResult {
  id: string
  name: string
  issues: Issue[]
}

interface IssueDetailsProps {
  files: FileResult[]
}

export function IssueDetails({ files }: IssueDetailsProps) {
  const allIssues = files.flatMap((file) => file.issues.map((issue) => ({ ...issue, fileName: file.name })))

  const criticalIssues = allIssues.filter((issue) => issue.type === "critical")
  const warningIssues = allIssues.filter((issue) => issue.type === "warning")
  const infoIssues = allIssues.filter((issue) => issue.type === "info")

  const getIssueIcon = (type: string) => {
    switch (type) {
      case "critical":
        return <AlertCircle className="h-4 w-4 text-destructive" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getIssueTypeText = (type: string) => {
    switch (type) {
      case "critical":
        return "严重问题"
      case "warning":
        return "警告问题"
      case "info":
        return "提示信息"
      default:
        return "未知"
    }
  }

  const getSeverityBadgeStyle = (type: string) => {
    switch (type) {
      case "critical":
        return "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
      case "warning":
        return "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100"
      case "info":
        return "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  const getBorderColorClass = (type: string) => {
    switch (type) {
      case "critical":
        return "border-l-red-500"
      case "warning":
        return "border-l-yellow-500"
      case "info":
        return "border-l-blue-500"
      default:
        return "border-l-gray-300"
    }
  }

  const renderIssueSection = (issues: any[], title: string, type: string) => {
    if (issues.length === 0) return null

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {getIssueIcon(type)}
            {title} ({issues.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className={`border-l-4 ${getBorderColorClass(type)} rounded-lg border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow`}
              >
                {/* 顶部标签栏 */}
                <div className="flex items-center justify-between gap-2 px-4 py-2 bg-muted/30 border-b border-border">
                  <Badge variant="outline" className={`text-xs font-medium ${getSeverityBadgeStyle(type)}`}>
                    {getIssueTypeText(type)}
                  </Badge>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {issue.category}
                  </Badge>
                </div>

                {/* 内容区域 */}
                <div className="p-4 space-y-3">
                  {/* 问题标题 */}
                  <h4 className="text-sm font-semibold text-foreground leading-relaxed">
                    {issue.title}
                  </h4>

                  {/* 问题描述 */}
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {issue.description}
                  </p>

                  {/* 建议框 */}
                  {issue.suggestion && (
                    <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
                        <div className="flex-1 space-y-1">
                          <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
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
                  <div className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                    📍 {issue.location}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">问题详情</h2>

      <div className="space-y-4">
        {renderIssueSection(criticalIssues, "严重问题", "critical")}
        {renderIssueSection(warningIssues, "警告问题", "warning")}
        {renderIssueSection(infoIssues, "提示信息", "info")}

        {allIssues.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <div className="text-secondary mb-2">
                <AlertCircle className="h-8 w-8 mx-auto" />
              </div>
              <p className="text-sm text-muted-foreground">未发现任何问题</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">检查统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">严重问题:</span>
              <span className="font-medium text-destructive">{criticalIssues.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">警告问题:</span>
              <span className="font-medium text-yellow-600">{warningIssues.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">提示信息:</span>
              <span className="font-medium text-blue-600">{infoIssues.length}</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between font-medium">
              <span>总计:</span>
              <span>{allIssues.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
