/**
 * 简化版行政处罚决定书审查规则
 * 为保持兼容性，直接复用主规则文件中的精简规则集合
 */

export {
  type ReviewIssue,
  type SimplifiedReviewRule,
  SIMPLIFIED_REVIEW_RULES,
  executeSimplifiedReview,
  formatReviewResults
} from './administrative-penalty-rules'
