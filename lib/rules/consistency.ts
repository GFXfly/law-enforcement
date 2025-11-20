import { PenaltyReviewRule, ReviewIssue } from './types'
import {
    ensureArray,
    analyzeRemedySection,
    normalizeText,
    getParagraphLocation,
    getContextSnippet,
    formatSpaceIssue
} from './utils'
import {
    MULTIPLE_SPACE_PATTERN,
    LABEL_PREFIX_REGEX,
    DATE_PATTERN,
    ALT_DATE_PATTERN
} from '../constants'

/**
 * 第七步：固定内容比对（第九、第十部分）
 */
export const FIXED_CONTENT_RULES: PenaltyReviewRule[] = [
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
export const CONSISTENCY_RULES: PenaltyReviewRule[] = [
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
                .filter((name: string | null): name is string => Boolean(name))

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
            stack.forEach((item: any) => {
                unmatchedOpenings.push(item)
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
    {
        id: 'duplicate_punctuation_sequence',
        name: '标点连续误用',
        category: '整体一致性',
        severity: 'warning',
        description: '检查明显不可能连续出现的标点组合，降低误判',
        checkFunction: (content) => {
            const issues: ReviewIssue[] = []
            const paragraphs = ensureArray(content.paragraphs)

            // 只检测最明显的错误标点重复，移除可能有合理使用场景的组合
            const illegalPairs = new Set([
                '，，', '。。', '：：', '；；',
                '，。', '。，'
            ])

            const foundIssues = new Set<string>()  // 用于去重，避免同一问题重复报告

            paragraphs.forEach((paragraph, index) => {
                const normalized = paragraph.replace(/\s+/g, '')

                for (let i = 0; i < normalized.length - 1; i++) {
                    const pair = normalized.slice(i, i + 2)
                    if (illegalPairs.has(pair)) {
                        const issueKey = `${pair}_${getParagraphLocation(index)}`
                        if (!foundIssues.has(issueKey)) {
                            foundIssues.add(issueKey)
                            issues.push({
                                problem: `检测到不规范的连续标点"${pair}"`,
                                location: getParagraphLocation(index),
                                solution: '请检查该处标点，通常应保留一个或调整为规范组合。',
                                severity: 'info'  // 降低为提示级别
                            })
                        }
                        break  // 每个段落只报告一次
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

                const positiveExample = positiveMatches[0] || ''
                const negativeExample = negativeMatches[0] || ''
                const snippetStart = Math.max(0, normalized.indexOf(positiveExample) - 10)
                const snippetEnd = normalized.indexOf(negativeExample) + (negativeExample?.length || 0) + 10
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

            const totalNumbers = new Set(totalMatches.map(match => match[1]))
            const summaryNumbers = new Set(summaryMatches.map((match: RegExpMatchArray) => match[1]))
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
