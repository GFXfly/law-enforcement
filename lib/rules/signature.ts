import { PenaltyReviewRule, ReviewIssue } from './types'
import { ensureArray, getTailParagraphText, normalizeText } from './utils'
import { DATE_PATTERN } from '../constants'

/**
 * 第六步：落款部分检查
 */
export const SIGNATURE_SECTION_RULES: PenaltyReviewRule[] = [
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
