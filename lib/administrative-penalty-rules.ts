/**
 * 行政处罚决定书审查规则
 * 依据《中华人民共和国行政处罚法》第四十四条及《行政处罚决定书审查标准》
 */

import { DocumentContent, DocumentStructure } from './document-processor'

export interface ReviewIssue {
  problem: string      // 问题描述
  location: string     // 问题位置
  solution: string     // 修改意见
  severity: 'critical' | 'warning' | 'info'
}

export type ReviewSectionCategory =
  | '文书格式检查'
  | '标题部分'
  | '文号部分'
  | '正文部分'
  | '履行与权利告知'
  | '落款部分'
  | '固定内容比对'
  | '整体一致性'

export interface PenaltyReviewRule {
  id: string
  name: string
  category: ReviewSectionCategory
  severity: 'critical' | 'warning' | 'info'
  description: string
  checkFunction: (content: DocumentContent, structure: DocumentStructure) => ReviewIssue[]
}

export interface SimplifiedReviewRule {
  id: string
  name: string
  checkFunction: (content: DocumentContent, structure: DocumentStructure) => ReviewIssue[]
}

const DATE_PATTERN = /\d{4}年\d{1,2}月\d{1,2}日/
const ALT_DATE_PATTERN = /\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/
const CASE_NUMBER_PATTERN = /[（(][^）)]{1,12}[）)][^〔〔\[]*?(处罚|决定|字)[〔\[]\d{4}[〕\]][^号]{0,8}?号/
const CASE_NUMBER_PATTERN_NORMALIZED = /[（(]?[\u4e00-\u9fa5]{0,8}[）)]?(市监罚处|市监罚字|市监处字|市监处|市监罚|市监|市监处罚|市监罚决|监罚|监处|处罚字|处罚|罚字|罚处|处字|决定|罚决|政处|执法处)[〔\[]?\d{4}[〕\]]?\d{1,6}号/
const DOCUMENT_NUMBER_LINE_REGEX = /^\s*[（(]?[\u4e00-\u9fa5A-Za-z（）()]{1,20}[）)]?[^〔\[]*?[〔\[]\d{4}[〕\]]\s*\d{1,6}号/
const HEARING_TRIGGER_AMOUNT = /(罚款|罚金)[^\d]{0,8}(\d+[\d,]{3,})/

function ensureArray<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : []
}

function endContainsDate(text: string): boolean {
  const trimmed = text.trim().replace(/\s+/g, '')
  const tail = trimmed.slice(-20)
  return DATE_PATTERN.test(tail)
}

function getParagraphLocation(index: number): string {
  return `第${index + 1}段`
}

function getContextSnippet(text: string, index: number, radius = 20): string {
  const start = Math.max(0, index - radius)
  const end = Math.min(text.length, index + radius)
  const snippet = text.slice(start, end).replace(/\s+/g, '')
  return snippet.length > 0 ? `…${snippet}…` : '相关段落'
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, '')
}

function getTailParagraphText(content: DocumentContent, count = 3): string {
  const paragraphs = ensureArray(content.paragraphs)
  if (paragraphs.length === 0) {
    return content.text
  }
  return paragraphs.slice(-count).join('')
}

function splitSentences(normalizedText: string): string[] {
  return normalizedText
    .split(/[。；;!?？！]/)
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length > 0)
}

function containsArticleLocator(text: string): boolean {
  return /第[零〇一二三四五六七八九十百千万亿两壹贰叁肆伍陆柒捌玖拾佰仟萬\d]+(条|款|项)/.test(text)
}

const UNIT_KEYWORDS_REGEX = /(单位|公司|有限责任公司|分公司|合作社|中心|企业|商行|门店|药店|学校|医院|超市|店|集团|支队|大队|事务所|研究所|协会|合作联社|工作室|个体工商户)/
const INDENTATION_CHARS = /[\u3000\u00A0\u2000-\u200B]/g
const INDENTATION_REGEX = /^[\u3000\u00A0\u2000-\u200B\s]{2,}/
const MULTIPLE_SPACE_PATTERN = /[\u3000\u00A0\u2000-\u200B\s]{2,}/g
const LABEL_PREFIX_REGEX = /^[\u4e00-\u9fa5（）()]{1,20}[：:]/

function formatSpaceIssue(paragraph: string, match: RegExpMatchArray, index: number): string {
  const start = match.index ?? 0
  const beforeChar = start > 0 ? paragraph[start - 1] : '段首'
  const afterChar = start + match[0].length < paragraph.length ? paragraph[start + match[0].length] : '段尾'
  if (beforeChar === '段首') {
    return `${getParagraphLocation(index)}段开头`
  }
  if (afterChar === '段尾') {
    return `${getParagraphLocation(index)}段末尾`
  }
  return `${getParagraphLocation(index)} · “${beforeChar}”与“${afterChar}”之间`
}

function convertCssLengthToPx(value: number, unit: string): number {
  switch (unit.toLowerCase()) {
    case 'em':
      return value * 16
    case 'pt':
      return value * (96 / 72)
    case 'px':
    default:
      return value
  }
}

function getHtmlParagraphs(html: string): string[] {
  const matches = html.match(/<p[^>]*>[\s\S]*?<\/p>/gi)
  return matches ? matches : []
}

function htmlHasIndentation(htmlParagraph: string): boolean {
  if (!htmlParagraph) return false

  const styleMatch = htmlParagraph.match(/text-indent\s*:\s*(-?\d+(?:\.\d+)?)(pt|px|em)/i)
  if (styleMatch) {
    const value = parseFloat(styleMatch[1])
    const unit = styleMatch[2]
    const px = convertCssLengthToPx(value, unit)
    if (px >= 20) return true
  }

  const marginMatch = htmlParagraph.match(/margin-left\s*:\s*(\d+(?:\.\d+)?)(pt|px|em)/i)
  if (marginMatch) {
    const value = parseFloat(marginMatch[1])
    const unit = marginMatch[2]
    const px = convertCssLengthToPx(value, unit)
    if (px >= 20) return true
  }

  const content = htmlParagraph.replace(/<p[^>]*>/i, '').trimStart()
  if (/^(&nbsp;|\u3000)/.test(content)) {
    return true
  }

  return false
}

function isUnitParty(text: string): boolean {
  return UNIT_KEYWORDS_REGEX.test(text)
}

function getPartySection(text: string): string {
  const match = text.match(/(当事人|被处罚人)[：:][\s\S]{0,400}/)
  if (!match) {
    return text.slice(0, 400)
  }
  const section = match[0]
  const segments = section.split(/\n{2,}/)
  return segments[0]
}

interface RemedyAnalysis {
  review: {
    present: boolean
    templateLike: boolean
  }
  litigation: {
    present: boolean
    templateLike: boolean
  }
}

