import { type NextRequest, NextResponse } from "next/server"
import { getProcessingResult } from "@/lib/storage"

export async function GET(request: NextRequest, { params }: { params: { resultId: string } }) {
  const { resultId } = params

  if (!resultId) {
    return NextResponse.json({ error: "缺少结果ID" }, { status: 400 })
  }

  try {
    const stored = await getProcessingResult(resultId)

    if (!stored) {
      return NextResponse.json({ error: "未找到对应的审查结果" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      resultId: stored.id,
      metadata: {
        fileName: stored.fileName,
        timestamp: stored.timestamp,
        userIP: stored.userIP,
      },
      results: stored.results,
    })
  } catch (error) {
    console.error(`[Results API] Failed to load result ${resultId}:`, error)
    return NextResponse.json({ error: "查询审查结果失败" }, { status: 500 })
  }
}
