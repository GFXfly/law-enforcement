import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableCell, TableRow } from "docx"

export interface IssueData {
  id: string
  type: "critical" | "warning" | "info"
  category: string
  title: string
  description: string
  location: string
  suggestion: string
}

export interface ReportData {
  id: string
  timestamp: string
  totalFiles: number
  totalIssues: number
  criticalIssues: number
  warningIssues: number
  infoIssues: number
  processingTime: string
  overallScore: number
  aiEnabled?: boolean
  files: Array<{
    id: string
    name: string
    size: string
    status: string
    score: number
    issues: IssueData[]
  }>
}

export function normalizeReportData(raw: any): ReportData {
  if (!raw) {
    throw new Error("缺少审查结果数据")
  }

  const files = Array.isArray(raw.files) ? raw.files : []

  return {
    id: raw.id || raw.jobId || `report_${Date.now()}`,
    timestamp: raw.timestamp || new Date().toLocaleString("zh-CN"),
    totalFiles: Number(raw.totalFiles) || files.length,
    totalIssues: Number(raw.totalIssues) || files.reduce((sum: number, file: any) => sum + (file.issues?.length || 0), 0),
    criticalIssues: Number(raw.criticalIssues) || files.reduce((sum: number, file: any) => sum + (file.issues?.filter((i: any) => i.type === "critical").length || 0), 0),
    warningIssues: Number(raw.warningIssues) || files.reduce((sum: number, file: any) => sum + (file.issues?.filter((i: any) => i.type === "warning").length || 0), 0),
    infoIssues: Number(raw.infoIssues) || files.reduce((sum: number, file: any) => sum + (file.issues?.filter((i: any) => i.type === "info").length || 0), 0),
    processingTime: raw.processingTime || "--",
    overallScore: Number(raw.overallScore) || 0,
    aiEnabled: raw.aiEnabled,
    files: files.map((file: any, index: number) => ({
      id: file.id || `file_${index + 1}`,
      name: file.name || `文书_${index + 1}.docx`,
      size: file.size || "--",
      status: file.status || "warning",
      score: Number(file.score) || 0,
      issues: Array.isArray(file.issues)
        ? file.issues.map((issue: any, idx: number) => ({
            id: issue.id || `issue_${idx + 1}`,
            type: (issue.type as IssueData["type"]) || "info",
            category: issue.category || "",
            title: issue.title || "检测到问题",
            description: issue.description || "",
            location: issue.location || "",
            suggestion: issue.suggestion || "",
          }))
        : [],
    })),
  }
}

function createCoverPage(reportData: ReportData) {
  const currentDate = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return [
    new Paragraph({
      children: [
        new TextRun({
          text: "审查结果报告",
          bold: true,
          size: 32,
        }),
      ],
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.TITLE,
      spacing: { after: 600 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `报告编号：${reportData.id}`,
          size: 24,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `审查时间：${reportData.timestamp}`,
          size: 24,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `生成时间：${currentDate}`,
          size: 24,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "审查概览",
          bold: true,
          size: 28,
        })
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 }
    }),
    new Table({
      width: { size: 100, type: "pct" },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "总文件数" })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: String(reportData.totalFiles) })] })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "总问题数" })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: String(reportData.totalIssues) })] })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "综合评分" })] })],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `${reportData.overallScore} 分`,
                      bold: true,
                      color: reportData.overallScore >= 85 ? "059669" : reportData.overallScore >= 70 ? "EA580C" : "DC2626"
                    })
                  ]
                })
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "处理耗时" })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: reportData.processingTime })] })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "AI语义审查" })] })],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: reportData.aiEnabled ? "已启用" : "未启用",
                      bold: true,
                      color: reportData.aiEnabled ? "059669" : "6B7280",
                    })
                  ]
                })
              ],
            }),
          ],
        }),
      ],
    }),
  ]
}

function getIssueColor(type: string) {
  switch (type) {
    case "critical": return "DC2626"
    case "warning": return "EA580C"
    case "info": return "2563EB"
    default: return "000000"
  }
}

function getIssueTypeText(type: string) {
  switch (type) {
    case "critical": return "严重"
    case "warning": return "警告"
    case "info": return "提示"
    default: return "未知"
  }
}

function createIssueSection(issue: IssueData, index: number) {
  return [
    new Paragraph({
      children: [
        new TextRun({
          text: `${index}. ${issue.title}`,
          bold: true,
          size: 22,
        }),
        new TextRun({
          text: ` [${getIssueTypeText(issue.type)}]`,
          bold: true,
          size: 20,
          color: getIssueColor(issue.type),
        }),
      ],
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 200, after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "问题类别：", bold: true }),
        new TextRun({ text: issue.category }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "问题描述：", bold: true }),
        new TextRun({ text: issue.description }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "问题位置：", bold: true }),
        new TextRun({ text: issue.location, italics: true }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "修改建议：", bold: true, color: "059669" }),
        new TextRun({ text: issue.suggestion, color: "059669" }),
      ],
      spacing: { after: 300 },
    }),
  ]
}

