/**
 * 行政处罚决定书审查标准规则
 * 依据：《中华人民共和国行政处罚法》第四十四条
 */

import { DocumentContent, DocumentStructure } from './document-processor'

export interface PenaltyReviewRule {
  id: string
  name: string
  category: '必备要素' | '程序规范' | '格式要求' | '语言规范' | '救济途径'
  severity: 'critical' | 'warning' | 'info'
  description: string
  checkFunction: (content: DocumentContent, structure: DocumentStructure) => {
    passed: boolean
    issues: string[]
    suggestions: string[]
  }
}

/**
 * 行政处罚决定书必备要素检查（依据行政处罚法第44条）
 */
export const MANDATORY_ELEMENTS_RULES: PenaltyReviewRule[] = [
  {
    id: 'party_info',
    name: '当事人信息完整性',
    category: '必备要素',
    severity: 'critical',
    description: '检查当事人的姓名或者名称、地址等基本信息是否完整',
    checkFunction: (content, structure) => {
      const text = content.text
      const issues: string[] = []
      const suggestions: string[] = []

      // 检查姓名或名称
      const hasName = /当事人[：:]\s*[\u4e00-\u9fa5]{2,}|被处罚人[：:]\s*[\u4e00-\u9fa5]{2,}/.test(text) ||
                     /名\s*称[：:]\s*[\u4e00-\u9fa5]{3,}/.test(text)
      if (!hasName) {
        issues.push('未明确标识当事人姓名或名称')
        suggestions.push('应明确列出"当事人："或"被处罚人："及其完整姓名/名称')
      }

      // 检查地址信息
      const hasAddress = /地\s*址[：:]\s*[\u4e00-\u9fa5\d]{5,}|住\s*所[：:]\s*[\u4e00-\u9fa5\d]{5,}|住\s*址[：:]\s*[\u4e00-\u9fa5\d]{5,}/.test(text) ||
                        /经营场所[：:]\s*[\u4e00-\u9fa5\d]{5,}/.test(text)
      if (!hasAddress) {
        issues.push('未明确标识当事人地址信息')
        suggestions.push('应完整填写当事人住址、经营场所或通讯地址')
      }

      // 检查身份证号或统一社会信用代码
      const hasIdNumber = /身份证号[：:]\s*[0-9X]{18}|统一社会信用代码[：:]\s*[0-9A-Z]{18}|组织机构代码[：:]\s*[0-9A-Z-]{8,}/.test(text)
      if (!hasIdNumber) {
        issues.push('未提供当事人有效身份证明')
        suggestions.push('应提供身份证号码或统一社会信用代码等有效身份证明')
      }

      return {
        passed: issues.length === 0,
        issues,
        suggestions
      }
    }
  },

  {
    id: 'violation_facts',
    name: '违法事实认定',
    category: '必备要素',
    severity: 'critical',
    description: '检查违反法律、法规、规章的事实和证据是否明确具体',
    checkFunction: (content, structure) => {
      const text = content.text
      const issues: string[] = []
      const suggestions: string[] = []

      // 检查违法事实描述
      const hasViolationFacts = /违法事实[：:]|违法行为[：:]|经查[，,]|调查发现[，,]/.test(text)
      if (!hasViolationFacts) {
        issues.push('缺少违法事实认定部分')
        suggestions.push('应设置"违法事实"专门章节，详细描述违法行为')
      }

      // 检查时间要素
      const hasTimeElement = /\d{4}年\d{1,2}月\d{1,2}日|\d{4}-\d{1,2}-\d{1,2}|\d{4}\.\d{1,2}\.\d{1,2}/.test(text)
      if (!hasTimeElement) {
        issues.push('违法事实缺少具体时间')
        suggestions.push('应明确违法行为发生的具体时间')
      }

      // 检查地点要素
      const hasLocationElement = /在.*?地|于.*?处|位于.*?的/.test(text) ||
                                /地点[：:]\s*[\u4e00-\u9fa5\d]{3,}/.test(text)
      if (!hasLocationElement) {
        issues.push('违法事实缺少具体地点')
        suggestions.push('应明确违法行为发生的具体地点')
      }

      // 检查证据材料
      const hasEvidence = /证据材料|调取|现场检查|询问笔录|检验检测|勘验检查|先行登记保存/.test(text)
      if (!hasEvidence) {
        issues.push('未明确列举证据材料')
        suggestions.push('应列明支撑违法事实的具体证据材料')
      }

      return {
        passed: issues.length === 0,
        issues,
        suggestions
      }
    }
  },

  {
    id: 'legal_basis',
    name: '法律依据完整性',
    category: '必备要素',
    severity: 'critical',
    description: '检查行政处罚的种类和依据是否明确、准确、完整',
    checkFunction: (content, structure) => {
      const text = content.text
      const issues: string[] = []
      const suggestions: string[] = []

      // 检查违法依据
      const hasViolationBasis = /违反.*?法.*?条|违反.*?规定|违反.*?办法.*?条/.test(text)
      if (!hasViolationBasis) {
        issues.push('未明确违反的具体法律条款')
        suggestions.push('应明确引用被违反的法律法规具体条款')
      }

      // 检查处罚依据
      const hasPenaltyBasis = /依据.*?法.*?条|根据.*?规定|按照.*?法.*?条/.test(text)
      if (!hasPenaltyBasis) {
        issues.push('未明确处罚的法律依据')
        suggestions.push('应明确引用作出处罚决定的法律条款依据')
      }

      // 检查法条引用格式
      const legalReferences = text.match(/《[\u4e00-\u9fa5]{3,}》第\d+条|《[\u4e00-\u9fa5]{3,}》第\d+款|《[\u4e00-\u9fa5]{3,}》第\d+项/g)
      if (!legalReferences || legalReferences.length === 0) {
        issues.push('法条引用格式不规范')
        suggestions.push('法条引用应使用标准格式：《法律名称》第X条第X款第X项')
      }

      // 检查自由裁量权说明
      const hasDiscretionExplanation = /情节|综合考虑|酌情|从轻|从重/.test(text)
      if (!hasDiscretionExplanation && /罚款\d+元|处.*?罚款/.test(text)) {
        issues.push('未说明自由裁量权行使依据')
        suggestions.push('涉及自由裁量的应说明综合考虑因素和裁量理由')
      }

      return {
        passed: issues.length === 0,
        issues,
        suggestions
      }
    }
  },

  {
    id: 'penalty_decision',
    name: '处罚决定内容',
    category: '必备要素',
    severity: 'critical',
    description: '检查行政处罚的履行方式和期限是否明确',
    checkFunction: (content, structure) => {
      const text = content.text
      const issues: string[] = []
      const suggestions: string[] = []

      // 检查处罚决定表述
      const hasPenaltyDecision = /决定给予.*?处罚|决定对.*?进行.*?处罚|现决定|特决定/.test(text)
      if (!hasPenaltyDecision) {
        issues.push('缺少明确的处罚决定表述')
        suggestions.push('应使用"决定给予...处罚"等明确的决定性表述')
      }

      // 检查处罚种类
      const penaltyTypes = ['警告', '罚款', '没收', '责令停产停业', '暂扣', '吊销', '行政拘留']
      const foundPenaltyTypes = penaltyTypes.filter(type => text.includes(type))
      if (foundPenaltyTypes.length === 0) {
        issues.push('未明确处罚种类')
        suggestions.push('应明确具体的处罚种类（警告、罚款、没收等）')
      }

      // 检查履行期限（如果涉及罚款或其他需要履行的处罚）
      if (text.includes('罚款') || text.includes('没收') || text.includes('责令')) {
        const hasDeadline = /\d+日内|收到.*?决定书.*?\d+日内|自.*?之日起\d+日内/.test(text)
        if (!hasDeadline) {
          issues.push('未明确处罚履行期限')
          suggestions.push('应明确履行期限，通常为"收到决定书之日起十五日内"')
        }
      }

      // 检查履行方式
      if (text.includes('罚款')) {
        const hasPaymentMethod = /缴纳|银行|账户|缴款书|代收银行/.test(text)
        if (!hasPaymentMethod) {
          issues.push('未说明罚款缴纳方式')
          suggestions.push('应说明罚款具体缴纳方式和银行账户信息')
        }
      }

      return {
        passed: issues.length === 0,
        issues,
        suggestions
      }
    }
  }
]

