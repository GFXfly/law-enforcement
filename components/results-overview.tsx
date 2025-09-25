import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { FileText, AlertTriangle, Clock, TrendingUp, Brain } from "lucide-react"

interface ResultsOverviewProps {
  results: {
    totalFiles: number
    totalIssues: number
    criticalIssues: number
    warningIssues: number
    infoIssues: number
    processingTime: string
    overallScore: number
    aiEnabled?: boolean
  }
}

export function ResultsOverview({ results }: ResultsOverviewProps) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-secondary"
    if (score >= 70) return "text-yellow-600"
    return "text-destructive"
  }

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "优秀"
    if (score >= 80) return "良好"
    if (score >= 70) return "合格"
    return "需改进"
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">处理文件</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{results.totalFiles}</div>
          <p className="text-xs text-muted-foreground">耗时 {results.processingTime}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">总体评分</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getScoreColor(results.overallScore)}`}>{results.overallScore}</div>
          <div className="flex items-center gap-2 mt-1">
            <Progress value={results.overallScore} className="flex-1 h-2" />
            <Badge variant="outline" className="text-xs">
              {getScoreLabel(results.overallScore)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">发现问题</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{results.totalIssues}</div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-destructive" />
              <span className="text-xs text-muted-foreground">{results.criticalIssues}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              <span className="text-xs text-muted-foreground">{results.warningIssues}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-xs text-muted-foreground">{results.infoIssues}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">处理状态</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold text-emerald-600">完成</div>
          <p className="text-xs text-foreground/80">所有文件已检查完毕</p>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Brain className="h-3 w-3" />
            <span>AI语义审查</span>
            <Badge variant={results.aiEnabled ? "secondary" : "outline"} className="text-[11px]">
              {results.aiEnabled ? "已启用" : "未启用"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
