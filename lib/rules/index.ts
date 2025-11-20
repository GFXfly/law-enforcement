import { PenaltyReviewRule, ReviewIssue, SimplifiedReviewRule, ReviewSectionCategory } from './types'
import { DocumentContent, DocumentStructure } from '../document-processor'

import { FORMAT_CHECK_RULES } from './format'
import { TITLE_SECTION_RULES } from './title'
import { DOCUMENT_NUMBER_RULES } from './document-number'
import { MAIN_CONTENT_RULES } from './main-content'
import { FULFILLMENT_AND_RIGHTS_RULES } from './fulfillment'
import { SIGNATURE_SECTION_RULES } from './signature'
import { FIXED_CONTENT_RULES, CONSISTENCY_RULES } from './consistency'

// Re-export types and utils
export * from './types'
export * from './utils'

// Aggregate all rules
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
        // Fallback or warning if rule not found (should not happen if IDs match)
        console.warn(`Simplified rule id "${ruleId}" does not match any defined review rule`)
        return {
            id: ruleId,
            name: '未知规则',
            checkFunction: () => []
        }
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
