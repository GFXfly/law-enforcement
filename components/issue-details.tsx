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
          <div className="space-y-3">
            {issues.map((issue) => (
              <div key={issue.id} className="space-y-2 p-3 rounded-lg bg-muted/30">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-medium text-foreground">{issue.title}</h4>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {issue.category}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{issue.description}</p>
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">文件:</span> {issue.fileName}
                </div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">位置:</span> {issue.location}
                </div>
                {issue.suggestion && (
                  <div className="flex items-start gap-2 mt-2 p-2 rounded bg-secondary/20">
                    <Lightbulb className="h-3 w-3 text-secondary mt-0.5 shrink-0" />
                    <p className="text-xs text-secondary-foreground">{issue.suggestion}</p>
                  </div>
                )}
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
