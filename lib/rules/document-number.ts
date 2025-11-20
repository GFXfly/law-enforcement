import { PenaltyReviewRule, ReviewIssue } from './types'
import { ensureArray, normalizeText } from './utils'
import { CASE_NUMBER_PATTERN, CASE_NUMBER_PATTERN_NORMALIZED, DOCUMENT_NUMBER_LINE_REGEX } from '../constants'

/**
 * 第三步：文号部分检查
 */
export const DOCUMENT_NUMBER_RULES: PenaltyReviewRule[] = [
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
