/**
 * Word格式深度解析器
 * 使用docx库直接读取Word XML结构，获取精确的格式信息
 */

import JSZip from 'jszip'

/**
 * 段落格式信息
 */
export interface ParagraphFormat {
  text: string
  index: number
  // 缩进信息（单位：twip，1 twip = 1/20 pt = 1/1440 inch）
  indentation: {
    firstLine?: number  // 首行缩进
    left?: number       // 左缩进
    right?: number      // 右缩进
    hanging?: number    // 悬挂缩进
  }
  // 行间距信息
  spacing: {
    line?: number       // 行距值
    lineRule?: 'auto' | 'exact' | 'atLeast'  // 行距类型
    before?: number     // 段前间距
    after?: number      // 段后间距
  }
  // 对齐方式
  alignment?: 'left' | 'center' | 'right' | 'justify' | 'both'
  // 原始样式ID
  styleId?: string
}

/**
 * 文档格式信息
 */
export interface DocumentFormatInfo {
  paragraphs: ParagraphFormat[]
  defaultStyles: {
    defaultIndent?: number
    defaultLineSpacing?: number
    defaultLineRule?: string
  }
}

/**
 * 将twip转换为磅（pt）
 */
function twipToPoint(twip: number): number {
  return twip / 20
}

/**
 * 将twip转换为厘米（cm）
 */
function twipToCm(twip: number): number {
  return twip / 567  // 1 cm = 567 twip
}

/**
 * 解析Word文档的XML格式信息
 */
