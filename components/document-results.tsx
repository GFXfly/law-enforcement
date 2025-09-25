"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, AlertCircle, Info, CheckCircle2, FileText, ArrowLeft, Clock, User } from "lucide-react"
import Link from "next/link"

interface DocumentIssue {
  id: string
  type: "error" | "warning" | "info"
  title: string
  description: string
  suggestion: string
  location: {
    page: number
    paragraph: number
    line?: number
  }
  category: "format" | "content" | "structure" | "legal"
}

interface DocumentResult {
  fileName: string
  fileSize: string
  processedAt: string
  processingTime: string
  totalIssues: number
  issues: DocumentIssue[]
}

// Mock data for demonstration
const mockResult: DocumentResult = {
  fileName: "关于建设全国统一大市场工作的自查报告.docx",
  fileSize: "0.02 MB",
  processedAt: "2025-09-24 21:35:42",
  processingTime: "2.3秒",
  totalIssues: 8,
  issues: [
    {
      id: "1",
      type: "error",
      title: "标题格式不规范",
      description: "文档标题使用了非标准字体，应使用方正小标宋简体",
      suggestion: "将标题字体修改为方正小标宋简体，字号为二号",
      location: { page: 1, paragraph: 1 },
      category: "format",
    },
    {
      id: "2",
      type: "warning",
      title: "段落间距不一致",
      description: "第2段与第3段之间的间距为18磅，与标准要求的12磅不符",
      suggestion: "统一段落间距为12磅，确保文档格式一致性",
      location: { page: 1, paragraph: 2 },
      category: "format",
    },
    {
      id: "3",
      type: "error",
      title: "缺少必要的法律条文引用",
      description: "在描述市场准入制度时，未引用相关法律法规条文",
      suggestion: "补充《市场准入负面清单管理办法》第三条相关内容",
      location: { page: 2, paragraph: 5 },
      category: "legal",
    },
    {
      id: "4",
      type: "info",
      title: "建议优化表述",
      description: '"进一步加强"表述过于模糊，建议使用更具体的表述',
      suggestion: '将"进一步加强"修改为具体的措施描述，如"建立健全"或"完善"',
      location: { page: 3, paragraph: 2 },
      category: "content",
    },
    {
      id: "5",
      type: "warning",
      title: "数据引用缺少来源",
      description: "第4页提到的统计数据未标注数据来源和统计时间",
      suggestion: "为所有统计数据添加来源说明和统计时间范围",
      location: { page: 4, paragraph: 3 },
      category: "content",
    },
    {
      id: "6",
      type: "error",
      title: "结构层次不清晰",
      description: "第三部分缺少小标题，内容层次不够清晰",
      suggestion: '为第三部分添加适当的小标题，如"3.1 现状分析""3.2 存在问题"等',
      location: { page: 5, paragraph: 1 },
      category: "structure",
    },
    {
      id: "7",
      type: "info",
      title: "用词建议",
      description: '多处使用"基本"一词，表述不够肯定',
      suggestion: '根据实际情况，将"基本完成"等表述修改为"已完成"或"正在推进"',
      location: { page: 6, paragraph: 4 },
      category: "content",
    },
    {
      id: "8",
      type: "warning",
      title: "附件格式问题",
      description: "附件表格边框线条粗细不一致，不符合公文格式要求",
      suggestion: "统一表格边框为0.5磅黑色实线，确保格式规范",
      location: { page: 7, paragraph: 1 },
      category: "format",
    },
  ],
}

export function DocumentResults() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  const getIssueIcon = (type: DocumentIssue["type"]) => {
    switch (type) {
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  const getIssueColor = (type: DocumentIssue["type"]) => {
    switch (type) {
      case "error":
        return "destructive"
      case "warning":
        return "secondary"
      case "info":
        return "outline"
      default:
        return "outline"
    }
  }

  const getCategoryName = (category: string) => {
    switch (category) {
      case "format":
        return "格式规范"
      case "content":
        return "内容质量"
      case "structure":
        return "结构层次"
      case "legal":
        return "法律条文"
      default:
        return "全部"
    }
  }

  const filteredIssues =
    selectedCategory === "all"
      ? mockResult.issues
      : mockResult.issues.filter((issue) => issue.category === selectedCategory)

  const issueStats = {
    error: mockResult.issues.filter((i) => i.type === "error").length,
    warning: mockResult.issues.filter((i) => i.type === "warning").length,
    info: mockResult.issues.filter((i) => i.type === "info").length,
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-[1200px] px-6 py-8">
        {/* Back button and title */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4 -ml-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回检查工具
            </Button>
          </Link>
          <h1 className="text-3xl font-semibold text-foreground mb-2">审查结果</h1>
          <p className="text-muted-foreground">文档审查已完成，以下是详细的检查结果和修改建议</p>
        </div>

        {/* Document info card */}
        <Card className="mb-8 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">{mockResult.fileName}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {mockResult.fileSize}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    处理时间: {mockResult.processingTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {mockResult.processedAt}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-foreground mb-1">{mockResult.totalIssues}</div>
              <div className="text-sm text-muted-foreground">发现问题</div>
            </div>
          </div>
        </Card>

        {/* Statistics cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-lg font-semibold text-foreground">审查完成</div>
                <div className="text-sm text-muted-foreground">状态正常</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="text-lg font-semibold text-foreground">{issueStats.error}</div>
                <div className="text-sm text-muted-foreground">严重问题</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-lg font-semibold text-foreground">{issueStats.warning}</div>
                <div className="text-sm text-muted-foreground">警告问题</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Info className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-lg font-semibold text-foreground">{issueStats.info}</div>
                <div className="text-sm text-muted-foreground">建议优化</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={selectedCategory === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("all")}
          >
            全部 ({mockResult.issues.length})
          </Button>
          {["format", "content", "structure", "legal"].map((category) => {
            const count = mockResult.issues.filter((issue) => issue.category === category).length
            return (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {getCategoryName(category)} ({count})
              </Button>
            )
          })}
        </div>

        {/* Issues list */}
        <div className="space-y-4">
          {filteredIssues.map((issue, index) => (
            <Card key={issue.id} className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  {getIssueIcon(issue.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-lg font-semibold text-foreground mb-1">{issue.title}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant={getIssueColor(issue.type)}>
                          {issue.type === "error" ? "严重" : issue.type === "warning" ? "警告" : "建议"}
                        </Badge>
                        <Badge variant="outline">{getCategoryName(issue.category)}</Badge>
                        <span className="text-sm text-muted-foreground">
                          第{issue.location.page}页 第{issue.location.paragraph}段
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h5 className="text-sm font-medium text-foreground mb-1">问题描述:</h5>
                      <p className="text-sm text-muted-foreground leading-relaxed">{issue.description}</p>
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-foreground mb-1">修改建议:</h5>
                      <p className="text-sm text-primary leading-relaxed">{issue.suggestion}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredIssues.length === 0 && (
          <Card className="p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">该分类下暂无问题</h3>
            <p className="text-muted-foreground">选择其他分类查看相关问题</p>
          </Card>
        )}
      </div>
    </div>
  )
}