function analyzeRemedySection(content: DocumentContent): RemedyAnalysis {
  const tailText = getTailParagraphText(content, 7)
  const normalized = normalizeText(tailText)
  const sentences = splitSentences(normalized)

  const reviewPresent = /(如不服|对本处罚?决定不服|对本决定不服|不服本处罚?决定)/.test(normalized) &&
    /(收到本决定(?:书)?之日起(?:六十|60)日内|自收到本决定(?:书)?之日起(?:六十|60)日内|在(?:六十|60)日内向)/.test(normalized) &&
    /申请行政复议/.test(normalized) &&
    /(人民政府|行政复议机关|行政复议委员会|人民政府行政复议办公室)/.test(normalized)

  const reviewSentence = reviewPresent
    ? sentences.find(sentence => /行政复议/.test(sentence)) || ''
    : ''

  const reviewTemplateLike = reviewPresent &&
    /如不服.*?(处罚)?决定.{0,40}(收到本决定(?:书)?之日起(?:六十|60)日内|自收到本决定(?:书)?之日起(?:六十|60)日内|在(?:六十|60)日内向).{0,30}(人民政府|行政复议机关|行政复议委员会|人民政府行政复议办公室).{0,15}申请行政复议/.test(reviewSentence || normalized)

  const litigationPresent = /(六个月内|6个月内|半年内)/.test(normalized) &&
    /人民法院/.test(normalized) &&
    /(行政诉讼|行政诉)/.test(normalized)

  const litigationSentence = litigationPresent
    ? sentences.find(sentence => /(行政诉讼|行政诉)/.test(sentence)) || ''
    : ''

  const litigationTemplateLike = litigationPresent &&
    /(六个月内|6个月内|半年内).{0,30}(直接向|依法向).{0,15}人民法院.{0,15}(提起|提出)行政诉讼/.test(litigationSentence || normalized)

  return {
    review: {
      present: reviewPresent,
      templateLike: reviewTemplateLike
    },
    litigation: {
      present: litigationPresent,
      templateLike: litigationTemplateLike
    }
  }
}

/**
 * 第一步：文书格式检查
 */