/**
 * 程序规范检查规则
 */
export const PROCEDURAL_RULES: PenaltyReviewRule[] = [
  {
    id: 'remedy_rights',
    name: '救济途径告知',
    category: '救济途径',
    severity: 'critical',
    description: '检查申请行政复议、提起行政诉讼的途径和期限告知是否规范',
    checkFunction: (content, structure) => {
      const text = content.text
      const issues: string[] = []
      const suggestions: string[] = []

      // 检查复议权利告知
      const hasReconsiderationNotice = /行政复议|复议申请|复议权|不服.*?决定.*?可以/.test(text)
      if (!hasReconsiderationNotice) {
        issues.push('未告知行政复议权利')
        suggestions.push('应告知当事人申请行政复议的权利')
      }

      // 检查诉讼权利告知
      const hasLitigationNotice = /行政诉讼|提起诉讼|向人民法院|起诉权/.test(text)
      if (!hasLitigationNotice) {
        issues.push('未告知行政诉讼权利')
        suggestions.push('应告知当事人提起行政诉讼的权利')
      }

      // 检查复议期限
      const hasReconsiderationPeriod = /六十日内.*?复议|复议.*?六十日/.test(text)
      if (hasReconsiderationNotice && !hasReconsiderationPeriod) {
        issues.push('未明确行政复议期限')
        suggestions.push('应明确告知"自知道决定之日起六十日内申请行政复议"')
      }

      // 检查诉讼期限
      const hasLitigationPeriod = /六个月内.*?起诉|起诉.*?六个月/.test(text)
      if (hasLitigationNotice && !hasLitigationPeriod) {
        issues.push('未明确行政诉讼期限')
        suggestions.push('应明确告知"自知道决定之日起六个月内向人民法院提起诉讼"')
      }

      // 检查复议机关
      const hasReconsiderationAuthority = /复议机关|向.*?申请复议/.test(text)
      if (hasReconsiderationNotice && !hasReconsiderationAuthority) {
        issues.push('未明确复议机关')
        suggestions.push('应明确告知具体的复议机关名称')
      }

      return {
        passed: issues.length === 0,
        issues,
        suggestions
      }
    }
  },

  {
    id: 'authority_signature',
    name: '执法机关信息',
    category: '必备要素',
    severity: 'critical',
    description: '检查作出行政处罚决定的行政机关名称和作出决定的日期',
    checkFunction: (content, structure) => {
      const text = content.text
      const issues: string[] = []
      const suggestions: string[] = []

      // 检查机关名称
      const hasAuthorityName = /执法机关|处罚机关|\S+局|\S+委员会|\S+人民政府/.test(text) ||
                              /（盖章）|（公章）|（印）/.test(text)
      if (!hasAuthorityName) {
        issues.push('未明确执法机关名称')
        suggestions.push('应明确标注作出决定的行政机关全称')
      }

      // 检查决定日期
      const hasDecisionDate = /\d{4}年\d{1,2}月\d{1,2}日$/.test(text) ||
                             text.match(/\d{4}年\d{1,2}月\d{1,2}日\s*$/)
      if (!hasDecisionDate) {
        issues.push('未明确决定作出日期')
        suggestions.push('应在文书末尾标注作出决定的具体日期')
      }

      // 检查盖章位置标识
      const hasSealMark = /（盖章）|（公章）|（印章）/.test(text)
      if (!hasSealMark) {
        issues.push('未标识盖章位置')
        suggestions.push('应在机关名称下方标注"（盖章）"')
      }

      return {
        passed: issues.length === 0,
        issues,
        suggestions
      }
    }
  }
]

