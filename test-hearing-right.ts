/**
 * 测试听证权利检查功能
 */

// 模拟文档内容
const testCases = [
  {
    name: '个人-达到听证标准（1万元）',
    content: {
      text: `
        当事人：张三，男，1980年1月1日出生
        身份证号：330123198001011234
        住所：杭州市临安区XX路XX号
        联系电话：13800138000

        经查明，当事人存在违法行为...

        综上，决定对当事人处以罚款10000元。

        如对本决定不服，可在收到本决定书之日起六十日内向杭州市人民政府申请行政复议...
      `,
      paragraphs: [],
      wordCount: 100,
      metadata: { fileName: 'test1.docx' }
    },
    expectedPartyType: 'individual',
    expectedFineAmount: 10000,
    expectedHearingRequired: true,
    expectedIssue: true // 应该报告缺少听证权利告知
  },
  {
    name: '个人-未达到听证标准（5千元）',
    content: {
      text: `
        当事人：李四，女
        身份证号：330123199001011234
        住所：杭州市临安区XX路XX号

        决定处以罚款5000元。
      `,
      paragraphs: [],
      wordCount: 50,
      metadata: { fileName: 'test2.docx' }
    },
    expectedPartyType: 'individual',
    expectedFineAmount: 5000,
    expectedHearingRequired: false,
    expectedIssue: false
  },
  {
    name: '单位-达到听证标准（10万元）',
    content: {
      text: `
        当事人：杭州某某有限公司
        统一社会信用代码：913301XXXXXXXXXX
        住所：杭州市临安区XX路XX号
        法定代表人：王五

        决定处以罚款人民币100000元。
      `,
      paragraphs: [],
      wordCount: 80,
      metadata: { fileName: 'test3.docx' }
    },
    expectedPartyType: 'unit',
    expectedFineAmount: 100000,
    expectedHearingRequired: true,
    expectedIssue: true
  },
  {
    name: '单位-未达到听证标准（5万元）',
    content: {
      text: `
        当事人：杭州某某商店（个体工商户）
        统一社会信用代码：913301XXXXXXXXXX
        经营者：赵六

        处罚款50000元。
      `,
      paragraphs: [],
      wordCount: 60,
      metadata: { fileName: 'test4.docx' }
    },
    expectedPartyType: 'unit',
    expectedFineAmount: 50000,
    expectedHearingRequired: false,
    expectedIssue: false
  },
  {
    name: '个人-达到听证标准且已告知听证权利',
    content: {
      text: `
        当事人：孙七
        身份证号：330123198501011234

        决定处罚款15000元。

        根据《行政处罚法》规定，当事人有权在收到本告知书之日起三日内向本机关提出听证申请。

        如对本决定不服，可在收到本决定书之日起六十日内申请行政复议...
      `,
      paragraphs: [],
      wordCount: 90,
      metadata: { fileName: 'test5.docx' }
    },
    expectedPartyType: 'individual',
    expectedFineAmount: 15000,
    expectedHearingRequired: true,
    expectedIssue: false // 已告知听证权利，不应报告问题
  }
]

console.log('听证权利检查功能测试')
console.log('=' .repeat(80))
console.log('')

// 这里只是展示测试用例，实际运行需要导入相关模块
testCases.forEach((testCase, index) => {
  console.log(`测试用例 ${index + 1}: ${testCase.name}`)
  console.log(`  期望当事人类型: ${testCase.expectedPartyType}`)
  console.log(`  期望罚款金额: ${testCase.expectedFineAmount}元`)
  console.log(`  期望是否需要听证: ${testCase.expectedHearingRequired ? '是' : '否'}`)
  console.log(`  期望是否报告问题: ${testCase.expectedIssue ? '是' : '否'}`)
  console.log('')
})

console.log('=' .repeat(80))
console.log('测试说明：')
console.log('1. 个人当事人：罚款 ≥ 1万元需要听证权利告知')
console.log('2. 单位当事人：罚款 ≥ 10万元需要听证权利告知')
console.log('3. 如达到标准但未告知，应报告为严重问题（critical）')
console.log('4. 如已告知听证权利，还需检查是否说明申请期限')
