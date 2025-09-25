interface UploadResponse {
  success: boolean
  files: Array<{
    id: string
    name: string
    size: number
    type: string
    uploadedAt: string
    status: string
  }>
  message: string
}

interface ProcessingResponse {
  success: boolean
  jobId: string
  status: string
  startedAt: string
  estimatedCompletion: string
  files: Array<{
    fileId: string
    status: string
    progress: number
  }>
}

interface JobStatusResponse {
  success: boolean
  jobId: string
  status: "processing" | "completed" | "failed"
  startedAt: string
  completedAt?: string
  processingTime?: string
  totalFiles: number
  totalIssues: number
  criticalIssues: number
  warningIssues: number
  infoIssues: number
  overallScore: number
  files: Array<any>
}

export class ApiClient {
  private baseUrl: string

  constructor(baseUrl = "/api") {
    this.baseUrl = baseUrl
  }

  async uploadFiles(files: File[]): Promise<UploadResponse> {
    const formData = new FormData()
    files.forEach((file) => formData.append("files", file))

    const response = await fetch(`${this.baseUrl}/upload`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "上传失败")
    }

    return response.json()
  }

  async processFiles(
    fileIds: string[],
    options?: {
      enableAI?: boolean
      enableRuleCheck?: boolean
      strictMode?: boolean
    },
  ): Promise<ProcessingResponse> {
    const response = await fetch(`${this.baseUrl}/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileIds, options }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "处理失败")
    }

    return response.json()
  }

  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    const response = await fetch(`${this.baseUrl}/process/${jobId}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "获取状态失败")
    }

    return response.json()
  }

  async exportResults(resultId: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/results/${resultId}/export`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "导出失败")
    }

    return response.blob()
  }
}

export const apiClient = new ApiClient()
