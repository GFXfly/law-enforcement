import { DocumentContent } from '../document-processor'
import {
    DATE_PATTERN,
    UNIT_KEYWORDS_REGEX,
    HEARING_THRESHOLD
} from '../constants'

export function ensureArray<T>(value: T[] | undefined): T[] {
    return Array.isArray(value) ? value : []
}

export function normalizeText(text: string): string {
    return text.replace(/\s+/g, '')
}

export function getParagraphLocation(index: number): string {
    return `第${index + 1}段`
}

export function getContextSnippet(text: string, index: number, radius = 20): string {
    const start = Math.max(0, index - radius)
    const end = Math.min(text.length, index + radius)
    const snippet = text.slice(start, end).replace(/\s+/g, '')
    return snippet.length > 0 ? `…${snippet}…` : '相关段落'
}

export function getTailParagraphText(content: DocumentContent, count = 3): string {
    const paragraphs = ensureArray(content.paragraphs)
    if (paragraphs.length === 0) {
        return content.text
    }
    return paragraphs.slice(-count).join('')
}

export function splitSentences(normalizedText: string): string[] {
    return normalizedText
        .split(/[。；;!?？！]/)
        .map(sentence => sentence.trim())
        .filter(sentence => sentence.length > 0)
}

export function containsArticleLocator(text: string): boolean {
    return /第[零〇一二三四五六七八九十百千万亿两壹贰叁肆伍陆柒捌玖拾佰仟萬\d]+(条|款|项)/.test(text)
}

/**
 * 提取罚款金额（元）
 * 支持多种格式：罚款300元、处罚款人民币300元、罚款3000.00元等
 */
export function extractFineAmount(text: string): number | null {
    const normalized = normalizeText(text)

    // 匹配各种罚款表述
    const patterns = [
        /(?:罚款|处罚款|处以罚款|并处罚款|罚金)(?:人民币)?[^\d]*?(\d+(?:[,，]\d{3})*(?:\.\d{1,2})?)\s*元/g,
        /(?:罚款|处罚款|处以罚款|并处罚款|罚金)[^\d]*?(\d+(?:[,，]\d{3})*(?:\.\d{1,2})?)[^\d]*?(?:元|圆)/g,
    ]

    let maxAmount = 0
    let found = false

    for (const pattern of patterns) {
        let match
        while ((match = pattern.exec(normalized)) !== null) {
            const amountStr = match[1].replace(/[,，]/g, '')
            const amount = parseFloat(amountStr)
            if (!isNaN(amount) && amount > maxAmount) {
                maxAmount = amount
                found = true
            }
        }
    }

    return found ? maxAmount : null
}

/**
 * 判断当事人类型
 */
export function getPartyType(content: DocumentContent): 'individual' | 'unit' | 'unknown' {
    const text = content.text
    const normalized = normalizeText(text)

    // 查找当事人部分
    const partyMatch = normalized.match(/当事人[：:]([\s\S]{0,200})/)
    if (!partyMatch) return 'unknown'

    const partySection = partyMatch[1]

    // 如果包含单位关键词，判定为单位
    if (UNIT_KEYWORDS_REGEX.test(partySection)) {
        return 'unit'
    }

    // 如果包含身份证号但不包含法定代表人/负责人，判定为个人
    if (/身份证(?:号码?|号|证号)[：:]?\d{15,18}/.test(partySection) &&
        !/法定代表人|负责人|经营者/.test(partySection)) {
        return 'individual'
    }

    // 默认返回未知
    return 'unknown'
}

/**
 * 检查是否需要听证权利告知
 */
export function checkHearingRightRequired(content: DocumentContent): {
    required: boolean
    partyType: 'individual' | 'unit' | 'unknown'
    fineAmount: number | null
    threshold: number | null
    reason: string
} {
    const partyType = getPartyType(content)
    const fineAmount = extractFineAmount(content.text)

    if (!fineAmount) {
        return {
            required: false,
            partyType,
            fineAmount: null,
            threshold: null,
            reason: '未检测到明确的罚款金额'
        }
    }

    // 个人：1万元以上需要听证
    if (partyType === 'individual') {
        const threshold = HEARING_THRESHOLD.INDIVIDUAL
        const required = fineAmount >= threshold
        return {
            required,
            partyType,
            fineAmount,
            threshold,
            reason: required
                ? `个人罚款${fineAmount}元，达到${threshold}元听证标准`
                : `个人罚款${fineAmount}元，未达到${threshold}元听证标准`
        }
    }

    // 单位：10万元以上需要听证
    if (partyType === 'unit') {
        const threshold = HEARING_THRESHOLD.UNIT
        const required = fineAmount >= threshold
        return {
            required,
            partyType,
            fineAmount,
            threshold,
            reason: required
                ? `单位罚款${fineAmount}元，达到${threshold}元听证标准`
                : `单位罚款${fineAmount}元，未达到${threshold}元听证标准`
        }
    }

    // 类型未知时，使用保守策略（较低标准）
    const threshold = HEARING_THRESHOLD.INDIVIDUAL
    const required = fineAmount >= threshold
    return {
        required,
        partyType,
        fineAmount,
        threshold,
        reason: required
            ? `罚款${fineAmount}元，当事人类型未明确识别，建议按个人标准${threshold}元进行听证告知`
            : `罚款${fineAmount}元，未达到最低听证标准${threshold}元`
    }
}

export function formatSpaceIssue(paragraph: string, match: RegExpMatchArray, index: number): string {
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

export function convertCssLengthToPx(value: number, unit: string): number {
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

export function getHtmlParagraphs(html: string): string[] {
    const matches = html.match(/<p[^>]*>[\s\S]*?<\/p>/gi)
    return matches ? matches : []
}

export function htmlHasIndentation(htmlParagraph: string): boolean {
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

export function isUnitParty(text: string): boolean {
    return UNIT_KEYWORDS_REGEX.test(text)
}

export interface RemedyAnalysis {
    review: {
        present: boolean
        templateLike: boolean
    }
    litigation: {
        present: boolean
        templateLike: boolean
    }
}

export function analyzeRemedySection(content: DocumentContent): RemedyAnalysis {
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
