/**
 * 系统错误类型定义
 */

export enum ErrorType {
  DOCUMENT_TYPE_ERROR = 'document_type_error',
  NETWORK_ERROR = 'network_error',
  SERVER_ERROR = 'server_error',
  VALIDATION_ERROR = 'validation_error',
  PROCESSING_ERROR = 'processing_error',
  UNKNOWN_ERROR = 'unknown_error'
}

export interface AppError {
  type: ErrorType
  message: string
  details?: any
  retryable: boolean
}

export class DocumentTypeError extends Error {
  type = ErrorType.DOCUMENT_TYPE_ERROR
  retryable = false

  constructor(message: string, details?: any) {
    super(message)
    this.name = 'DocumentTypeError'
  }
}

export class NetworkError extends Error {
  type = ErrorType.NETWORK_ERROR
  retryable = true

  constructor(message: string, details?: any) {
    super(message)
    this.name = 'NetworkError'
  }
}

export class ServerError extends Error {
  type = ErrorType.SERVER_ERROR
  retryable = true

  constructor(message: string, details?: any) {
    super(message)
    this.name = 'ServerError'
  }
}

export class ProcessingError extends Error {
  type = ErrorType.PROCESSING_ERROR
  retryable = false

  constructor(message: string, details?: any) {
    super(message)
    this.name = 'ProcessingError'
  }
}

/**
 * 解析错误并返回结构化错误信息
 */
export function parseError(error: any): AppError {
  // 网络错误
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: ErrorType.NETWORK_ERROR,
      message: '网络连接失败，请检查网络连接',
      retryable: true
    }
  }

  // HTTP 状态错误
  if (error.status) {
    if (error.status >= 500) {
      return {
        type: ErrorType.SERVER_ERROR,
        message: '服务器内部错误，请稍后重试',
        details: error,
        retryable: true
      }
    } else if (error.status >= 400) {
      return {
        type: ErrorType.VALIDATION_ERROR,
        message: error.message || '请求参数错误',
        details: error,
        retryable: false
      }
    }
  }

  // 特定错误类型
  if (error.type === ErrorType.DOCUMENT_TYPE_ERROR) {
    return {
      type: ErrorType.DOCUMENT_TYPE_ERROR,
      message: error.message || '文档类型不符合要求',
      retryable: false
    }
  }

  if (error.type === ErrorType.VALIDATION_ERROR) {
    return {
      type: ErrorType.VALIDATION_ERROR,
      message: error.message || '请求参数错误',
      details: error.details,
      retryable: false
    }
  }

  // 自定义错误类型
  if (error instanceof DocumentTypeError ||
      error instanceof NetworkError ||
      error instanceof ServerError ||
      error instanceof ProcessingError) {
    return {
      type: error.type,
      message: error.message,
      retryable: error.retryable
    }
  }

  // 默认错误
  return {
    type: ErrorType.UNKNOWN_ERROR,
    message: error.message || '发生未知错误',
    retryable: true
  }
}
