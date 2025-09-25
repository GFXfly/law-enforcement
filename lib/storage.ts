/**
 * 持久化存储解决方案
 * 在生产环境中，应该使用数据库或KV存储
 */

import { randomBytes } from 'crypto'

export interface ProcessingResult {
  id: string
  jobId: string
  fileName: string
  timestamp: string
  results: any
  userIP?: string
  expiresAt: Date
}

// 内存存储 Map（开发环境使用）
const memoryStorage = new Map<string, ProcessingResult>()

// 清理过期数据的定时任务
setInterval(() => {
  const now = new Date()
  for (const [key, value] of memoryStorage.entries()) {
    if (value.expiresAt < now) {
      memoryStorage.delete(key)
    }
  }
}, 5 * 60 * 1000) // 每5分钟清理一次

/**
 * 生成唯一的作业ID
 */
export function generateJobId(): string {
  return `job_${Date.now()}_${randomBytes(4).toString('hex')}`
}

/**
 * 存储处理结果
 */
export async function storeProcessingResult(
  jobId: string,
  fileName: string,
  results: any,
  userIP?: string
): Promise<string> {
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 24) // 24小时后过期

  const processingResult: ProcessingResult = {
    id: jobId,
    jobId,
    fileName,
    timestamp: new Date().toISOString(),
    results,
    userIP,
    expiresAt
  }

  // 在实际生产环境中，这里应该存储到数据库
  // 例如：await db.processingResults.create({ data: processingResult })

  // 开发环境使用内存存储
  memoryStorage.set(jobId, processingResult)

  console.log(`[Storage] Stored processing result for job ${jobId}`)
  return jobId
}

/**
 * 获取处理结果
 */
export async function getProcessingResult(jobId: string): Promise<ProcessingResult | null> {
  // 在实际生产环境中，这里应该从数据库查询
  // 例如：return await db.processingResults.findUnique({ where: { jobId } })

  // 开发环境从内存存储获取
  const result = memoryStorage.get(jobId)

  if (!result) {
    console.log(`[Storage] Processing result not found for job ${jobId}`)
    return null
  }

  // 检查是否过期
  if (result.expiresAt < new Date()) {
    memoryStorage.delete(jobId)
    console.log(`[Storage] Processing result expired for job ${jobId}`)
    return null
  }

  console.log(`[Storage] Retrieved processing result for job ${jobId}`)
  return result
}

/**
 * 删除处理结果
 */
export async function deleteProcessingResult(jobId: string): Promise<boolean> {
  // 在实际生产环境中，这里应该从数据库删除
  // 例如：await db.processingResults.delete({ where: { jobId } })

  // 开发环境从内存存储删除
  const existed = memoryStorage.has(jobId)
  memoryStorage.delete(jobId)

  if (existed) {
    console.log(`[Storage] Deleted processing result for job ${jobId}`)
  }

  return existed
}

/**
 * 获取所有结果（用于调试或管理）
 */
export async function getAllProcessingResults(): Promise<ProcessingResult[]> {
  // 在实际生产环境中，这里应该从数据库查询
  // 例如：return await db.processingResults.findMany({ orderBy: { timestamp: 'desc' } })

  // 开发环境从内存存储获取
  const results = Array.from(memoryStorage.values())
    .filter(result => result.expiresAt > new Date())
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return results
}

/**
 * 获取存储统计信息
 */
export function getStorageStats() {
  const total = memoryStorage.size
  const expired = Array.from(memoryStorage.values()).filter(
    result => result.expiresAt < new Date()
  ).length
  const active = total - expired

  return {
    total,
    active,
    expired,
    type: 'memory' // 在生产环境中应该返回实际的存储类型
  }
}