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
    if (score >= 90) return "text-primary"
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
      <Card className="clean-card transition-all duration-200 hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">处理文件</CardTitle>
          <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <FileText className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{results.totalFiles}</div>
          <p className="text-xs text-muted-foreground mt-1">耗时 {results.processingTime}</p>
        </CardContent>
      </Card>

      <Card className="clean-card transition-all duration-200 hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">总体评分</CardTitle>
          <div className="h-8 w-8 rounded-lg bg-green-50 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-green-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getScoreColor(results.overallScore)}`}>{results.overallScore}</div>
          <div className="flex items-center gap-2 mt-1">
            <Progress value={results.overallScore} className="flex-1 h-1.5 bg-secondary" />
            <span className="text-xs font-medium text-muted-foreground">
              {getScoreLabel(results.overallScore)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="clean-card transition-all duration-200 hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">发现问题</CardTitle>
          <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{results.totalIssues}</div>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-destructive" />
              <span className="text-xs text-muted-foreground">{results.criticalIssues}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              <span className="text-xs text-muted-foreground">{results.warningIssues}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-xs text-muted-foreground">{results.infoIssues}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="clean-card transition-all duration-200 hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">处理状态</CardTitle>
          <div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center">
            <Clock className="h-4 w-4 text-purple-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600">完成</div>
          <div className="mt-1 flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary/50 border border-border/50">
              <Brain className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-medium text-muted-foreground">
                AI语义审查 {results.aiEnabled ? "已启用" : "未启用"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