export async function parseWordFormat(file: File): Promise<DocumentFormatInfo> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)

    // 读取document.xml（主文档内容）
    const documentXml = await zip.file('word/document.xml')?.async('text')
    if (!documentXml) {
      throw new Error('无法读取Word文档结构')
    }

    // 读取styles.xml（样式定义）
    const stylesXml = await zip.file('word/styles.xml')?.async('text')

    // 解析默认样式
    const defaultStyles = stylesXml ? parseDefaultStyles(stylesXml) : {}

    // 解析段落格式
    const paragraphs = parseDocumentParagraphs(documentXml, defaultStyles)

    return {
      paragraphs,
      defaultStyles
    }
  } catch (error) {
    console.error('Word格式解析失败:', error)
    throw new Error(`Word格式解析失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 解析默认样式
 */
function parseDefaultStyles(stylesXml: string): DocumentFormatInfo['defaultStyles'] {
  const defaultStyles: DocumentFormatInfo['defaultStyles'] = {}

  try {
    // 查找默认段落样式
    const docDefaultsMatch = stylesXml.match(/<w:docDefaults>[\s\S]*?<\/w:docDefaults>/)
    if (!docDefaultsMatch) return defaultStyles

    const docDefaults = docDefaultsMatch[0]

    // 提取默认缩进
    const indMatch = docDefaults.match(/<w:ind[^>]*w:firstLine="(\d+)"/)
    if (indMatch) {
      defaultStyles.defaultIndent = parseInt(indMatch[1])
    }

    // 提取默认行距
    const spacingMatch = docDefaults.match(/<w:spacing[^>]*w:line="(\d+)"[^>]*w:lineRule="([^"]+)"/)
    if (spacingMatch) {
      defaultStyles.defaultLineSpacing = parseInt(spacingMatch[1])
      defaultStyles.defaultLineRule = spacingMatch[2]
    }
  } catch (error) {
    console.error('解析默认样式失败:', error)
  }

  return defaultStyles
}

/**
 * 解析文档段落格式
 */
function parseDocumentParagraphs(
  documentXml: string,
  defaultStyles: DocumentFormatInfo['defaultStyles']
): ParagraphFormat[] {
  const paragraphs: ParagraphFormat[] = []

  // 匹配所有段落 <w:p>...</w:p>
  const paragraphRegex = /<w:p\b[^>]*?>([\s\S]*?)<\/w:p>/g
  let match
  let index = 0

  while ((match = paragraphRegex.exec(documentXml)) !== null) {
    const paragraphXml = match[1]

    // 提取段落文本
    const text = extractParagraphText(paragraphXml)

    // 跳过空段落
    if (!text || text.trim().length === 0) {
      continue
    }

    // 提取段落属性
    const pPrMatch = paragraphXml.match(/<w:pPr>([\s\S]*?)<\/w:pPr>/)
    const pPr = pPrMatch ? pPrMatch[1] : ''

    // 解析缩进
    const indentation = parseIndentation(pPr, defaultStyles)

    // 解析行间距
    const spacing = parseSpacing(pPr, defaultStyles)

    // 解析对齐方式
    const alignment = parseAlignment(pPr)

    // 解析样式ID
    const styleMatch = pPr.match(/<w:pStyle[^>]*w:val="([^"]+)"/)
    const styleId = styleMatch ? styleMatch[1] : undefined

    paragraphs.push({
      text,
      index,
      indentation,
      spacing,
      alignment,
      styleId
    })

    index++
  }

  return paragraphs
}

/**
 * 提取段落文本内容
 */
function extractParagraphText(paragraphXml: string): string {
  const texts: string[] = []

  // 匹配所有文本节点 <w:t>...</w:t>
  const textRegex = /<w:t[^>]*?>([\s\S]*?)<\/w:t>/g
  let match

  while ((match = textRegex.exec(paragraphXml)) !== null) {
    // 处理XML实体
    const text = match[1]
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
    texts.push(text)
  }

  return texts.join('')
}

/**
 * 解析缩进信息
 */
function parseIndentation(
  pPr: string,
  defaultStyles: DocumentFormatInfo['defaultStyles']
): ParagraphFormat['indentation'] {
  const indentation: ParagraphFormat['indentation'] = {}

  const indMatch = pPr.match(/<w:ind([^>]*)\/>/)
  if (!indMatch) {
    // 使用默认缩进
    if (defaultStyles.defaultIndent) {
      indentation.firstLine = defaultStyles.defaultIndent
    }
    return indentation
  }

  const indAttrs = indMatch[1]

  // 首行缩进
  const firstLineMatch = indAttrs.match(/w:firstLine="(\d+)"/)
  if (firstLineMatch) {
    indentation.firstLine = parseInt(firstLineMatch[1])
  }

  // 左缩进
  const leftMatch = indAttrs.match(/w:left="(\d+)"/)
  if (leftMatch) {
    indentation.left = parseInt(leftMatch[1])
  }

  // 右缩进
  const rightMatch = indAttrs.match(/w:right="(\d+)"/)
  if (rightMatch) {
    indentation.right = parseInt(rightMatch[1])
  }

  // 悬挂缩进
  const hangingMatch = indAttrs.match(/w:hanging="(\d+)"/)
  if (hangingMatch) {
    indentation.hanging = parseInt(hangingMatch[1])
  }

  return indentation
}

/**
 * 解析行间距信息
 */
function parseSpacing(
  pPr: string,
  defaultStyles: DocumentFormatInfo['defaultStyles']
): ParagraphFormat['spacing'] {
  const spacing: ParagraphFormat['spacing'] = {}

  const spacingMatch = pPr.match(/<w:spacing([^>]*)\/>/)
  if (!spacingMatch) {
    // 使用默认行距
    if (defaultStyles.defaultLineSpacing) {
      spacing.line = defaultStyles.defaultLineSpacing
      spacing.lineRule = defaultStyles.defaultLineRule as any
    }
    return spacing
  }

  const spacingAttrs = spacingMatch[1]

  // 行距值
  const lineMatch = spacingAttrs.match(/w:line="(\d+)"/)
  if (lineMatch) {
    spacing.line = parseInt(lineMatch[1])
  }

  // 行距规则
  const lineRuleMatch = spacingAttrs.match(/w:lineRule="([^"]+)"/)
  if (lineRuleMatch) {
    const rule = lineRuleMatch[1]
    spacing.lineRule = rule === 'exact' ? 'exact' : rule === 'atLeast' ? 'atLeast' : 'auto'
  }

  // 段前间距
  const beforeMatch = spacingAttrs.match(/w:before="(\d+)"/)
  if (beforeMatch) {
    spacing.before = parseInt(beforeMatch[1])
  }

  // 段后间距
  const afterMatch = spacingAttrs.match(/w:after="(\d+)"/)
  if (afterMatch) {
    spacing.after = parseInt(afterMatch[1])
  }

  return spacing
}

/**
 * 解析对齐方式
 */
function parseAlignment(pPr: string): ParagraphFormat['alignment'] {
  const jcMatch = pPr.match(/<w:jc[^>]*w:val="([^"]+)"/)
  if (!jcMatch) return undefined

  const alignValue = jcMatch[1]
  switch (alignValue) {
    case 'left': return 'left'
    case 'center': return 'center'
    case 'right': return 'right'
    case 'both':
    case 'distribute': return 'justify'
    default: return undefined
  }
}

/**
 * 格式检查辅助函数
 */
export const FormatChecker = {
  /**
   * 检查首行缩进是否符合标准（2字符 = 420 twip ≈ 21 pt ≈ 0.74 cm）
   * 标准范围：360-480 twip (18-24 pt)
   */
  hasValidIndent(para: ParagraphFormat): boolean {
    const indent = para.indentation.firstLine || 0
    return indent >= 360 && indent <= 480
  },

  /**
   * 检查是否有部分缩进（不足标准）
   */
  hasPartialIndent(para: ParagraphFormat): boolean {
    const indent = para.indentation.firstLine || 0
    return indent > 0 && indent < 360
  },

  /**
   * 检查行间距是否符合标准
   * 标准1: 固定值28pt (560 twip)
   * 标准2: 1.5倍行距 (lineRule=auto, line=360，Word中360表示1.5倍)
   */
  hasValidLineSpacing(para: ParagraphFormat): boolean {
    const { line, lineRule } = para.spacing

    if (!line) return false

    // 固定值28pt (允许26-30pt，即520-600 twip)
    if (lineRule === 'exact' && line >= 520 && line <= 600) {
      return true
    }

    // 1.5倍行距 (360 = 1.5倍，允许340-380)
    if (lineRule === 'auto' && line >= 340 && line <= 380) {
      return true
    }

    return false
  },

  /**
   * 将缩进值转换为可读格式
   */
  formatIndent(twip: number): string {
    const pt = twipToPoint(twip)
    const cm = twipToCm(twip)
    return `${pt.toFixed(1)}pt (${cm.toFixed(2)}cm)`
  },

  /**
   * 将行距值转换为可读格式
   */
  formatLineSpacing(para: ParagraphFormat): string {
    const { line, lineRule } = para.spacing
    if (!line) return '未设置'

    if (lineRule === 'exact') {
      const pt = twipToPoint(line)
      return `固定值${pt.toFixed(1)}磅`
    } else if (lineRule === 'auto') {
      const multiple = (line / 240).toFixed(1)
      return `${multiple}倍行距`
    } else {
      return `${line} twip (${lineRule})`
    }
  }
}
