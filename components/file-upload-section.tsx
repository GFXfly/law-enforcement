"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useDropzone } from "react-dropzone"
import { Upload, FileText, X, AlertCircle, CheckCircle2, Loader2, Play, FileUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ProcessingModal } from "./processing-modal"
import { DocumentTypeErrorModal } from "./document-type-error-modal"
import { cn } from "@/lib/utils"
import { useProgressBar } from "@/components/progress-bar-context"

interface UploadedFile {
  file: File
  id: string
  status: "pending" | "success" | "error"
  error?: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_TYPES = {
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
}

export function FileUploadSection() {
  const router = useRouter()
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showProcessingModal, setShowProcessingModal] = useState(false)
  const [showDocumentTypeError, setShowDocumentTypeError] = useState(false)
  const { setIsVisible: setProgressVisible } = useProgressBar()

  const closeProcessingModal = useCallback(() => {
    setShowProcessingModal(false)
    setIsProcessing(false)
    setProgressVisible(false)
  }, [setProgressVisible])

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setUploadError(null)

    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0]
      if (rejection.file.size > MAX_FILE_SIZE) {
        setUploadError(`文件大小超过10MB限制`)
      } else {
        setShowDocumentTypeError(true)
      }
      return
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      const newFile: UploadedFile = {
        file,
        id: Math.random().toString(36).substr(2, 9),
        status: "success", // Immediately set to success since upload is instant for small files
      }

      setUploadedFile(newFile)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    multiple: false,
    maxSize: MAX_FILE_SIZE,
    noClick: uploadedFile?.status === "success",
  })

  const removeFile = () => {
    setUploadedFile(null)
    setIsProcessing(false)
  }

  const processFiles = async () => {
    if (!uploadedFile || uploadedFile.status !== "success") {
      setUploadError("请先上传文件")
      return
    }

    setUploadError(null)
    setShowProcessingModal(true)
    setIsProcessing(true)
    setProgressVisible(true)
  }

  const handleProcessingComplete = (results: any) => {
    console.log("Processing results:", results)
    setIsProcessing(false)
    setProgressVisible(false)
    router.push("/results")
  }

  const handleDocumentTypeError = () => {
    setShowDocumentTypeError(true)
    setUploadError("检测到非行政处罚决定书，请上传正确的文书类型")
    closeProcessingModal()
  }

  const handleNetworkError = (error: any) => {
    console.error("Network error:", error)
    setUploadError("网络连接失败，请检查网络连接后重试")
    setIsProcessing(false)
    setProgressVisible(false)
  }

  const handleServerError = (error: any) => {
    console.error("Server error:", error)
    setUploadError("服务器错误，请稍后重试")
    setIsProcessing(false)
    setProgressVisible(false)
  }

  const handleProcessingError = (error: any) => {
    console.error("Processing error:", error)
    setUploadError("文档处理失败，请重试或联系管理员")
    setIsProcessing(false)
    setProgressVisible(false)
  }

  const handleRetryUpload = () => {
    setShowDocumentTypeError(false)
    setUploadedFile(null)
    setUploadError(null)
    setIsProcessing(false)
  }

  const handleFileSelect = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    open()
  }

  const renderUploadContent = () => {
    if (uploadedFile && uploadedFile.status === "success") {
      return (
        <div className="text-center animate-fade-in-up">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-50 border border-green-100 shadow-sm">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <h3 className="text-2xl font-semibold text-foreground mb-2">上传成功</h3>
          <p className="text-base text-muted-foreground mb-6">文件已准备就绪</p>

          <div className="bg-white border border-border rounded-xl p-4 mb-8 max-w-md mx-auto shadow-sm flex items-center gap-4 text-left">
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{uploadedFile.file.name}</p>
              <p className="text-xs text-muted-foreground">{(uploadedFile.file.size / 1024).toFixed(1)} KB</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                removeFile()
              }}
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              onClick={removeFile}
              className="h-11 px-6"
            >
              重新上传
            </Button>
            <Button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                processFiles()
              }}
              disabled={isProcessing}
              className="h-11 px-8 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4 fill-current" />
                  开始审查
                </>
              )}
            </Button>
          </div>
        </div>
      )
    }

    // Default upload state
    return (
      <div className="animate-fade-in">
        <div className={cn(
          "mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full transition-all duration-300",
          isDragActive ? "bg-primary/10 scale-110" : "bg-secondary/50 group-hover:bg-secondary"
        )}>
          {isDragActive ? (
            <FileUp className="h-8 w-8 text-primary animate-bounce" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
          )}
        </div>

        <h3 className="text-lg font-semibold text-foreground mb-2">
          {isDragActive ? "释放文件以上传" : "点击或拖拽上传文书"}
        </h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
          支持 .docx 格式，大小不超过 10MB
        </p>

        <div className="flex justify-center">
          <Button
            size="lg"
            variant="outline"
            onClick={handleFileSelect}
            className="h-11 px-8 border-primary/20 text-primary hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all"
          >
            <FileText className="mr-2 h-5 w-5" />
            选择文件
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 w-full max-w-2xl mx-auto">
      {uploadError && (
        <Alert variant="destructive" className="animate-fade-in-up">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="font-medium">{uploadError}</AlertDescription>
        </Alert>
      )}

      <Card
        className={cn(
          "group relative overflow-hidden border-2 border-dashed rounded-2xl transition-all duration-300 ease-out",
          isDragActive
            ? "border-primary bg-primary/5 shadow-lg scale-[1.01]"
            : "border-border hover:border-primary/40 hover:bg-secondary/30 hover:shadow-md",
          uploadedFile?.status === "success" ? "bg-white/50 border-transparent shadow-xl ring-1 ring-black/5" : ""
        )}
      >
        <div
          {...getRootProps()}
          className={cn(
            "relative cursor-pointer text-center p-10 sm:p-14 transition-all duration-300",
            isDragActive ? "bg-transparent" : ""
          )}
        >
          <input {...getInputProps()} />
          {renderUploadContent()}
        </div>
      </Card>

      <ProcessingModal
        isOpen={showProcessingModal}
        onClose={closeProcessingModal}
        files={
          uploadedFile && uploadedFile.status === "success"
            ? [{ name: uploadedFile.file.name, id: uploadedFile.id, file: uploadedFile.file }]
            : []
        }
        onComplete={handleProcessingComplete}
        onDocumentTypeError={handleDocumentTypeError}
        onNetworkError={handleNetworkError}
        onServerError={handleServerError}
        onProcessingError={handleProcessingError}
      />

      <DocumentTypeErrorModal
        isOpen={showDocumentTypeError}
        onClose={() => setShowDocumentTypeError(false)}
        onRetry={handleRetryUpload}
      />
    </div>
  )
}
