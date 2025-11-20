import { DocumentContent, DocumentStructure } from '../document-processor'

export interface ReviewIssue {
    problem: string      // 问题描述
    location: string     // 问题位置
    solution: string     // 修改意见
    severity: 'critical' | 'warning' | 'info'
}

export type ReviewSectionCategory =
    | '文书格式检查'
    | '标题部分'
    | '文号部分'
    | '正文部分'
    | '履行与权利告知'
    | '落款部分'
    | '固定内容比对'
    | '整体一致性'

export interface PenaltyReviewRule {
    id: string
    name: string
    category: ReviewSectionCategory
    severity: 'critical' | 'warning' | 'info'
    description: string
    checkFunction: (content: DocumentContent, structure: DocumentStructure) => ReviewIssue[]
}

export interface SimplifiedReviewRule {
    id: string
    name: string
    checkFunction: (content: DocumentContent, structure: DocumentStructure) => ReviewIssue[]
}