const FORMAT_CHECK_RULES: PenaltyReviewRule[] = [
  {
    id: 'format_title_presence',
    name: '文书标题是否存在',
    category: '文书格式检查',
    severity: 'critical',
    description: '检查文书是否包含标题，避免文书结构缺失',
    checkFunction: (_content, structure) => {
      const issues: ReviewIssue[] = []

      if (!structure.title || structure.title.trim().length === 0) {
        issues.push({
          problem: '缺少文书标题，无法识别为行政处罚决定书',
          location: '文书顶部',
          solution: '补充完整的标题信息，建议两行格式：机关名称 + 行政处罚决定书',
          severity: 'critical'
        })
      }

      return issues
    }
  },
  {
    id: 'format_content_length',
    name: '文书内容完整性',
    category: '文书格式检查',
    severity: 'warning',
    description: '检查文书字数是否足以覆盖必备要素',
    checkFunction: (content) => {
      const issues: ReviewIssue[] = []

      if (content.text.replace(/\s+/g, '').length < 500) {
        issues.push({
          problem: '文书内容明显偏少，可能缺失必要事实或程序说明',
          location: '全文',
          solution: '核对文书模板，补充调查经过、事实认定、法律依据等必要部分',
          severity: 'warning'
        })
      }

      if (ensureArray(content.paragraphs).length < 6) {
        issues.push({
          problem: '文书段落数量过少，结构可能不完整',
          location: '全文',
          solution: '对照标准模板补充当事人信息、违法事实、权利告知等段落',
          severity: 'info'
        })
      }

      return issues
    }
  },
  {
    id: 'format_basic_sections',
    name: '基本结构要素',
    category: '文书格式检查',
    severity: 'critical',
    description: '检查是否至少出现当事人信息、违法事实和处罚决定要素',
    checkFunction: (content) => {
      const issues: ReviewIssue[] = []
      const text = content.text

      if (!/(当事人|被处罚人)/.test(text)) {
        issues.push({
          problem: '文书缺少当事人身份信息段落',
          location: '正文开头',
          solution: '补充“当事人”“被处罚人”等基本身份信息及联系方式',
          severity: 'critical'
        })
      }

      if (!/(违法事实|违法行为|经查|经调查)/.test(text)) {
        issues.push({
          problem: '未见违法事实认定段落，无法体现处罚依据',
          location: '正文主体部分',
          solution: '增加违法事实认定段落，写明时间、地点、行为及证据',
          severity: 'critical'
        })
      }

      if (!/(决定给予|决定对|现决定|处罚如下)/.test(text)) {
        issues.push({
          problem: '文书缺少明确的处罚决定表述',
          location: '处罚决定部分',
          solution: '使用“决定给予……处罚”等标准决定语句',
          severity: 'critical'
        })
      }

      return issues
    }
  },
  {
    id: 'paragraph_indentation',
    name: '正文段落首行缩进',
    category: '文书格式检查',
    severity: 'warning',
    description: '检查正文段落是否保持首行缩进两个字符',
    checkFunction: (content) => {
      const issues: ReviewIssue[] = []
      const paragraphs = ensureArray(content.paragraphs)
      const htmlParagraphs = getHtmlParagraphs(content.html)

      const missingParagraphs: string[] = []

      paragraphs.forEach((paragraph, index) => {
        if (index < 3) return

        const trimmed = paragraph.trim()
        if (trimmed.length < 8) return

        const isListHeading = /^[（(]?[一二三四五六七八九十0-9]+[、.．]/.test(trimmed) || /^第[一二三四五六七八九十百]+[章节条款]/.test(trimmed)
        if (isListHeading) return

        // 标签型段落（如“住所：”“法定代表人：”）通常不做首行缩进要求
        if (/^[\u4e00-\u9fa5（）()\s]{1,15}[：:]/.test(trimmed)) {
          return
        }

        const expandedParagraph = paragraph
          .replace(/\u00A0/g, ' ')
          .replace(/[\u2000-\u200B]/g, ' ')

        // 增强缩进检测逻辑 - 更宽松的检测条件
        const hasIndent =
          INDENTATION_REGEX.test(expandedParagraph) || // 原有的空格检测
          /^\t/.test(paragraph) || // Tab缩进
          htmlHasIndentation(htmlParagraphs[index] || '') || // HTML样式缩进
          /^[\u3000]{1,}/.test(paragraph) || // 全角空格缩进（更宽松）
          /^[ ]{2,}/.test(paragraph) || // 至少2个半角空格
          /^\s{2,}/.test(paragraph) || // 任意2个以上空白字符
          paragraph !== paragraph.trimStart() // 任何形式的首位空白

        if (!hasIndent) {
          missingParagraphs.push(getParagraphLocation(index))
        }
      })

      if (missingParagraphs.length > 0) {
        issues.push({
          problem: `检测到以下段落未首行缩进两个字符：${missingParagraphs.join('、')}`,
          location: '正文段落',
          solution: '请为上述段落设置首行缩进2字符或在段首补足两个全角空格。',
          severity: 'warning'
        })
      }

      return issues
    }
  }
]

/**
 * 第二步：标题部分检查
 */
const TITLE_SECTION_RULES: PenaltyReviewRule[] = [
  {
    id: 'title_keyword_check',
    name: '标题包含“行政处罚决定书”',
    category: '标题部分',
    severity: 'critical',
    description: '检查标题是否严格包含“行政处罚决定书”字样',
    checkFunction: (_content, structure) => {
      const issues: ReviewIssue[] = []
      const title = structure.title || ''

      if (!title.includes('行政处罚决定书')) {
        issues.push({
          problem: '标题未包含“行政处罚决定书”标准表述',
          location: '标题',
          solution: '标题第二行应准确使用“行政处罚决定书”字样',
          severity: 'critical'
        })
      }

      return issues
    }
  },
  {
    id: 'title_two_line_structure',
    name: '标题两行结构',
    category: '标题部分',
    severity: 'warning',
    description: '检查标题是否采用“机关名称 + 行政处罚决定书”的两行结构',
    checkFunction: (_content, structure) => {
      const issues: ReviewIssue[] = []
      const titleLines = ensureArray(structure.titleLines)

      if (titleLines.length < 2) {
        issues.push({
          problem: '未检测到“机关名称 + 行政处罚决定书”的两行标题结构',
          location: '标题',
          solution: '标题建议分两行：第一行机关名称，第二行“行政处罚决定书”',
          severity: 'warning'
        })
      } else {
        const firstLine = titleLines[0].trim()
        const secondLine = titleLines[1].trim()

        if (!/(局|委员会|人民政府|管理局|监督局|执法队)/.test(firstLine)) {
          issues.push({
            problem: '标题第一行未呈现完整执法机关名称',
            location: '标题第一行',
            solution: '第一行应为完整机关名称，如“××市市场监督管理局”',
            severity: 'warning'
          })
        }

        if (secondLine !== '行政处罚决定书') {
          issues.push({
            problem: '标题第二行表述不规范',
            location: '标题第二行',
            solution: '第二行建议严格书写为“行政处罚决定书”',
            severity: 'warning'
          })
        }
      }

      return issues
    }
  }
]

/**
 * 第三步：文号部分检查
 */
const DOCUMENT_NUMBER_RULES: PenaltyReviewRule[] = [
  {
    id: 'document_number_presence',
    name: '案件文号存在性',
    category: '文号部分',
    severity: 'critical',
    description: '检查是否匹配标准案件文号格式',
    checkFunction: (content) => {
      const issues: ReviewIssue[] = []
      const topParagraphs = ensureArray(content.paragraphs).slice(0, 8)
      const candidateLines = topParagraphs
        .flatMap(paragraph => paragraph.split(/\n+/))
        .map(line => line.trim())
        .filter(line => line.length > 0)

      const hasDocumentNumber = candidateLines.some(line => {
        const normalized = normalizeText(line).replace(/_+/g, '')
        return CASE_NUMBER_PATTERN.test(line) || CASE_NUMBER_PATTERN_NORMALIZED.test(normalized)
      })

      if (!hasDocumentNumber) {
        issues.push({
          problem: '未发现符合规范的案件文号',
          location: '标题下方文号区域',
          solution: '按照“（机关简称）处罚〔年份〕序号号”格式补充案件文号',
          severity: 'critical'
        })
      }

      return issues
    }
  },
  {
    id: 'document_number_format',
    name: '文号格式规范性',
    category: '文号部分',
    severity: 'warning',
    description: '检查括号、方括号和处罚类型标识是否完整',
    checkFunction: (content) => {
      const issues: ReviewIssue[] = []
      const topParagraphs = ensureArray(content.paragraphs).slice(0, 8)
      const candidateLines = topParagraphs
        .flatMap(paragraph => paragraph.split(/\n+/))
        .map(line => line.trim())
        .filter(line => DOCUMENT_NUMBER_LINE_REGEX.test(line))

      candidateLines.forEach(line => {
        const problems: string[] = []
        const suggestions: string[] = []
        let severity: ReviewIssue['severity'] = 'info'

        if (/\([^)]+\)/.test(line) && !/（[^）]+）/.test(line)) {
          problems.push('机关简称未使用中文全角括号')
          suggestions.push('机关简称应使用中文全角括号（），例如：（市监）')
          severity = 'warning'
        }

        if (!/〔\d{4}〕/.test(line)) {
          problems.push('缺少年份方括号“〔〕”标注')
          suggestions.push('年份需使用〔〕标注，例如：〔2025〕')
          severity = 'warning'
        }

        const categorySegment = line
          .split('〔')[0]
          .replace(/[（(][^）)]{1,12}[）)]/, '')
          .replace(/[^\u4e00-\u9fa5A-Za-z]/g, '')

        const hasCategory = categorySegment.length === 0
          ? true
          : /(罚|处|决定|警告|没收|吊销|责令|字|罚处|罚字|处字|罚决)/.test(categorySegment)

        if (!hasCategory) {
          problems.push('未识别到处罚类别或文种标识')
          suggestions.push('可在机关简称后加入“罚处”“罚字”“决定”等文种标识，与本机关惯用格式保持一致')
        }

        if (problems.length > 0) {
          issues.push({
            problem: `案件文号“${line}”存在：${problems.join('；')}`,
            location: '文号部分',
            solution: suggestions.join('；'),
            severity
          })
        }
      })

      return issues
    }
  }
]

/**
 * 第四步：正文部分检查
 */
