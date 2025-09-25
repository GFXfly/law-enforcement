import { type NextRequest, NextResponse } from "next/server"
import { parseDocumentContent, validateDocumentType } from "@/lib/document-processor"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "未提供要校验的文件" }, { status: 400 })
    }

    const documentContent = await parseDocumentContent(file)
    const typeValidation = validateDocumentType(documentContent)

    if (!typeValidation.isValid) {
      return NextResponse.json(
        {
          error: "document_type_error",
          message: "文档不符合行政处罚决定书格式",
          details: typeValidation,
        },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      details: typeValidation,
    })
  } catch (error) {
    console.error("[Validate] 校验文书类型失败:", error)
    return NextResponse.json(
      {
        error: "文书类型校验失败",
        message: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 },
    )
  }
}