/**
 * 格式要求检查规则
 */
export const FORMAT_RULES: PenaltyReviewRule[] = [
  {
    id: 'document_title',
    name: '文书标题规范',
    category: '格式要求',
    severity: 'warning',
    description: '检查文书标题是否符合规范格式',
    checkFunction: (content, structure) => {
      const title = structure.title
      const issues: string[] = []
      const suggestions: string[] = []

      // 检查标题是否包含"行政处罚决定书"
      if (!title.includes('行政处罚决定书')) {
        issues.push('标题不规范')
        suggestions.push('标题应为"行政处罚决定书"')
      }

      // 检查是否有案件编号
      const hasCaseNumber = /\S+罚.*?\d+.*?号|\S+字.*?\d+.*?号/.test(content.text)
      if (!hasCaseNumber) {
        issues.push('缺少案件编号')
        suggestions.push('应在标题下方标注案件编号')
      }

      return {
        passed: issues.length === 0,
        issues,
        suggestions
      }
    }
  },

  {
    id: 'numbering_format',
    name: '编号格式规范',
    category: '格式要求',
    severity: 'warning',
    description: '检查案件编号是否符合规范格式，如：（杭临）市监处罚〔2024〕131号',
    checkFunction: (content, structure) => {
      const text = content.text
      const issues: string[] = []
      const suggestions: string[] = []

      // 查找所有可能的案件编号
      const caseNumberPatterns = [
        /[（(][^）)]{1,10}[）)][^〔［\[]*?[处罚决定][〔［\[\(][^〕］\]）)]*?[〕］\]\)][^号]*?号/g,
        /[（(][^）)]{1,10}[）)][^〔［\[]*?[字][〔［\[\(][^〕］\]）)]*?[〕］\]\)][^号]*?号/g
      ]

      let foundNumbers: string[] = []
      caseNumberPatterns.forEach(pattern => {
        const matches = text.match(pattern) || []
        foundNumbers = foundNumbers.concat(matches)
      })

      if (foundNumbers.length === 0) {
        // 如果没有找到标准格式，再用宽松模式查找
        const loosePattern = /\S+[处罚字决定][^\d]*?\d{4}[^\d]*?\d+号/g
        const looseMatches = text.match(loosePattern) || []

        if (looseMatches.length > 0) {
          looseMatches.forEach(number => {
            issues.push(`发现疑似编号但格式不规范：${number}`)
            suggestions.push('标准格式应为：（机关简称）处罚类型〔年份〕序号号，如：（杭临）市监处罚〔2024〕131号')
          })
        } else {
          issues.push('未发现符合规范的案件编号')
          suggestions.push('应包含标准格式的案件编号：（机关简称）处罚类型〔年份〕序号号')
        }
      } else {
        // 检查找到的编号格式是否正确
        foundNumbers.forEach(number => {
          // 检查是否使用了正确的括号
          if (/\([^)]+\)/.test(number) && !/（[^）]+）/.test(number)) {
            issues.push(`文号"${number}"中机关简称应使用中文括号（）而非英文括号()`)
            suggestions.push('机关简称应使用中文括号（）包围')
          }

          // 检查年份是否使用了正确的方括号
          if (/\([^)]*?\d{4}[^)]*?\)/.test(number) && !/〔[^〕]*?\d{4}[^〕]*?〕/.test(number)) {
            issues.push(`文号"${number}"中年份应使用方括号〔〕而非圆括号()`)
            suggestions.push('年份应使用方括号〔〕包围，如：〔2024〕')
          }

          // 检查是否包含必要的组成部分
          if (!/(处罚|决定|字)/.test(number)) {
            issues.push(`文号"${number}"缺少处罚类型标识`)
            suggestions.push('文号应包含"处罚"、"决定"或"字"等类型标识')
          }

          if (!/\d{4}/.test(number)) {
            issues.push(`文号"${number}"缺少年份信息`)
            suggestions.push('文号应包含四位数年份')
          }
        })
      }

      // 特别检查是否符合杭临市监的标准格式
      const hanglinPattern = /（杭临）市监处罚〔\d{4}〕\d+号/
      if (text.includes('杭临') && !hanglinPattern.test(text)) {
        const wrongPatterns = [
          /\(杭临\)市监处罚\(\d{4}\)\d+号/,
          /（杭临）市监处罚\(\d{4}\)\d+号/,
          /\(杭临\)市监处罚〔\d{4}〕\d+号/
        ]

        wrongPatterns.forEach(pattern => {
          const matches = text.match(pattern)
          if (matches) {
            issues.push(`杭临市监文号格式错误：${matches[0]}`)
            suggestions.push('杭临市监标准格式：（杭临）市监处罚〔年份〕序号号')
          }
        })
      }

      return {
        passed: issues.length === 0,
        issues,
        suggestions
      }
    }
  }
]

