"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Calendar, Clock, Eye, Trash2 } from "lucide-react"

// 客户端组件,禁用静态生成和缓存
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

interface ReviewRecord {
  id: string
  fileName: string
  timestamp: string
  results: {
    totalIssues: number
    criticalIssues: number
    warningIssues: number
    infoIssues: number
    processingTime: string
  }
  userIP: string
}

export default function RecordsPage() {
  const [records, setRecords] = useState<ReviewRecord[]>([])

  useEffect(() => {
    const savedRecords = JSON.parse(localStorage.getItem("reviewRecords") || "[]")
    setRecords(savedRecords)
  }, [])

  const deleteRecord = (id: string) => {
    const updatedRecords = records.filter((record) => record.id !== id)
    setRecords(updatedRecords)
    localStorage.setItem("reviewRecords", JSON.stringify(updatedRecords))
  }

  const viewRecord = (id: string) => {
    window.location.href = `/results?id=${encodeURIComponent(id)}`
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusColor = (criticalIssues: number, warningIssues: number) => {
    if (criticalIssues > 0) return "destructive"
    if (warningIssues > 2) return "secondary"
    return "default"
  }

  const getStatusText = (criticalIssues: number, warningIssues: number) => {
    if (criticalIssues > 0) return "严重问题"
    if (warningIssues > 2) return "需要注意"
    return "基本合规"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">审查记录</h1>
            <p className="text-muted-foreground">查看所有行政处罚决定书的审查历史记录</p>
          </div>

          {records.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">暂无审查记录</h3>
                <p className="text-muted-foreground mb-4">开始上传文档进行审查后，记录将显示在这里</p>
                <Button onClick={() => (window.location.href = "/")}>开始审查</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {records.map((record) => (
                <Card key={record.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-medium">{record.fileName}</CardTitle>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDate(record.timestamp)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {record.results.processingTime}
                            </div>
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant={getStatusColor(record.results.criticalIssues, record.results.warningIssues)}
                        className="ml-2"
                      >
                        {getStatusText(record.results.criticalIssues, record.results.warningIssues)}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-destructive"></div>
                          <span>严重: {record.results.criticalIssues}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                          <span>警告: {record.results.warningIssues}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          <span>提示: {record.results.infoIssues}</span>
                        </div>
                        <div className="text-muted-foreground">总计: {record.results.totalIssues} 个问题</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => viewRecord(record.id)} className="h-8">
                          <Eye className="h-4 w-4 mr-1" />
                          查看
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteRecord(record.id)}
                          className="h-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          删除
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
