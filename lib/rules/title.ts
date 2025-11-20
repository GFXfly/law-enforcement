import { PenaltyReviewRule, ReviewIssue } from './types'
import { ensureArray } from './utils'

/**
 * 第二步：标题部分检查
 */
export const TITLE_SECTION_RULES: PenaltyReviewRule[] = [
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
