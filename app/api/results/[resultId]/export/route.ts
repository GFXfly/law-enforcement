import { type NextRequest, NextResponse } from "next/server"
import { getProcessingResult } from "@/lib/storage"
import { generateDocxReport, normalizeReportData } from "@/lib/report-generator"

async function getReportData(resultId: string) {
  try {
    const storedResult = await getProcessingResult(resultId)
    if (!storedResult) {
      console.log(`[Export] No results found for ${resultId}`)
      return null
    }

    console.log(`[Export] Found results in storage for ${resultId}`)
    return normalizeReportData(storedResult.results)
  } catch (error) {
    console.error(`[Export] Error getting report data for ${resultId}:`, error)
    return null
  }
}

export async function GET(request: NextRequest, { params }: { params: { resultId: string } }) {
  try {
    const { resultId } = params

    if (!resultId) {
      return NextResponse.json({ error: "缺少结果ID" }, { status: 400 })
    }

    const reportData = await getReportData(resultId)

    if (!reportData) {
      return NextResponse.json({ error: "未找到审查结果数据" }, { status: 404 })
    }

    const docBuffer = await generateDocxReport(reportData)

    const baseName = reportData.files[0]?.name?.replace(/\.[^/.]+$/, "") || "文书"
    const fileName = `审查结果_${baseName}_${new Date().toISOString().slice(0, 10)}.docx`

    return new NextResponse(docBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    })
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json({ error: "导出报告失败" }, { status: 500 })
  }
}
