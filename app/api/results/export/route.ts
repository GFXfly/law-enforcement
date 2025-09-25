import { NextResponse } from "next/server"
import { generateDocxReport, normalizeReportData } from "@/lib/report-generator"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const reportData = normalizeReportData(body?.results || body)

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
    console.error("[Export] Failed to generate report:", error)
    return NextResponse.json({ error: "生成审查报告失败" }, { status: 500 })
  }
}