const MAIN_CONTENT_RULES: PenaltyReviewRule[] = [
  {
    id: 'party_information_completeness',
    name: '当事人信息完整性',
    category: '正文部分',
    severity: 'critical',
    description: '核查姓名/名称、地址、身份证明等是否齐全',
    checkFunction: (content) => {
      const issues: ReviewIssue[] = []
      const text = content.text
      const partySection = getPartySection(text)

      if (!/(当事人|被处罚人)[：:].{2,30}/.test(partySection)) {
        issues.push({
          problem: '未明确列示当事人姓名或名称',
          location: '当事人基本信息段',
          solution: '补充“当事人：”或“被处罚人：”及完整姓名/单位名称',
          severity: 'critical'
        })
      }

      const addressRegex = /(住所|住址|地址|经营场所|经营地址)(（[^）]*）)?\s*[：:].{5,}/

      if (!addressRegex.test(partySection)) {
        issues.push({
          problem: '当事人地址或经营场所信息缺失',
          location: '当事人基本信息段',
          solution: '补充详细地址或经营场所信息，确保可送达',
          severity: 'critical'
        })
      }

      const hasCompany = isUnitParty(partySection)
      const idRegex = /(身份证|居民身份证|身份证号|身份证号码|其他有效证件)[^\n]{0,12}[：:]\s*[0-9]{17}[0-9Xx]/
      const creditRegex = /(统一社会信用代码|组织机构代码|税务登记证号)[^\n]{0,12}[：:]\s*[0-9A-Z\-]{8,}/

      const hasIdInfo = idRegex.test(partySection)
      const hasCreditInfo = creditRegex.test(partySection)

      if (hasCompany) {
        if (!hasCreditInfo) {
          issues.push({
            problem: '单位当事人未提供统一社会信用代码或组织机构代码',
            location: '当事人基本信息段',
            solution: '补充单位统一社会信用代码、组织机构代码等主体身份信息',
            severity: 'critical'
          })
        }
      } else {
        if (!hasIdInfo) {
          issues.push({
            problem: '个人当事人未提供身份证号码或有效证件号码',
            location: '当事人基本信息段',
            solution: '补充个人身份证号码或其他有效身份证明信息',
            severity: 'critical'
          })
        }
      }

      return issues
    }
  },
  {
    id: 'legal_representative_information',
    name: '法定代表人信息',
    category: '正文部分',
    severity: 'warning',
    description: '检查单位当事人是否注明法定代表人或负责人',
    checkFunction: (content) => {
      const issues: ReviewIssue[] = []

      const partySection = getPartySection(content.text)

      if (isUnitParty(partySection)) {
        if (!/(法定代表人|主要负责人|负责人)/.test(partySection)) {
          issues.push({
            problem: '单位当事人未注明法定代表人或负责人',
            location: '当事人信息段',
            solution: '为单位当事人补充“法定代表人/负责人：××”等信息',
            severity: 'warning'
          })
        }
      }

      return issues
    }
  },
  {
    id: 'violation_facts_specificity',
    name: '违法事实具体性',
    category: '正文部分',
    severity: 'critical',
    description: '检查违法事实是否包含时间、地点、行为三要素',
    checkFunction: (content) => {
      const issues: ReviewIssue[] = []
      const text = content.text

      if (!/(违法事实|违法行为|经查|查明)/.test(text)) {
        issues.push({
          problem: '未明确设置违法事实认定段落',
          location: '违法事实部分',
          solution: '增加“违法事实：……”段落，说明调查情况及事实认定',
          severity: 'critical'
        })
      }

      if (!DATE_PATTERN.test(text) && !ALT_DATE_PATTERN.test(text)) {
        issues.push({
          problem: '违法事实缺少明确的发生时间',
          location: '违法事实部分',
          solution: '补充违法行为发生的具体日期，例如“2025年5月10日”',
          severity: 'critical'
        })
      }

      if (!/(在.*?进行|于.*?处|地点为|发生在)/.test(text)) {
        issues.push({
          problem: '违法事实未说明具体地点',
          location: '违法事实部分',
          solution: '写明违法行为发生地点或经营场所，确保要素完整',
          severity: 'warning'
        })
      }

      return issues
    }
  },
  {
    id: 'evidence_enumeration',
    name: '证据列举情况',
    category: '正文部分',
    severity: 'warning',
    description: '检查证据材料是否逐项列举并能支撑事实',
    checkFunction: (content) => {
      const issues: ReviewIssue[] = []
      const text = content.text
      const evidenceKeywords = text.match(/证据[一二三四五六七八九十0-9]|询问笔录|现场检查笔录|检测报告|鉴定意见|票据|照片|凭证/g)

      if (!evidenceKeywords || evidenceKeywords.length < 2) {
        issues.push({
          problem: '未见对证据材料的逐项列举，难以支撑事实认定',
          location: '证据说明部分',
          solution: '以“证据一……证据二……”形式列出主要证据及证明目的',
          severity: 'warning'
        })
      }

      return issues
    }
  },
  {
    id: 'legal_basis_completeness',
    name: '法律依据引用完整',
    category: '正文部分',
    severity: 'critical',
    description: '检查违法依据与处罚依据引用是否准确、格式规范',
    checkFunction: (content) => {
      const issues: ReviewIssue[] = []
      const text = content.text
      const normalized = normalizeText(text)

      if (!/(违反|构成).*?(法|条例|规定|办法)[^。；]{0,20}(条|款|项)/.test(normalized)) {
        issues.push({
          problem: '未引用具体的违法法律条款',
          location: '法律依据部分',
          solution: '补充“违反《××法》第×条第×款”的违法依据表述',
          severity: 'critical'
        })
      }

      if (!/(依据|根据).*?(法|条例|规定|办法)[^。；]{0,30}(条|款|项)/.test(normalized)) {
        issues.push({
          problem: '未引用作出处罚决定的法律依据',
          location: '法律依据部分',
          solution: '补充“依据《××法》第×条”的处罚依据表述',
          severity: 'critical'
        })
      }

      const lawMentions = Array.from(text.matchAll(/《([\u4e00-\u9fa5]{2,})》/g))
      if (lawMentions.length > 0 && !containsArticleLocator(normalized)) {
        issues.push({
          problem: '法律条文引用格式可能不够规范，未见“第×条/款/项”表述',
          location: '法律依据部分',
          solution: '在引用法律名称后补充具体条款，例如“《食品安全法》第三十四条”。',
          severity: 'warning'
        })
      }

      return issues
    }
  },
  {
    id: 'penalty_decision_specificity',
    name: '处罚决定明确性',
    category: '正文部分',
    severity: 'critical',
    description: '检查处罚种类、幅度、履行方式是否明确',
    checkFunction: (content) => {
      const issues: ReviewIssue[] = []
      const text = content.text
      const penaltyTypes = ['警告', '罚款', '没收', '责令停产停业', '暂扣', '吊销', '行政拘留']
      const hasPenaltyType = penaltyTypes.some(type => text.includes(type))

      if (!hasPenaltyType) {
        issues.push({
          problem: '未明确写明处罚种类或处罚幅度',
          location: '处罚决定部分',
          solution: '明确写明具体处罚种类，如“决定给予警告并罚款人民币××元”',
          severity: 'critical'
        })
      }

      if (/罚款/.test(text)) {
        const penaltyAmountPattern = /(?:人民币|金额|共计).*?(元|万元)|罚款[:：]\s*\d+(?:,\d{3})*(?:\.\d+)?\s*元?/
        if (!penaltyAmountPattern.test(text)) {
          issues.push({
            problem: '罚款处罚未注明具体金额及币种',
            location: '处罚决定部分',
            solution: '补充罚款金额及单位，如“罚款人民币5000元”',
            severity: 'critical'
          })
        }
      }

      return issues
    }
  }
]

