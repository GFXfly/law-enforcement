import { PenaltyReviewRule, ReviewIssue } from './types'
import { checkHearingRightRequired, analyzeRemedySection } from './utils'

/**
 * 第五步：履行与权利告知
 */
export const FULFILLMENT_AND_RIGHTS_RULES: PenaltyReviewRule[] = [
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
                    solution: '补充表述"你单位已享有陈述申辩权利"或说明是否放弃',
                    severity: 'warning'
                })
            }

            // 使用新的听证权利检查函数
            const hearingCheck = checkHearingRightRequired(content)

            if (hearingCheck.required) {
                const hasHearingNotice = /(听证|听证权)/.test(text)

                if (!hasHearingNotice) {
                    const partyTypeText = hearingCheck.partyType === 'individual' ? '个人' :
                        hearingCheck.partyType === 'unit' ? '单位' : '当事人'

                    issues.push({
                        problem: `${partyTypeText}罚款${hearingCheck.fineAmount}元，达到听证标准（${hearingCheck.threshold}元），但未告知听证权利`,
                        location: '权利告知部分',
                        solution: `根据《行政处罚法》规定，${hearingCheck.reason}，应告知当事人享有听证权利，并说明应在收到行政处罚事先告知书之日起三日内提出听证申请`,
                        severity: 'critical'
                    })
                } else {
                    // 检查是否明确告知了听证申请期限
                    const hasDeadline = /(?:收到.*?告知.*?之日起|自收到.*?告知.*?之日起).*?(?:三|3).*?(?:日|天).*?(?:内|之内).*?(?:提出|申请).*?听证/.test(text) ||
                        /(?:提出|申请).*?听证.*?(?:收到.*?告知.*?之日起|自收到.*?告知.*?之日起).*?(?:三|3).*?(?:日|天)/.test(text)

                    if (!hasDeadline) {
                        issues.push({
                            problem: '已告知听证权利，但未明确说明听证申请期限',
                            location: '听证权利告知部分',
                            solution: '应明确告知"当事人有权在收到本告知书之日起三日内向本机关提出听证申请"',
                            severity: 'warning'
                        })
                    }
                }
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

            // 只有两个都缺失时才报critical，单独缺一个降低严重程度
            if (missing.length === 2) {
                issues.push({
                    problem: `未检测到行政复议和行政诉讼救济途径的完整表述`,
                    location: '救济途径告知部分',
                    solution: '补充"如不服本决定，可以在收到本决定书之日起六十日内向××申请行政复议；也可以在收到本决定书之日起六个月内直接向人民法院提起行政诉讼"',
                    severity: 'critical'
                })
            } else if (missing.length === 1) {
                const component = missing[0]
                let solution = ''

                if (!remedy.review.present) {
                    solution = '补充"如不服本决定，可以在收到本决定书之日起六十日内向××申请行政复议"'
                } else {
                    solution = '补充"也可以在收到本决定书之日起六个月内直接向人民法院提起行政诉讼"'
                }

                issues.push({
                    problem: `未检测到${component}的完整表述`,
                    location: '救济途径告知部分',
                    solution,
                    severity: 'warning'  // 单独缺失一个降低为warning
                })
            }

            return issues
        }
    }
]
