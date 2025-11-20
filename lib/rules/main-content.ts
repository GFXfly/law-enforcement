import { PenaltyReviewRule, ReviewIssue } from './types'
import { ensureArray, isUnitParty, containsArticleLocator, normalizeText } from './utils'
import { DATE_PATTERN, ALT_DATE_PATTERN } from '../constants'

/**
 * 第四步：正文部分检查
 */
export const MAIN_CONTENT_RULES: PenaltyReviewRule[] = [
    {
        id: 'party_information_completeness',
        name: '当事人信息完整性',
        category: '正文部分',
        severity: 'warning',
        description: '检查当事人基本信息是否包含关键要素（身份证/统一社会信用代码）',
        checkFunction: (content) => {
            const issues: ReviewIssue[] = []
            const text = content.text
            // 扩大检查范围，前1000字符
            const partySection = text.slice(0, Math.min(1000, text.length))

            // 判断当事人类型（优先检查全文，避免误判）
            const hasCompany = isUnitParty(text)

            // 优化身份证号检查：支持空格、换行等格式
            const idRegex = /(身份证|居民身份证|身份证号|身份证号码|公民身份号码|证件号|证件号码)[\s（(]*[^：:]*[）)]*\s*[：:]\s*[0-9X\s]{15,20}/i
            const creditRegex = /(统一社会信用代码|社会信用代码|信用代码|组织机构代码|营业执照号|注册号)[\s（(]*[^：:]*[）)]*\s*[：:]\s*[0-9A-Z\-\s]{8,}/i

            const hasIdInfo = idRegex.test(partySection)
            const hasCreditInfo = creditRegex.test(partySection)

            // 单位当事人
            if (hasCompany) {
                if (!hasCreditInfo) {
                    issues.push({
                        problem: '单位当事人未提供统一社会信用代码或组织机构代码',
                        location: '当事人基本信息段',
                        solution: '补充单位统一社会信用代码、组织机构代码等主体身份信息（如"统一社会信用代码：91330000XXXXXXXXXX"）',
                        severity: 'warning'
                    })
                }
            }
            // 个人当事人
            else {
                if (!hasIdInfo) {
                    issues.push({
                        problem: '个人当事人未提供身份证号码或有效证件号码',
                        location: '当事人基本信息段',
                        solution: '补充个人身份证号码或其他有效身份证明信息（如"身份证号码：330XXXXXXXXXXXXXXXXX"）',
                        severity: 'warning'
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

            const text = content.text
            // 扩大检查范围，前1000字符
            const partySection = text.slice(0, Math.min(1000, text.length))

            if (isUnitParty(text)) {
                if (!/(法定代表人|主要负责人|负责人|经理)[：:].{1,}/.test(partySection)) {
                    issues.push({
                        problem: '单位当事人未注明法定代表人或负责人',
                        location: '当事人信息段',
                        solution: '为单位当事人补充"法定代表人/负责人：××"等信息',
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

            const hasFactSection = /(违法事实|违法行为|经查|查明|案件来源|调查发现)/.test(text)

            if (!hasFactSection) {
                issues.push({
                    problem: '未明确设置违法事实认定段落',
                    location: '违法事实部分',
                    solution: '增加"违法事实：……"段落，说明调查情况及事实认定',
                    severity: 'critical'
                })
            }

            // 只有在有违法事实段落但缺少时间时才报错
            if (hasFactSection && !DATE_PATTERN.test(text) && !ALT_DATE_PATTERN.test(text)) {
                issues.push({
                    problem: '违法事实缺少明确的发生时间',
                    location: '违法事实部分',
                    solution: '补充违法行为发生的具体日期，例如"2025年5月10日"',
                    severity: 'warning'  // 降低严重程度
                })
            }

            // 扩展地点表述的识别模式
            const hasLocation = /(在.*?[进行|经营|销售|生产]|于.*?处|地点为|发生在|位于|营业场所|经营地址|经营场所|现场检查)/.test(text)
            if (hasFactSection && !hasLocation) {
                issues.push({
                    problem: '违法事实未说明具体地点',
                    location: '违法事实部分',
                    solution: '写明违法行为发生地点或经营场所，确保要素完整',
                    severity: 'info'  // 降低为提示级别
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

            // 扩展证据关键词，包含更多实际使用的表述
            const evidenceKeywords = text.match(/证据[一二三四五六七八九十0-9]|询问笔录|现场检查笔录|检查笔录|调查笔录|检测报告|检验报告|鉴定意见|票据|照片|凭证|扣押清单|证明材料|书证|物证|视听资料|电子数据/g)

            // 检查文书中是否提到证据或相关程序
            const hasEvidenceMention = /(有证据证明|经调查|经查|查明|调查取证|现场检查|抽样检验|送检|经审查)/.test(text)

            // 只有在明确提到证据流程但缺少具体证据时才报警告
            if (hasEvidenceMention && (!evidenceKeywords || evidenceKeywords.length < 2)) {
                issues.push({
                    problem: '未见对证据材料的逐项列举，难以支撑事实认定',
                    location: '证据说明部分',
                    solution: '以"证据一……证据二……"形式列出主要证据及证明目的',
                    severity: 'info'  // 降低为提示级别
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
