"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useDropzone } from "react-dropzone"
import { Upload, FileText, X, AlertCircle, CheckCircle2, Loader2, Play } from "lucide-react"
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
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 border-2 border-green-200">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-2xl font-semibold text-foreground mb-3">上传成功</h3>
          <div className="bg-secondary rounded-lg p-4 mb-6 max-w-md mx-auto">
            <div className="flex items-center gap-3 justify-center">
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-base font-medium text-foreground truncate">{uploadedFile.file.name}</span>
            </div>
          </div>
          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={removeFile}>
              <X className="mr-2 h-4 w-4" />
              重新上传
            </Button>
            <Button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                processFiles()
              }}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
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
      <>
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/20">
          <Upload className="h-8 w-8 text-primary" />
        </div>

        <h3 className="text-2xl font-semibold text-foreground mb-3">
          {isDragActive ? "释放文件到此处" : "拖放 DOCX 文档到此区域"}
        </h3>
        <p className="text-sm text-muted-foreground mb-8">
          支持 DOCX 格式，最大 10MB
        </p>

        <div className="flex justify-center gap-4">
          <Button
            size="default"
            variant="outline"
            onClick={handleFileSelect}
          >
            <FileText className="mr-2 h-5 w-5" />
            选择文件
          </Button>
        </div>
      </>
    )
  }

  return (
    <div className="space-y-8">
      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="font-medium">{uploadError}</AlertDescription>
        </Alert>
      )}

      <Card
        className={cn(
          "border-2 border-dashed transition-colors rounded-lg",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50",
        )}
      >

        <div
          {...getRootProps()}
          className={cn("relative cursor-pointer text-center p-12", isDragActive && "opacity-90")}
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
