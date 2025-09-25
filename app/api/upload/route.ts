import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "没有上传文件" }, { status: 400 })
    }

    // Validate file types and sizes
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ]

    const maxSize = 10 * 1024 * 1024 // 10MB

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: `不支持的文件类型: ${file.name}` }, { status: 400 })
      }

      if (file.size > maxSize) {
        return NextResponse.json({ error: `文件大小超过限制: ${file.name}` }, { status: 400 })
      }
    }

    // Process files (in a real implementation, you would save to storage)
    const uploadedFiles = await Promise.all(
      files.map(async (file) => {
        const buffer = await file.arrayBuffer()
        const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        // Here you would typically:
        // 1. Save file to storage (S3, local filesystem, etc.)
        // 2. Extract text content
        // 3. Store metadata in database

        return {
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
          status: "uploaded",
        }
      }),
    )

    return NextResponse.json({
      success: true,
      files: uploadedFiles,
      message: `成功上传 ${files.length} 个文件`,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "文件上传失败" }, { status: 500 })
  }
}