/**
 * 逻辑一致性检查规则
 */
export const LOGIC_CONSISTENCY_RULES: PenaltyReviewRule[] = [
  {
    id: 'fact_law_consistency',
    name: '事实认定与法律适用一致性',
    category: '必备要素',
    severity: 'critical',
    description: '检查违法事实认定与引用法条是否一致匹配',
    checkFunction: (content, structure) => {
      const text = content.text
      const issues: string[] = []
      const suggestions: string[] = []

      // 检查违法事实与法律条款的对应关系
      const factPatterns = [
        { fact: /销售.*?过期.*?食品|过期.*?食品.*?销售/i, law: /食品安全法/, category: '食品安全' },
        { fact: /无证.*?经营|未取得.*?许可/i, law: /行政许可法|许可证/i, category: '无证经营' },
        { fact: /虚假.*?宣传|误导.*?消费者/i, law: /广告法|消费者权益保护法/i, category: '虚假宣传' },
        { fact: /价格.*?欺诈|哄抬.*?价格/i, law: /价格法/i, category: '价格违法' }
      ]

      factPatterns.forEach(pattern => {
        const hasFact = pattern.fact.test(text)
        const hasMatchingLaw = pattern.law.test(text)

        if (hasFact && !hasMatchingLaw) {
          issues.push(`发现${pattern.category}相关违法事实，但未引用对应的法律条款`)
          suggestions.push(`涉及${pattern.category}的案件应引用相关法律法规作为处罚依据`)
        }
      })

      // 检查处罚幅度与违法程度是否匹配
      const severityIndicators = {
        light: /初次.*?违法|情节.*?轻微|主动.*?改正/i,
        severe: /严重.*?后果|多次.*?违法|拒不.*?改正|造成.*?损失/i
      }

      const penaltyAmounts = text.match(/罚款.*?(\d+(?:,\d+)*).*?元|(\d+(?:,\d+)*).*?元.*?罚款/g)
      if (penaltyAmounts && penaltyAmounts.length > 0) {
        const amounts = penaltyAmounts.map(match => {
          const num = match.replace(/[^\d]/g, '')
          return parseInt(num) || 0
        })

        const maxAmount = Math.max(...amounts)

        if (severityIndicators.light.test(text) && maxAmount > 50000) {
          issues.push('违法情节轻微但处罚金额较大，可能存在处罚过重问题')
          suggestions.push('情节轻微的违法行为应适当从轻处罚，确保处罚幅度与违法程度相匹配')
        }

        if (severityIndicators.severe.test(text) && maxAmount < 10000) {
          issues.push('违法情节严重但处罚金额较轻，可能存在处罚过轻问题')
          suggestions.push('严重违法行为应依法从重处罚，确保处罚力度与违法程度相匹配')
        }
      }

      return {
        passed: issues.length === 0,
        issues,
        suggestions
      }
    }
  },

  {
    id: 'time_logic_consistency',
    name: '时间逻辑一致性',
    category: '必备要素',
    severity: 'warning',
    description: '检查文书中各个时间点的逻辑合理性',
    checkFunction: (content, structure) => {
      const text = content.text
      const issues: string[] = []
      const suggestions: string[] = []

      // 提取所有日期
      const dateMatches = text.match(/\d{4}年\d{1,2}月\d{1,2}日/g) || []
      const dates = dateMatches.map(dateStr => {
        const match = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)
        if (match) {
          const year = parseInt(match[1])
          const month = parseInt(match[2]) - 1 // JavaScript月份从0开始
          const day = parseInt(match[3])
          return { dateStr, date: new Date(year, month, day) }
        }
        return null
      }).filter(Boolean) as Array<{dateStr: string, date: Date}>

      if (dates.length >= 2) {
        // 检查违法时间是否在决定时间之前
        const violationKeywords = ['违法', '实施', '发生']
        const decisionKeywords = ['决定', '作出']

        for (let i = 0; i < dates.length - 1; i++) {
          for (let j = i + 1; j < dates.length; j++) {
            const date1 = dates[i]
            const date2 = dates[j]

            // 查找日期前后的文本以判断日期性质
            const date1Index = text.indexOf(date1.dateStr)
            const date2Index = text.indexOf(date2.dateStr)

            const date1Context = text.substring(Math.max(0, date1Index - 50), date1Index + date1.dateStr.length + 50)
            const date2Context = text.substring(Math.max(0, date2Index - 50), date2Index + date2.dateStr.length + 50)

            const isDate1Violation = violationKeywords.some(keyword => date1Context.includes(keyword))
            const isDate2Decision = decisionKeywords.some(keyword => date2Context.includes(keyword))

            if (isDate1Violation && isDate2Decision && date1.date >= date2.date) {
              issues.push(`违法行为时间(${date1.dateStr})不应晚于或等于处罚决定时间(${date2.dateStr})`)
              suggestions.push('违法行为发生时间应早于处罚决定作出时间，请核实时间逻辑')
            }
          }
        }

        // 检查时间是否过于久远
        const currentYear = new Date().getFullYear()
        dates.forEach(({dateStr, date}) => {
          if (currentYear - date.getFullYear() > 5) {
            issues.push(`发现较早的时间${dateStr}，请确认是否为笔误`)
            suggestions.push('请核实文书中的时间信息，确保时间准确无误')
          }
        })
      }

      return {
        passed: issues.length === 0,
        issues,
        suggestions
      }
    }
  },

  {
    id: 'content_consistency',
    name: '内容前后一致性',
    category: '必备要素',
    severity: 'warning',
    description: '检查文书内容前后表述的一致性',
    checkFunction: (content, structure) => {
      const text = content.text
      const issues: string[] = []
      const suggestions: string[] = []

      // 检查当事人姓名/名称一致性
      const partyNameMatches = text.match(/当事人[：:]\s*([^\s，。\n]{2,20})/g) || []
      const partyNames = partyNameMatches.map(match => {
        const nameMatch = match.match(/当事人[：:]\s*([^\s，。\n]{2,20})/)
        return nameMatch ? nameMatch[1] : null
      }).filter(Boolean)

      if (partyNames.length > 1) {
        const uniqueNames = [...new Set(partyNames)]
        if (uniqueNames.length > 1) {
          issues.push(`当事人姓名/名称表述不一致：${uniqueNames.join('、')}`)
          suggestions.push('确保文书中当事人姓名/名称表述前后一致')
        }
      }

      // 检查处罚金额一致性
      const penaltyAmounts = text.match(/罚款.*?(\d+(?:,\d+)*).*?元|(\d+(?:,\d+)*).*?元.*?罚款/gi) || []
      const amounts = penaltyAmounts.map(match => {
        const numMatch = match.match(/(\d+(?:,\d+)*)/);
        return numMatch ? numMatch[1] : null;
      }).filter(Boolean)

      if (amounts.length > 1) {
        const uniqueAmounts = [...new Set(amounts)]
        if (uniqueAmounts.length > 1) {
          issues.push(`处罚金额表述不一致：${uniqueAmounts.join('、')}元`)
          suggestions.push('确保文书中处罚金额表述前后一致，避免出现不同的金额')
        }
      }

      // 检查法条引用一致性
      const lawReferences = text.match(/《[^《》]+》第\d+条[^，。\n]*/g) || []
      const lawCounts: Record<string, number> = {}

      lawReferences.forEach(ref => {
        const lawMatch = ref.match(/《([^》]+)》/)
        if (lawMatch) {
          const lawName = lawMatch[1]
          lawCounts[lawName] = (lawCounts[lawName] || 0) + 1
        }
      })

      // 检查是否有法条引用但表述不一致
      Object.entries(lawCounts).forEach(([lawName, count]) => {
        if (count > 1) {
          const refs = lawReferences.filter(ref => ref.includes(lawName))
          const uniqueRefs = [...new Set(refs)]
          if (uniqueRefs.length > 1) {
            issues.push(`《${lawName}》的条款引用表述不一致`)
            suggestions.push(`确保同一部法律的条款引用格式统一规范`)
          }
        }
      })

      return {
        passed: issues.length === 0,
        issues,
        suggestions
      }
    }
  }
]

