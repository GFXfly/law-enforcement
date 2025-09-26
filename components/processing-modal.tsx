"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, AlertTriangle, FileText, Brain, Shield, Loader2, Search, RefreshCw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ErrorType, type AppError, parseError } from "@/lib/error-types"

interface ProcessingStep {
  id: string
  name: string
  description: string
  status: "pending" | "processing" | "completed" | "error"
  icon: React.ReactNode
}

interface ProcessingModalProps {
  isOpen: boolean
  onClose: () => void
  files: Array<{ name: string; id: string; file?: File }>
  onComplete: (results: any) => void
  onDocumentTypeError: () => void
  onNetworkError?: (error: AppError) => void
  onServerError?: (error: AppError) => void
  onProcessingError?: (error: AppError) => void
}

export function ProcessingModal({
  isOpen,
  onClose,
  files,
  onComplete,
  onDocumentTypeError,
  onNetworkError,
  onServerError,
  onProcessingError
}: ProcessingModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [overallProgress, setOverallProgress] = useState(0)
  const [error, setError] = useState<AppError | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const [steps, setSteps] = useState<ProcessingStep[]>([
    {
      id: "document-type",
      name: "文档类型检查",
      description: "正在验证是否为行政处罚决定书...",
      status: "pending",
      icon: <Search className="h-4 w-4" />,
    },
    {
      id: "extraction",
      name: "内容提取",
      description: "正在提取文档内容和结构...",
      status: "pending",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      id: "rule-check",
      name: "规则检查",
      description: "正在进行格式和规范性检查...",
      status: "pending",
      icon: <Shield className="h-4 w-4" />,
    },
    {
      id: "ai-analysis",
      name: "AI语义分析",
      description: "正在进行智能语义和逻辑检查...",
      status: "pending",
      icon: <Brain className="h-4 w-4" />,
    },
    {
      id: "report",
      name: "生成报告",
      description: "正在生成检查报告...",
      status: "pending",
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
  ])

  // 重置状态当弹窗打开时
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0)
      setOverallProgress(0)
      setError(null)
      setIsRetrying(false)
      setSteps((prev) => prev.map((step) => ({ ...step, status: "pending" })))

      // 清理之前的 AbortController
      abortControllerRef.current?.abort()
      abortControllerRef.current = new AbortController()
    }
  }, [isOpen])

  // 组件卸载时清理 AbortController
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // 处理文档的主要逻辑
  const processDocuments = async (): Promise<void> => {
    const controller = abortControllerRef.current
    if (!controller || controller.signal.aborted) return

    try {
      setError(null)
      console.log("[Processing] Starting document processing with real API")

      // Prepare files for API call
      const filesToProcess = files.filter(f => f.file).map(f => f.file!)

      if (filesToProcess.length === 0) {
        throw new Error("没有找到可处理的文件")
      }

      // Step 1: Document Type Check（优先校验文书类型）
      setCurrentStep(0)
      setSteps((prev) => prev.map((step, index) => (index === 0 ? { ...step, status: "processing" } : step)))

      for (const file of filesToProcess) {
        const validationData = new FormData()
        validationData.append("file", file)

        const validationResponse = await fetch("/api/process/validate", {
          method: "POST",
          body: validationData,
          signal: controller.signal,
        })

        if (!validationResponse.ok) {
          const validationResult = await validationResponse.json()

          if (validationResult?.error === "document_type_error") {
            throw {
              type: "document_type_error",
              message: validationResult.message || "文档不符合行政处罚决定书格式",
              details: validationResult.details,
            }
          }

          throw {
            type: "validation_error",
            message: validationResult.message || "文档校验失败",
            details: validationResult,
          }
        }
      }

      if (controller.signal.aborted) return

      // Step 2: Content Extraction
      await new Promise(resolve => setTimeout(resolve, 700))
      setSteps((prev) => prev.map((step, index) => (index === 0 ? { ...step, status: "completed" } : step)))
      setOverallProgress(20)

      setCurrentStep(1)
      setSteps((prev) => prev.map((step, index) => (index === 1 ? { ...step, status: "processing" } : step)))

      await new Promise(resolve => setTimeout(resolve, 600))
      setSteps((prev) => prev.map((step, index) => (index === 1 ? { ...step, status: "completed" } : step)))
      setOverallProgress(40)

      if (controller.signal.aborted) return

      // Step 3: Call the real API
      setCurrentStep(2)
      setSteps((prev) => prev.map((step, index) => (index === 2 ? { ...step, status: "processing" } : step)))

      const formData = new FormData()
      filesToProcess.forEach(file => {
        formData.append('files', file)
      })
      formData.append('options', JSON.stringify({
        enableAI: true,
        enableRuleCheck: true,
        strictMode: false
      }))

      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      })

      const result = await response.json()

      if (!response.ok) {
        if (result.error === "document_type_error") {
          throw { type: 'document_type_error', message: result.message || "文档类型不符合要求" }
        }
        if (response.status >= 500) {
          throw { type: 'server_error', message: result.message || "服务器内部错误" }
        }
        throw { type: 'unknown_error', message: result.message || result.error || '处理失败' }
      }

      if (controller.signal.aborted) return

      // Continue processing steps...
      setSteps((prev) => prev.map((step, index) => (index === 2 ? { ...step, status: "completed" } : step)))
      setOverallProgress(65)

      // AI Analysis
      setCurrentStep(3)
      setSteps((prev) => prev.map((step, index) => (index === 3 ? { ...step, status: "processing" } : step)))

      await new Promise(resolve => setTimeout(resolve, 1500))
      setSteps((prev) => prev.map((step, index) => (index === 3 ? { ...step, status: "completed" } : step)))
      setOverallProgress(85)

      if (controller.signal.aborted) return

      // Generate Report
      setCurrentStep(4)
      setSteps((prev) => prev.map((step, index) => (index === 4 ? { ...step, status: "processing" } : step)))

      await new Promise(resolve => setTimeout(resolve, 900))
      setSteps((prev) => prev.map((step, index) => (index === 4 ? { ...step, status: "completed" } : step)))
      setOverallProgress(100)

      if (controller.signal.aborted) return

      // Store results
      const reviewRecord = {
        id: result.jobId || Date.now().toString(),
        fileName: files[0]?.name || "未知文件",
        timestamp: new Date().toISOString(),
        results: result.results,
        userIP: "127.0.0.1",
      }

      const existingRecords = JSON.parse(localStorage.getItem("reviewRecords") || "[]")
      existingRecords.unshift(reviewRecord)
      localStorage.setItem("reviewRecords", JSON.stringify(existingRecords))

      setTimeout(() => {
        onComplete(result.results)
        onClose()
      }, 1000)

    } catch (err: any) {
      if (abortControllerRef.current?.signal.aborted) return

      console.error("[Processing] Error during processing:", err)

      const appError = parseError(err)
      setError(appError)

      // Mark current step as error
      setSteps((prev) => prev.map((step, index) => (index === currentStep ? { ...step, status: "error" } : step)))

      // Handle different error types
      setTimeout(() => {
        switch (appError.type) {
          case ErrorType.DOCUMENT_TYPE_ERROR:
            onDocumentTypeError()
            onClose()
            break
          case ErrorType.NETWORK_ERROR:
            onNetworkError?.(appError)
            break
          case ErrorType.SERVER_ERROR:
            onServerError?.(appError)
            break
          default:
            onProcessingError?.(appError)
            break
        }
      }, 700)
    } finally {
      setIsRetrying(false)
    }
  }

  // 重试处理
  const handleRetry = () => {
    setIsRetrying(true)
    setError(null)
    setCurrentStep(0)
    setOverallProgress(0)
    setSteps((prev) => prev.map((step) => ({ ...step, status: "pending" })))
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()
    processDocuments()
  }

  // 主处理逻辑
  useEffect(() => {
    if (!isOpen || error) return

    processDocuments()
  }, [isOpen, error])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md glass-effect">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {error ? (
              <>
                <AlertTriangle className="h-5 w-5 text-destructive" />
                处理失败
              </>
            ) : (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                正在审查文档
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">审查进度</span>
              <span className="font-medium">{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </div>

          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                    step.status === "completed"
                      ? "border-green-200 bg-green-100 text-green-600"
                      : step.status === "processing"
                        ? "border-primary bg-primary text-primary-foreground"
                        : step.status === "error"
                          ? "border-destructive bg-destructive text-destructive-foreground"
                          : "border-muted bg-background text-muted-foreground"
                  }`}
                >
                  {step.status === "processing" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : step.status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : step.status === "error" ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    step.icon
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{step.name}</span>
                    <Badge
                      variant={
                        step.status === "completed"
                          ? "secondary"
                          : step.status === "processing"
                            ? "default"
                            : step.status === "error"
                              ? "destructive"
                              : "outline"
                      }
                      className="text-xs"
                    >
                      {step.status === "completed"
                        ? "完成"
                        : step.status === "processing"
                          ? "进行中"
                          : step.status === "error"
                            ? "错误"
                            : "等待中"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-muted/50 p-3">
            <div className="text-xs text-muted-foreground mb-2">正在审查文档:</div>
            <div className="space-y-1">
              {files.slice(0, 2).map((file) => (
                <div key={file.id} className="text-xs text-foreground truncate flex items-center gap-2">
                  <FileText className="h-3 w-3 text-primary flex-shrink-0" />
                  {file.name}
                </div>
              ))}
            </div>
          </div>

          {/* 错误显示和重试按钮 */}
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">
                    {error.type === ErrorType.DOCUMENT_TYPE_ERROR && '文档类型错误'}
                    {error.type === ErrorType.NETWORK_ERROR && '网络连接失败'}
                    {error.type === ErrorType.SERVER_ERROR && '服务器错误'}
                    {error.type === ErrorType.VALIDATION_ERROR && '参数验证错误'}
                    {error.type === ErrorType.PROCESSING_ERROR && '处理错误'}
                    {error.type === ErrorType.UNKNOWN_ERROR && '未知错误'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{error.message}</p>

                <div className="flex gap-2 mt-3">
                  {error.retryable && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRetry}
                      disabled={isRetrying}
                      className="flex items-center gap-1"
                    >
                      {isRetrying ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      重试
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={onClose}>
                    <X className="h-3 w-3 mr-1" />
                    关闭
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