/**
 * 第五步：履行与权利告知
 */
const FULFILLMENT_AND_RIGHTS_RULES: PenaltyReviewRule[] = [
  {
    id: 'penalty_deadline',
    name: '处罚履行期限',
    category: '履行与权利告知',
    severity: 'critical',
    description: '检查是否明确处罚履行期限',
    checkFunction: (content) => {
      const issues: ReviewIssue[] = []

      if (/(罚款|没收|责令改正)/.test(content.text) && !/(\d+日内|十五日内|30日内|三十日内|自收到.*?之日)/.test(content.text)) {
        issues.push({
          problem: '未告知处罚决定的履行期限',
          location: '执行要求部分',
          solution: '补充“自收到本决定书之日起十五日内履行”等履行期限表述',
          severity: 'critical'
        })
      }

      return issues
    }
  },
  {
    id: 'payment_instructions',
    name: '罚款缴纳方式',
    category: '履行与权利告知',
    severity: 'warning',
    description: '检查罚款类处罚是否说明缴纳途径',
    checkFunction: (content) => {
      const issues: ReviewIssue[] = []

      if (/罚款/.test(content.text) && !/(缴纳|缴款|银行|账户|非税收入|代收机构)/.test(content.text)) {
        issues.push({
          problem: '罚款处罚未明确缴纳方式或账户',
          location: '执行要求部分',
          solution: '补充缴款方式，如“通过非税收入一般缴款书在××银行缴纳”',
          severity: 'warning'
        })
      }

      return issues
    }
  },
  {
    id: 'statement_and_defense_notice',
    name: '陈述申辩权利告知',
    category: '履行与权利告知',
    severity: 'warning',
    description: '检查是否告知当事人陈述、申辩或听证权利',
    checkFunction: (content) => {
      const issues: ReviewIssue[] = []
      const text = content.text

      if (!/(陈述|申辩|事先告知|拟处罚告知)/.test(text)) {
        issues.push({
          problem: '未见陈述申辩权利的告知记录',
          location: '权利告知部分',
          solution: '补充表述“你单位已享有陈述申辩权利”或说明是否放弃',
          severity: 'warning'
        })
      }

      if (HEARING_TRIGGER_AMOUNT.test(text) && !/(听证|听证权)/.test(text)) {
        issues.push({
          problem: '涉及较大罚款但未告知听证权利',
          location: '权利告知部分',
          solution: '对于较大罚款或责令停产停业等，应告知当事人听证权利及期限',
          severity: 'warning'
        })
      }

      return issues
    }
  },
  {
    id: 'remedy_notice',
    name: '行政复议与诉讼告知',
    category: '履行与权利告知',
    severity: 'critical',
    description: '检查行政复议与诉讼途径是否完整规范',
    checkFunction: (content) => {
      const issues: ReviewIssue[] = []
      const remedy = analyzeRemedySection(content)

      const missing: string[] = []

      if (!remedy.review.present) {
        missing.push('行政复议救济途径')
      }

      if (!remedy.litigation.present) {
        missing.push('行政诉讼救济途径')
      }

      if (missing.length > 0) {
        const components = missing.join('、')
        const solutionParts: string[] = []

        if (!remedy.review.present) {
          solutionParts.push('补充“如不服本决定，可以在收到本决定书之日起六十日内向××申请行政复议”')
        }

        if (!remedy.litigation.present) {
          solutionParts.push('补充“也可以在收到本决定书之日起六个月内直接向人民法院提起行政诉讼”')
        }

        issues.push({
          problem: `未检测到${components}的完整表述`,
          location: '第十部分救济途径',
          solution: solutionParts.join('；'),
          severity: 'critical'
        })
      }

      return issues
    }
  }
]

/**
 * 第六步：落款部分检查
 */
const SIGNATURE_SECTION_RULES: PenaltyReviewRule[] = [
  {
    id: 'authority_signature',
    name: '执法机关落款',
    category: '落款部分',
    severity: 'critical',
    description: '检查文末是否标注执法机关名称且与落款日期位置匹配',
    checkFunction: (content) => {
      const issues: ReviewIssue[] = []
      const tailParagraphs = ensureArray(content.paragraphs)
        .slice(-5)
        .map(paragraph => paragraph.trim())
        .filter(paragraph => paragraph.length > 0)

      const agencyRegex = /(人民政府|市场监督管理局|监督管理局|管理局|监督局|执法队|执法局|管理委员会|管理所|大队|支队|行政执法|行政机关)/
      const dateRegex = /\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日/

      const agencyIndex = tailParagraphs.findIndex(paragraph =>
        agencyRegex.test(paragraph) && paragraph.length <= 40
      )

      if (agencyIndex === -1) {
        issues.push({
          problem: '未在文末明确标注作出处罚决定的执法机关名称',
          location: '落款部分',
          solution: '在落款处单独列出执法机关全称，如“××市市场监督管理局”。',
          severity: 'critical'
        })
        return issues
      }

      const normalizedTail = tailParagraphs.map(paragraph => paragraph.replace(/\s+/g, ''))
      const dateIndex = normalizedTail.findIndex(paragraph => dateRegex.test(paragraph))

      if (dateIndex !== -1 && dateIndex < agencyIndex) {
        issues.push({
          problem: '落款日期位置异常，应在执法机关名称之后',
          location: '落款部分',
          solution: '调整版式，使落款日期置于执法机关名称下方并保持对齐。',
          severity: 'warning'
        })
      }

      return issues
    }
  },
  {
    id: 'decision_date',
    name: '决定日期规范性',
    category: '落款部分',
    severity: 'critical',
    description: '检查落款日期是否存在且格式正确',
    checkFunction: (content) => {
      const issues: ReviewIssue[] = []

      const tailText = getTailParagraphText(content)
      const normalizedTail = normalizeText(tailText)
      const hasDateInTail = DATE_PATTERN.test(normalizedTail) ||
        /\d{4}年\d{1,2}月\d{1,2}日/.test(normalizedTail) ||
        /\d{4}年\d{1,2}月\d{1,2}日$/.test(normalizedTail)

      if (!hasDateInTail) {
        issues.push({
          problem: '文书末尾未见标准的作出决定日期',
          location: '落款日期',
          solution: '在落款处写明“2025年5月10日”等完整日期，与机关名称对齐',
          severity: 'critical'
        })
      }

      return issues
    }
  }
]

/**
 * 第七步：固定内容比对（第九、第十部分）
 */