function createIssueDetails(issues: IssueData[]) {
  const sections: Paragraph[] = []

  sections.push(
    new Paragraph({
      children: [
        new TextRun({ text: "问题详情", bold: true, size: 28 })
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 300 },
      pageBreakBefore: true,
    })
  )

  const criticalIssues = issues.filter(issue => issue.type === "critical")
  const warningIssues = issues.filter(issue => issue.type === "warning")
  const infoIssues = issues.filter(issue => issue.type === "info")

  if (criticalIssues.length > 0) {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: `🔴 严重问题 (${criticalIssues.length}个)`, bold: true, size: 24, color: "DC2626" })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 200 },
      })
    )
    criticalIssues.forEach((issue, index) => sections.push(...createIssueSection(issue, index + 1)))
  }

  if (warningIssues.length > 0) {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: `🟠 警告问题 (${warningIssues.length}个)`, bold: true, size: 24, color: "EA580C" })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 200 },
      })
    )
    warningIssues.forEach((issue, index) => sections.push(...createIssueSection(issue, index + 1)))
  }

  if (infoIssues.length > 0) {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: `🔵 提示信息 (${infoIssues.length}个)`, bold: true, size: 24, color: "2563EB" })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 200 },
      })
    )
    infoIssues.forEach((issue, index) => sections.push(...createIssueSection(issue, index + 1)))
  }

  return sections
}

function createSummarySection(reportData: ReportData) {
  return [
    new Paragraph({
      children: [new TextRun({ text: "修改建议汇总", bold: true, size: 28 })],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 300 },
      pageBreakBefore: true,
    }),
    new Paragraph({
      children: [new TextRun({ text: `AI语义审查：${reportData.aiEnabled ? "已启用" : "未启用"}`, bold: true })],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "优先级建议：", bold: true, size: 24 })],
      spacing: { before: 200, after: 150 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "1. 高优先级：", bold: true, color: "DC2626" }),
        new TextRun({ text: "立即处理所有严重问题，涉及法律条款和程序要件" }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "2. 中优先级：", bold: true, color: "EA580C" }),
        new TextRun({ text: "及时修正警告问题，完善格式规范和救济途径表述" }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "3. 低优先级：", bold: true, color: "2563EB" }),
        new TextRun({ text: "适时优化提示信息，统一格式和规范用词" }),
      ],
      spacing: { after: 300 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "质量评估：", bold: true, size: 24 })],
      spacing: { before: 200, after: 150 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `当前文书综合评分为 ${reportData.overallScore} 分。` }),
        new TextRun({
          text:
            reportData.overallScore >= 90 ? "文书质量优秀，符合规范要求。" :
            reportData.overallScore >= 80 ? "文书质量良好，建议按优先级逐步改进。" :
            reportData.overallScore >= 70 ? "文书质量一般，需要重点关注严重问题。" :
            "文书质量较差，建议全面审查和修订。",
        }),
      ],
      spacing: { after: 200 },
    }),
  ]
}

function createAppendix() {
  return [
    new Paragraph({
      children: [new TextRun({ text: "附录：相关法规依据", bold: true, size: 28 })],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 300 },
      pageBreakBefore: true,
    }),
    new Paragraph({
      children: [new TextRun({ text: "1. 《中华人民共和国行政处罚法》", bold: true })],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "第四十四条 行政处罚决定书应当载明下列事项：" })],
      spacing: { after: 50 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "(一)当事人的姓名或者名称、地址；\n(二)违反法律、法规、规章的事实和证据；\n(三)行政处罚的种类和依据；\n(四)行政处罚的履行方式和期限；\n(五)申请行政复议、提起行政诉讼的途径和期限；\n(六)作出行政处罚决定的行政机关名称和作出决定的日期。",
        })
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "2. 《中华人民共和国行政复议法》", bold: true })],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "第九条 公民、法人或者其他组织认为具体行政行为侵犯其合法权益的，可以自知道该具体行政行为之日起六十日内提出行政复议申请。" })],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "* 本报告由执法文书校验系统自动生成", italics: true, size: 20 })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 600 },
    }),
  ]
}

export async function generateDocxReport(reportData: ReportData) {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        ...createCoverPage(reportData),
        ...createIssueDetails(reportData.files[0]?.issues || []),
        ...createSummarySection(reportData),
        ...createAppendix(),
      ],
    }],
  })

  return Packer.toBlob(doc)
}
