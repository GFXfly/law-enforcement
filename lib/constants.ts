/**
 * 项目通用的常量和正则表达式定义
 */

// 日期相关正则
export const DATE_PATTERN = /\d{4}年\d{1,2}月\d{1,2}日/
export const ALT_DATE_PATTERN = /\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/

// 文号相关正则
export const CASE_NUMBER_PATTERN = /[（(][^）)]{1,12}[）)][^〔〔\[]*?(处罚|决定|字)[〔\[]\d{4}[〕\]][^号]{0,8}?号/
export const CASE_NUMBER_PATTERN_NORMALIZED = /[（(]?[\u4e00-\u9fa5]{0,8}[）)]?(市监罚处|市监罚字|市监处字|市监处|市监罚|市监|市监处罚|市监罚决|监罚|监处|处罚字|处罚|罚字|罚处|处字|决定|罚决|政处|执法处)[〔\[]?\d{4}[〕\]]?\d{1,6}号/
export const DOCUMENT_NUMBER_LINE_REGEX = /^\s*[（(]?[\u4e00-\u9fa5A-Za-z（）()]{1,20}[）)]?[^〔\[]*?[〔\[]\d{4}[〕\]]\s*\d{1,6}号/

// 金额相关正则
export const HEARING_TRIGGER_AMOUNT = /(罚款|罚金)[^\d]{0,8}(\d+[\d,]{3,})/

// 单位关键词正则
export const UNIT_KEYWORDS_REGEX = /(单位|公司|有限责任公司|分公司|合作社|中心|企业|商行|门店|药店|学校|医院|超市|店|集团|支队|大队|事务所|研究所|协会|合作联社|工作室|个体工商户)/

// 格式相关正则
export const INDENTATION_CHARS = /[\u3000\u00A0\u2000-\u200B]/g
export const INDENTATION_REGEX = /^[\u3000\u00A0\u2000-\u200B\s]{2,}/
export const MULTIPLE_SPACE_PATTERN = /[\u3000\u00A0\u2000-\u200B\s]{2,}/g
export const LABEL_PREFIX_REGEX = /^[\u4e00-\u9fa5（）()]{1,20}[：:]/

// 听证权利标准阈值
export const HEARING_THRESHOLD = {
  INDIVIDUAL: 10000, // 个人：1万元
  UNIT: 100000       // 单位：10万元
}