const FIXED_CONTENT_RULES: PenaltyReviewRule[] = [
  {
    id: 'fixed_reconsideration_content',
    name: '行政复议固定表述',
    category: '固定内容比对',
    severity: 'warning',
    description: '比对行政复议救济告知是否符合标准模板',
    checkFunction: (content) => {
      const issues: ReviewIssue[] = []
      const remedy = analyzeRemedySection(content)

      if (!remedy.review.present) {
        return issues
      }

      if (!remedy.review.templateLike) {
        issues.push({
          problem: '行政复议救济语句存在表述顺序或要素偏差',
          location: '第十部分救济途径',
          solution: '参考模板调整为“如不服本处罚决定，可以在收到本决定书之日起六十日内向××人民政府申请行政复议”。',
          severity: 'warning'
        })
      }

      return issues
    }
  },
  {
    id: 'fixed_litigation_content',
    name: '行政诉讼固定表述',
    category: '固定内容比对',
    severity: 'warning',
    description: '比对行政诉讼救济告知是否符合标准模板',
    checkFunction: (content) => {
      const issues: ReviewIssue[] = []
      const remedy = analyzeRemedySection(content)

      if (!remedy.litigation.present) {
        return issues
      }

      if (!remedy.litigation.templateLike) {
        issues.push({
          problem: '行政诉讼救济语句未按照“六个月+人民法院+行政诉讼”模板表述',
          location: '第十部分救济途径',
          solution: '建议写为“也可以在收到本决定书之日起六个月内向××人民法院提起行政诉讼”。',
          severity: 'warning'
        })
      }

      return issues
    }
  },
  {
    id: 'fixed_overdue_consequence',
    name: '逾期履行后果表述',
    category: '固定内容比对',
    severity: 'warning',
    description: '检查逾期不履行的法律后果表述是否完整',
    checkFunction: (content) => {
      const issues: ReviewIssue[] = []
      const normalized = normalizeText(content.text)

      if (/罚款/.test(normalized)) {
        const surchargePattern = /(逾期(不|未)缴(纳)?罚款.{0,20}(每日)?按(罚款)?数额.{0,12}(百分之三|3%)[^。；]*加(收|处罚)罚款)/
        const enforcementPattern = /(申请人民法院[^。；]{0,12}强制执行|依法[^。；]{0,12}申请人民法院强制执行|向人民法院申请强制执行)/

        if (!surchargePattern.test(normalized) || !enforcementPattern.test(normalized)) {
          issues.push({
            problem: '罚款逾期履行后果表述不完整',
            location: '第九部分履行方式与期限',
            solution: '补充“逾期不缴纳罚款的，每日按罚款数额的百分之三加处罚款，并可申请人民法院强制执行”',
            severity: 'warning'
          })
        }
      }

      return issues
    }
  }
]

/**
 * 第八步：整体一致性检查
 */