/**
 * 语言规范检查规则
 */
export const LANGUAGE_RULES: PenaltyReviewRule[] = [
  {
    id: 'formal_language',
    name: '语言表述规范',
    category: '语言规范',
    severity: 'warning',
    description: '检查是否使用规范的法律用语，避免口语化表述',
    checkFunction: (content, structure) => {
      const text = content.text
      const issues: string[] = []
      const suggestions: string[] = []

      // 检查非正式用词
      const informalWords = [
        '很', '非常', '比较', '应该', '可能', '大概', '差不多', '挺', '特别',
        '估计', '大约', '左右', '几乎', '基本上', '一般来说', '通常', '往往'
      ]

      const foundInformal = informalWords.filter(word => text.includes(word))
      if (foundInformal.length > 0) {
        issues.push(`使用了非正式用词：${foundInformal.join('、')}`)
        suggestions.push('应使用规范的法律用语，避免口语化表述')
      }

      // 检查必须使用的规范用词
      const requiredFormalTerms = [
        { informal: ['发现', '看到', '知道'], formal: '经查明', context: '事实认定' },
        { informal: ['给与', '给'], formal: '给予', context: '处罚决定' },
        { informal: ['按照', '根据'], formal: '依据', context: '法律引用' }
      ]

      requiredFormalTerms.forEach(term => {
        const hasInformal = term.informal.some(word => text.includes(word))
        const hasFormal = text.includes(term.formal)

        if (hasInformal && !hasFormal) {
          issues.push(`${term.context}部分应使用"${term.formal}"而非"${term.informal.join('或')}"`)
          suggestions.push(`建议将相关表述修改为规范的"${term.formal}"`)
        }
      })

      return {
        passed: issues.length === 0,
        issues,
        suggestions
      }
    }
  },

  {
    id: 'punctuation_usage',
    name: '标点符号规范',
    category: '格式要求',
    severity: 'info',
    description: '检查标点符号使用是否正确',
    checkFunction: (content, structure) => {
      const text = content.text
      const issues: string[] = []
      const suggestions: string[] = []

      // 检查顿号使用
      if (text.includes('、、') || text.includes(',,') || text.includes('。。')) {
        issues.push('存在标点符号重复使用')
        suggestions.push('应避免标点符号重复使用')
      }

      // 检查冒号后是否有空格
      const colonSpaceIssues = text.match(/：\s+\S/g)
      if (colonSpaceIssues && colonSpaceIssues.length > 0) {
        issues.push('冒号后存在多余空格')
        suggestions.push('冒号后不应有空格')
      }

      return {
        passed: issues.length === 0,
        issues,
        suggestions
      }
    }
  }
]

/**
 * 获取所有审查规则
 */
export function getAllReviewRules(): PenaltyReviewRule[] {
  return [
    ...MANDATORY_ELEMENTS_RULES,
    ...PROCEDURAL_RULES,
    ...FORMAT_RULES,
    ...LOGIC_CONSISTENCY_RULES,
    ...LANGUAGE_RULES
  ]
}

/**
 * 按类别获取审查规则
 */
export function getRulesByCategory(category: string): PenaltyReviewRule[] {
  return getAllReviewRules().filter(rule => rule.category === category)
}

/**
 * 按严重程度获取审查规则
 */
export function getRulesBySeverity(severity: 'critical' | 'warning' | 'info'): PenaltyReviewRule[] {
  return getAllReviewRules().filter(rule => rule.severity === severity)
}