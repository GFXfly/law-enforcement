import { PenaltyReviewRule, ReviewIssue } from './types'
import { FormatChecker } from '../word-format-parser'

function ensureArray<T>(value: T[] | undefined): T[] {
    return Array.isArray(value) ? value : []
}

/**
 * 第一步：文书格式检查
 */
export const FORMAT_CHECK_RULES: PenaltyReviewRule[] = [
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
        description: '检查正文段落是否保持首行缩进两个字符（标准：18-24pt或0.63-0.84cm）',
        checkFunction: (content) => {
            const issues: ReviewIssue[] = []

            // 优先使用精确的Word格式信息
            if (content.formatInfo?.paragraphs) {
                const formatParagraphs = content.formatInfo.paragraphs
                const missingIndentParagraphs: Array<{ index: number; actualIndent: string }> = []
                const insufficientIndentParagraphs: Array<{ index: number; actualIndent: string }> = []

                formatParagraphs.forEach((para) => {
                    // 跳过前3段（标题和文号）
                    if (para.index < 3) return

                    // 跳过过短的段落
                    if (para.text.trim().length < 10) return

                    // 排除列表项、编号段落
                    const trimmed = para.text.trim()
                    const isListHeading = /^[（(]?[一二三四五六七八九十0-9]+[、.．）)]/.test(trimmed) ||
                        /^第[一二三四五六七八九十百]+[章节条款]/.test(trimmed)
                    if (isListHeading) return

                    // 排除标签型段落
                    if (/^[\u4e00-\u9fa5（）()]{1,15}[：:]/.test(trimmed)) {
                        return
                    }

                    // 使用精确的格式检查器
                    const indent = para.indentation.firstLine || 0
                    const indentStr = FormatChecker.formatIndent(indent)

                    if (!FormatChecker.hasValidIndent(para)) {
                        if (FormatChecker.hasPartialIndent(para)) {
                            insufficientIndentParagraphs.push({
                                index: para.index,
                                actualIndent: indentStr
                            })
                        } else {
                            missingIndentParagraphs.push({
                                index: para.index,
                                actualIndent: indent > 0 ? indentStr : '无缩进'
                            })
                        }
                    }
                })

                // 完全缺失缩进
                if (missingIndentParagraphs.length > 0) {
                    const locations = missingIndentParagraphs.slice(0, 8).map(p => `第${p.index + 1}段(${p.actualIndent})`).join('、')
                    const suffix = missingIndentParagraphs.length > 8 ? `等共${missingIndentParagraphs.length}段` : ''

                    issues.push({
                        problem: `以下段落首行缩进不符合标准（应为18-24pt）：${locations}${suffix}`,
                        location: '正文段落',
                        solution: '请在Word中设置首行缩进为2字符（约21pt或0.74cm），或在段首添加两个全角空格',
                        severity: 'warning'
                    })
                }

                // 缩进不足
                if (insufficientIndentParagraphs.length > 0) {
                    const locations = insufficientIndentParagraphs.slice(0, 8).map(p => `第${p.index + 1}段(${p.actualIndent})`).join('、')
                    const suffix = insufficientIndentParagraphs.length > 8 ? `等共${insufficientIndentParagraphs.length}段` : ''

                    issues.push({
                        problem: `以下段落首行缩进不足2字符：${locations}${suffix}`,
                        location: '正文段落',
                        solution: '请调整缩进至标准的2字符（约21pt或0.74cm）',
                        severity: 'info'
                    })
                }
            } else {
                // 降级方案：使用基础文本检查（当Word格式解析失败时）
                issues.push({
                    problem: '无法精确检测段落缩进格式（Word格式解析失败）',
                    location: '全文',
                    solution: '请手动检查所有正文段落是否设置了首行缩进2字符（约21pt或0.74cm）',
                    severity: 'info'
                })
            }

            return issues
        }
    },
    {
        id: 'paragraph_line_spacing',
        name: '段落行间距规范',
        category: '文书格式检查',
        severity: 'warning',
        description: '检查段落行间距是否符合公文格式要求（固定值28磅或1.5倍行距）',
        checkFunction: (content) => {
            const issues: ReviewIssue[] = []

            // 优先使用精确的Word格式信息
            if (content.formatInfo?.paragraphs) {
                const formatParagraphs = content.formatInfo.paragraphs
                const problemParagraphs: Array<{ index: number; actualSpacing: string }> = []
                let checkedCount = 0

                formatParagraphs.forEach((para) => {
                    // 跳过前3段和过短段落
                    if (para.index < 3) return
                    if (para.text.trim().length < 10) return

                    checkedCount++

                    // 使用精确的格式检查器
                    if (!FormatChecker.hasValidLineSpacing(para)) {
                        problemParagraphs.push({
                            index: para.index,
                            actualSpacing: FormatChecker.formatLineSpacing(para)
                        })
                    }
                })

                // 如果超过30%的段落不符合行距要求，则报告
                if (checkedCount > 0 && problemParagraphs.length > 0 &&
                    problemParagraphs.length / checkedCount > 0.3) {
                    const locations = problemParagraphs.slice(0, 5).map(p => `第${p.index + 1}段(${p.actualSpacing})`).join('、')
                    const suffix = problemParagraphs.length > 5 ? `等共${problemParagraphs.length}段` : ''

                    issues.push({
                        problem: `多个段落行间距不符合公文格式标准：${locations}${suffix}`,
                        location: '正文段落',
                        solution: '请在Word中选中正文段落，设置行距为"固定值28磅"或"1.5倍行距"',
                        severity: 'warning'
                    })
                }
            } else {
                // 降级方案：提示无法检测
                issues.push({
                    problem: '无法精确检测段落行间距格式（Word格式解析失败）',
                    location: '全文',
                    solution: '请手动检查所有正文段落行距是否设置为"固定值28磅"或"1.5倍行距"',
                    severity: 'info'
                })
            }

            return issues
        }
    }
]