const CONSISTENCY_RULES: PenaltyReviewRule[] = [
  {
    id: 'party_name_consistency',
    name: '当事人名称前后一致',
    category: '整体一致性',
    severity: 'warning',
    description: '检查当事人姓名或单位名称是否前后一致',
    checkFunction: (content) => {
      const issues: ReviewIssue[] = []
      const matches = content.text.match(/当事人[：:]\s*([^\s，。\n]{2,30})/g) || []
      const names = matches
        .map(match => {
          const result = match.match(/当事人[：:]\s*([^\s，。\n]{2,30})/)
          return result ? result[1] : null
        })
        .filter((name): name is string => Boolean(name))

      if (names.length > 1) {
        const uniques = Array.from(new Set(names))
        if (uniques.length > 1) {
          issues.push({
            problem: `当事人名称存在前后不一致：${uniques.join('、')}`,
            location: '全文',
            solution: '核对当事人名称，确保全文表述完全一致',
            severity: 'warning'
          })
        }
      }

      return issues
    }
  },
  {
    id: 'penalty_amount_consistency',
    name: '处罚金额一致性',
    category: '整体一致性',
    severity: 'warning',
    description: '检查罚款金额在文中是否多次出现不同数值',
    checkFunction: (content) => {
      const issues: ReviewIssue[] = []
      const matches = content.text.match(/(罚款|人民币|合计)[^\d]{0,6}(\d{1,3}(?:,\d{3})*|\d+)/g) || []
      const amounts = matches
        .map(item => {
          const valueMatch = item.match(/(\d{1,3}(?:,\d{3})*|\d+)/)
          return valueMatch ? valueMatch[1].replace(/,/g, '') : null
        })
        .filter((value): value is string => Boolean(value))

      if (amounts.length > 1) {
        const uniqueValues = Array.from(new Set(amounts))
        if (uniqueValues.length > 1) {
          issues.push({
            problem: `文书中罚款金额出现多个数值：${uniqueValues.join('、')}元`,
            location: '处罚决定部分',
            solution: '核对金额，保留法定金额并确保全篇一致',
            severity: 'warning'
          })
        }
      }

      return issues
    }
  },
  {
    id: 'duplicate_prompt_phrases',
    name: '提示性短语重复',
    category: '整体一致性',
    severity: 'warning',
    description: '检查段落中是否出现“经查明”等提示性短语重复粘贴的情况',
    checkFunction: (content) => {
      const issues: ReviewIssue[] = []
      const paragraphs = ensureArray(content.paragraphs)
      const duplicatePattern = /([\u4e00-\u9fa5]{2,12}[：:])\s*\1/

      paragraphs.forEach((paragraph, index) => {
        const match = paragraph.match(duplicatePattern)
        if (match) {
          const phrase = match[1].replace(/[：:]/, '')
          issues.push({
            problem: `检测到提示性短语重复：${match[0]}`,
            location: getParagraphLocation(index),
            solution: `删除重复的“${phrase}：”表述，仅保留一次。`,
            severity: 'warning'
          })
        }
      })

      return issues
    }
  },
  {
    id: 'book_title_bracket_balance',
    name: '书名号成对使用',
    category: '整体一致性',
    severity: 'warning',
    description: '检查《》书名号是否成对出现，避免缺失前导或后续符号',
    checkFunction: (content) => {
      const issues: ReviewIssue[] = []
      const text = content.text
      const unmatchedClosings: number[] = []
      const unmatchedOpenings: number[] = []
      const stack: number[] = []

      for (let i = 0; i < text.length; i++) {
        const char = text[i]
        if (char === '《') {
          stack.push(i)
        } else if (char === '》') {
          if (stack.length === 0) {
            unmatchedClosings.push(i)
          } else {
            stack.pop()
          }
        }
      }

      unmatchedClosings.forEach(index => {
        issues.push({
          problem: '发现缺少对应前导“《”的书名号，可能导致引用不完整',
          location: getContextSnippet(text, index),
          solution: '补充对应的“《”使书名号成对出现，如“《书证提取单》”。',
          severity: 'warning'
        })
      })

      // 剩余栈内的都是缺少结尾“》”的情况
      stack.forEach(index => {
        unmatchedOpenings.push(index)
      })

      unmatchedOpenings.forEach(index => {
        issues.push({
          problem: '发现缺少对应结束“》”的书名号',
          location: getContextSnippet(text, index),
          solution: '补全“》”使引用名称完整，例如“《食品安全法》第三十四条”。',
          severity: 'warning'
        })
      })

      return issues
    }
  },
  {
    id: 'ordered_list_spacing',
    name: '编号后空格规范',
    category: '整体一致性',
    severity: 'info',
    description: '检查数字编号后是否存在多余或全角空格导致排版不整齐',
    checkFunction: (content) => {
      const issues: ReviewIssue[] = []
      const paragraphs = ensureArray(content.paragraphs)
      const pattern = /^\s*(\d+[．.])([\s　]+)(.+)$/

      paragraphs.forEach((paragraph, index) => {
        const trimmed = paragraph.trim()
        const match = trimmed.match(pattern)
        if (!match) return

        const spaces = match[2]
        if (spaces.length > 0) {
          const hasFullWidthSpace = spaces.includes('　')
          const spaceLabel = hasFullWidthSpace ? '全角空格' : '空格'
          issues.push({
            problem: `编号“${match[1]}”后存在多余${spaceLabel}，影响编号与正文对齐`,
            location: getParagraphLocation(index),
            solution: '删除编号后的空格，使数字与正文直接衔接，例如“3.2022年…”',
            severity: 'info'
          })
        }
      })

      return issues
    }
  },
  {
    id: 'excessive_internal_spacing',
    name: '文本空格规范',
    category: '整体一致性',
    severity: 'info',
    description: '检查正文中是否存在连续空格或全角空格影响版式',
    checkFunction: (content) => {
      const issues: ReviewIssue[] = []
      const paragraphs = ensureArray(content.paragraphs)
      const problemDetails: string[] = []

      paragraphs.forEach((paragraph, index) => {
        const regex = new RegExp(MULTIPLE_SPACE_PATTERN.source, 'g')
        let match
        while ((match = regex.exec(paragraph)) !== null) {
          if ((match[0].length || 0) >= 2) {
            const preceding = paragraph.slice(0, match.index || 0)
            if (LABEL_PREFIX_REGEX.test(preceding)) {
              continue
            }
            problemDetails.push(formatSpaceIssue(paragraph, match, index))
          }
        }
      })

      if (problemDetails.length > 0) {
        issues.push({
          problem: '检测到正文中存在连续空格或全角空格，可能影响排版整齐',
          location: `位点：${Array.from(new Set(problemDetails)).join('、')}`,
          solution: '请删除多余空格或改用首行缩进等方式对齐文本。',
          severity: 'info'
        })
      }

      return issues
    }
  },
  // duplicate_colon_usage rule merged into duplicate_punctuation_sequence
  {
    id: 'duplicate_punctuation_sequence',
    name: '标点连续误用',
    category: '整体一致性',
    severity: 'warning',
    description: '检查明显不可能连续出现的标点组合，降低误判',
    checkFunction: (content) => {
      const issues: ReviewIssue[] = []
      const paragraphs = ensureArray(content.paragraphs)
      const illegalPairs = new Set([
        '，，', '、、', '。。', '：：', '；；', '！！', '？？',
        '，。', '。，', '，；', '；，', '，：', '：，', '，？', '？，', '，！', '！，',
        '。：', '：。', '。；', '；。', '。？', '？。', '。！', '！。'
      ])

      paragraphs.forEach((paragraph, index) => {
        const normalized = paragraph.replace(/\s+/g, '')

        for (let i = 0; i < normalized.length - 1; i++) {
          const pair = normalized.slice(i, i + 2)
          if (illegalPairs.has(pair)) {
            issues.push({
              problem: `检测到不规范的连续标点“${pair}”`,
              location: getParagraphLocation(index),
              solution: '请检查该处标点，通常应保留一个或调整为规范组合。',
              severity: 'warning'
            })
            break
          }
        }
      })

      return issues
    }
  },
  {
    id: 'sales_statement_contradiction',
    name: '销售事实自相矛盾',
    category: '整体一致性',
    severity: 'critical',
    description: '检查同一段落内是否同时存在“已销售/出售”与“未销售”等相反表述',
    checkFunction: (content) => {
      const issues: ReviewIssue[] = []
      const paragraphs = ensureArray(content.paragraphs)

      paragraphs.forEach((paragraph, index) => {
        const normalized = paragraph.replace(/\s+/g, '')
        const positiveMatches = normalized.match(/(?:已)?(?:销售|售出|出售)[^，。；\n]{0,30}/g) || []
        const negativeMatches = normalized.match(/未(?:曾)?(?:销售|售出|出售)[^，。；\n]{0,30}/g) || []

        if (positiveMatches.length === 0 || negativeMatches.length === 0) {
          return
        }

        const positiveExample = positiveMatches[0]
        const negativeExample = negativeMatches[0]
        const snippetStart = Math.max(0, normalized.indexOf(positiveExample) - 10)
        const snippetEnd = normalized.indexOf(negativeExample) + negativeExample.length + 10
        const contextSnippet = normalized.slice(snippetStart, snippetEnd)

        issues.push({
          problem: `同一段内检测到相反销售结论：例如“${positiveExample}”与“${negativeExample}”`,
          location: `${getParagraphLocation(index)} · 上下文：…${contextSnippet}…`,
          solution: '请核对销售事实，将不同时间段或状态拆分表述，确保同一段落内结论一致。',
          severity: 'critical'
        })
      })

      return issues
    }
  },
  {
    id: 'bottle_quantity_inconsistency',
    name: '瓶数描述一致性',
    category: '整体一致性',
    severity: 'warning',
    description: '检查“共×瓶”与“上述×瓶”等总结性语句的数量是否前后一致',
    checkFunction: (content) => {
      const issues: ReviewIssue[] = []
      const text = content.text
      const totalMatches = Array.from(text.matchAll(/共[^。；\n]{0,20}?(\d+)[^。；\n]{0,3}?瓶/g))
      const summaryMatches = Array.from(text.matchAll(/(?:上述|综上|本次|该批)[^。；\n]{0,20}?(\d+)[^。；\n]{0,3}?瓶/g))

      if (totalMatches.length === 0 || summaryMatches.length === 0) {
        return issues
      }

      const totalNumbers = new Set(totalMatches.map(match => match[1]))
      const summaryNumbers = new Set(summaryMatches.map(match => match[1]))
      const combinedNumbers = new Set([...totalNumbers, ...summaryNumbers])
      const mismatchedSummaries = summaryMatches.filter(match => !totalNumbers.has(match[1]))

      if (combinedNumbers.size > 1 && mismatchedSummaries.length > 0) {
        mismatchedSummaries.forEach(match => {
          const index = typeof match.index === 'number' ? match.index : text.indexOf(match[0])
          issues.push({
            problem: `总结语句中的“${match[1]}瓶”与前文“共计”数量不一致`,
            location: getContextSnippet(text, index),
            solution: '请核对各段落的瓶数描述，保持“共计”“上述”等表述口径一致。',
            severity: 'warning'
          })
        })
      }

      return issues
    }
  },
  {
    id: 'date_format_consistency',
    name: '日期格式统一',
    category: '整体一致性',
    severity: 'info',
    description: '检查文中日期格式是否混用“YYYY年MM月DD日”和“YYYY-MM-DD”等形式',
    checkFunction: (content) => {
      const issues: ReviewIssue[] = []
      const chineseDates = content.text.match(DATE_PATTERN) || []
      const westernDates = content.text.match(ALT_DATE_PATTERN) || []

      if (chineseDates.length > 0 && westernDates.length > 0) {
        issues.push({
          problem: '文中日期格式不统一，混用“YYYY年MM月DD日”和“YYYY-08-01”等格式',
          location: '全文',
          solution: '统一日期格式，建议使用“YYYY年MM月DD日”',
          severity: 'info'
        })
      }

      return issues
    }
  },
  {
    id: 'informal_language',
    name: '语言表述规范性',
    category: '整体一致性',
    severity: 'info',
    description: '检查是否存在口语化或模糊表述',
    checkFunction: (content) => {
      const issues: ReviewIssue[] = []
      const informalWords = ['很', '比较', '可能', '差不多', '挺', '特别', '估计', '大约', '左右', '基本上', '通常']
      const found = informalWords.filter(word => content.text.includes(word))

      if (found.length > 0) {
        issues.push({
          problem: `文中出现口语化或模糊词语：${found.join('、')}`,
          location: '全文',
          solution: '替换为准确、规范的法律用语，避免口语化描述',
          severity: 'info'
        })
      }

      return issues
    }
  }
]

