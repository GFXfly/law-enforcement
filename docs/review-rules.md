# 行政处罚决定书审查规则总览

> 来源：`lib/administrative-penalty-rules.ts`。更新规则时请同步维护，便于审查与开发协同。

## 1. 文书格式检查
- **文书标题是否存在** (`format_title_presence`)：检查文书是否包含标题，避免结构缺失。
- **文书内容完整性** (`format_content_length`)：检查字数与段落是否覆盖必备要素。
- **基本结构要素** (`format_basic_sections`)：确认当事人信息、违法事实、处罚决定三大要素齐备。
- **正文段落首行缩进** (`paragraph_indentation`)：正文段落需首行缩进两个字符。

## 2. 标题部分
- **标题包含“行政处罚决定书”** (`title_keyword_check`)：标题必须包含标准名称。
- **标题两行结构** (`title_two_line_structure`)：推荐使用“机关名称 + 行政处罚决定书”两行布局。

## 3. 文号部分
- **案件文号存在性** (`document_number_presence`)：识别“（机关简称）××〔年份〕××号”等常见格式（支持无括号简称）。
- **文号格式规范性** (`document_number_format`)：检查括号、年份方括号、类别标识是否完整。

## 4. 正文部分
- **当事人信息完整性** (`party_information_completeness`)：区分单位/个人，检查姓名、地址及身份证明（统一社会信用代码或身份证号）。
- **法定代表人信息** (`legal_representative_information`)：单位当事人须注明法定代表人或负责人。
- **违法事实具体性** (`violation_facts_specificity`)：违法事实需包含时间、地点、行为三要素。
- **证据列举情况** (`evidence_enumeration`)：证据应逐项列举并与事实对应。
- **法律依据引用完整** (`legal_basis_completeness`)：违法依据与处罚依据需准确引用并格式规范。
- **处罚决定明确性** (`penalty_decision_specificity`)：处罚种类、幅度、履行方式必须明确。

## 5. 履行与权利告知
- **处罚履行期限** (`penalty_deadline`)：需告知履行期限（如十五日内）。
- **罚款缴纳方式** (`payment_instructions`)：罚款类处罚必须说明缴纳渠道。
- **陈述申辩权利告知** (`statement_and_defense_notice`)：确认告知陈述、申辩或听证权利。
- **行政复议与诉讼告知** (`remedy_notice`)：复议、诉讼途径需完整，含期限、对象、法院信息。

## 6. 落款部分
- **执法机关落款** (`authority_signature`)：文末需标注机关名称并与日期位置匹配。
- **决定日期规范性** (`decision_date`)：检查是否存在格式正确的落款日期。

## 7. 固定内容比对
- **行政复议固定表述** (`fixed_reconsideration_content`)：复议语句与模板一致。
- **行政诉讼固定表述** (`fixed_litigation_content`)：诉讼语句与模板一致。
- **逾期履行后果表述** (`fixed_overdue_consequence`)：罚款逾期处理需写明“每日按罚款数额百分之三加处罚款，并可申请人民法院强制执行”。

## 8. 整体一致性
- **当事人名称前后一致** (`party_name_consistency`)：名称在全文中保持一致。
- **处罚金额一致性** (`penalty_amount_consistency`)：检测多处金额是否一致。
- **提示性短语重复** (`duplicate_prompt_phrases`)：避免“经查明”等提示词重复粘贴。
- **书名号成对使用** (`book_title_bracket_balance`)：确保《》成对出现。
- **编号后空格规范** (`ordered_list_spacing`)：列表编号后不允许多余空格。
- **标点连续误用** (`duplicate_punctuation_sequence`)：捕捉不规范的连续标点（如“：。”、“？！ ”等）。
- **销售事实自相矛盾** (`sales_statement_contradiction`)：同段不得同时出现“已销售”与“未销售”等矛盾结论。
- **瓶数描述一致性** (`bottle_quantity_inconsistency`)：总结语句中的数量需与前文一致。
- **日期格式统一** (`date_format_consistency`)：全文日期格式应统一。
- **语言表述规范性** (`informal_language`)：提示常见口语化/模糊词，建议使用规范法律语言。

---

> **维护说明**：新增或调整规则后，请同时更新本文件，确保研发、语义审查与执法人员使用同一套标准。