const ALL_RULE_GROUPS = {
  formatCheck: FORMAT_CHECK_RULES,
  titleSection: TITLE_SECTION_RULES,
  documentNumber: DOCUMENT_NUMBER_RULES,
  mainContent: MAIN_CONTENT_RULES,
  fulfillment: FULFILLMENT_AND_RIGHTS_RULES,
  signature: SIGNATURE_SECTION_RULES,
  fixedContent: FIXED_CONTENT_RULES,
  consistency: CONSISTENCY_RULES
}

const ALL_RULES_ORDERED: PenaltyReviewRule[] = [
  ...FORMAT_CHECK_RULES,
  ...TITLE_SECTION_RULES,
  ...DOCUMENT_NUMBER_RULES,
  ...MAIN_CONTENT_RULES,
  ...FULFILLMENT_AND_RIGHTS_RULES,
  ...SIGNATURE_SECTION_RULES,
  ...FIXED_CONTENT_RULES,
  ...CONSISTENCY_RULES
]

const SIMPLIFIED_RULE_IDS = [
  'format_title_presence',
  'format_content_length',
  'title_keyword_check',
  'document_number_presence',
  'party_information_completeness',
  'violation_facts_specificity',
  'remedy_notice',
  'decision_date'
]

export const SIMPLIFIED_REVIEW_RULES: SimplifiedReviewRule[] = SIMPLIFIED_RULE_IDS.map(ruleId => {
  const rule = ALL_RULES_ORDERED.find(item => item.id === ruleId)
  if (!rule) {
    throw new Error(`Simplified rule id "${ruleId}" does not match any defined review rule`)
  }

  return {
    id: rule.id,
    name: rule.name,
    checkFunction: rule.checkFunction
  }
})

/**
 * 执行简化审查并格式化输出
 */
export function executeSimplifiedReview(content: DocumentContent, structure: DocumentStructure): string {
  const issues: ReviewIssue[] = []
  SIMPLIFIED_REVIEW_RULES.forEach(rule => {
    issues.push(...rule.checkFunction(content, structure))
  })
  return formatReviewResults(issues)
}

/**
 * 格式化审查结果，仅包含问题、位置、修改意见
 */
export function formatReviewResults(issues: ReviewIssue[]): string {
  if (issues.length === 0) {
    return '审查通过，未发现问题。'
  }

  let output = `发现 ${issues.length} 个问题：\n\n`
  issues.forEach((issue, index) => {
    const severityLabel = issue.severity === 'critical'
      ? '【严重】'
      : issue.severity === 'warning'
        ? '【警告】'
        : '【提示】'

    output += `${index + 1}. ${severityLabel} ${issue.problem}\n`
    output += `   位置：${issue.location}\n`
    output += `   修改：${issue.solution}\n\n`
  })

  return output.trim()
}

/**
 * 获取全部规则（按审查流程顺序）
 */
export function getAllReviewRules(): PenaltyReviewRule[] {
  return ALL_RULES_ORDERED
}

export function getRulesBySeverity(severity: 'critical' | 'warning' | 'info'): PenaltyReviewRule[] {
  return ALL_RULES_ORDERED.filter(rule => rule.severity === severity)
}

export function getRulesByCategory(category: ReviewSectionCategory): PenaltyReviewRule[] {
  return ALL_RULES_ORDERED.filter(rule => rule.category === category)
}

export function getStructuredReviewRules() {
  return ALL_RULE_GROUPS
}

export function getReviewProcessDescription() {
  return [
    { step: 1, title: '文书格式检查', focus: ['标题存在性', '内容完整性', '基本结构要素'] },
    { step: 2, title: '标题部分', focus: ['两行结构', '机关名称规范', '标题表述标准'] },
    { step: 3, title: '文号部分', focus: ['案件文号存在', '括号及方括号格式'] },
    { step: 4, title: '正文部分', focus: ['当事人信息完整', '违法事实具体', '证据与法律依据'] },
    { step: 5, title: '履行与权利告知', focus: ['履行期限', '缴款方式', '复议诉讼权利'] },
    { step: 6, title: '落款部分', focus: ['机关名称', '盖章位置', '作出日期'] },
    { step: 7, title: '固定内容比对', focus: ['行政复议固定语', '行政诉讼固定语', '逾期后果告知'] },
    { step: 8, title: '整体一致性', focus: ['要素前后一致', '金额一致', '书名号成对', '编号与措辞规范'] }
  ]
}
