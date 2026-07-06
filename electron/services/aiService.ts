import { app } from 'electron'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { AiSettings, BrochureContent, BrochureProject } from '../../src/shared/brochure'

export interface GenerateContentServiceResult {
  content: BrochureContent
  usedMock: boolean
}

function getPromptTemplatePath(): string {
  return join(app.getAppPath(), 'prompts/brochure-content.prompt.md')
}

function normalizeContent(content: BrochureContent): BrochureContent {
  return {
    coverTitle: content.coverTitle || '',
    coverSubtitle: content.coverSubtitle || '',
    productIntro: content.productIntro || '',
    keySellingPoints: Array.isArray(content.keySellingPoints) ? content.keySellingPoints : [],
    targetAudiencePainPoints: Array.isArray(content.targetAudiencePainPoints)
      ? content.targetAudiencePainPoints
      : [],
    solutions: Array.isArray(content.solutions) ? content.solutions : [],
    useCases: Array.isArray(content.useCases) ? content.useCases : [],
    specifications: Array.isArray(content.specifications) ? content.specifications : [],
    faq: Array.isArray(content.faq) ? content.faq : [],
    sections: Array.isArray(content.sections) ? content.sections : [],
    callToAction: content.callToAction || '',
    recommendedTemplateId: content.recommendedTemplateId,
    designNotes: Array.isArray(content.designNotes) ? content.designNotes : []
  }
}

function buildSectionsFromGeneratedContent(content: BrochureContent): BrochureContent {
  const sections = [
    { title: '产品介绍', body: content.productIntro },
    { title: '核心卖点', body: content.keySellingPoints.join('\n') },
    { title: '目标痛点', body: content.targetAudiencePainPoints.join('\n') },
    { title: '解决方案', body: content.solutions.join('\n') },
    { title: '应用场景', body: content.useCases.join('\n') },
    {
      title: '规格参数',
      body: content.specifications.map((item) => `${item.label}: ${item.value}`).join('\n')
    },
    {
      title: '常见问题',
      body: content.faq.map((item) => `${item.question}\n${item.answer}`).join('\n\n')
    }
  ].filter((section) => section.body.trim())

  return {
    ...content,
    sections
  }
}

function createMockBrochureContent(project: BrochureProject): BrochureContent {
  const { productInfo } = project
  const productName = productInfo.productName || project.name
  const audiences =
    productInfo.targetAudiences.length > 0 ? productInfo.targetAudiences.join('、') : '目标客户'
  const goal = productInfo.campaignGoal || '提升客户理解与咨询转化'
  const tone = productInfo.brandTone || '专业、清晰、可信赖'
  const sellingPoints = productInfo.coreSellingPoints
    .split(/[，,、；;\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
  const leadingValue = sellingPoints[0] || '清晰呈现核心价值'

  return buildSectionsFromGeneratedContent({
    coverTitle: productName,
    coverSubtitle: `${leadingValue}，面向${audiences}的推广方案`,
    productIntro: `${productName}面向${audiences}，围绕${goal}组织产品价值、应用场景和沟通重点。内容以${tone}的表达方式呈现，帮助客户更快理解差异化优势，并推动后续咨询、到店、试用或商务沟通。`,
    keySellingPoints:
      sellingPoints.length > 0
        ? sellingPoints.slice(0, 5).map((point) => `${point}，让客户快速看到实际价值`)
        : [
            '清晰呈现产品核心价值，减少客户理解成本',
            '围绕购买决策组织信息，便于销售沟通',
            '适配展会、拜访和线上资料等多类场景',
            '统一品牌表达，提升对外资料专业度'
          ],
    targetAudiencePainPoints: [
      `${audiences}需要在短时间内判断产品是否值得进一步了解。`,
      '资料信息分散，客户难以抓住最关键的购买理由。',
      '单纯介绍功能容易显得平淡，缺少场景和结果支撑。',
      '缺少明确行动引导，阅读后不一定产生咨询动作。'
    ],
    solutions: [
      `以${productName}的核心价值为主线，建立从认知到咨询的阅读路径。`,
      '把卖点、痛点和解决方案放在同一叙事中，降低客户决策成本。',
      '用场景化语言解释产品价值，让宣传资料更接近真实沟通。',
      '在 FAQ 和行动引导中提前回应顾虑，提升后续转化机会。'
    ],
    useCases: [
      `${goal}前的客户初步介绍`,
      '展会、门店或会议现场快速派发',
      '销售拜访前后的产品资料补充',
      '官网、社媒或私域渠道的资料下载',
      '渠道伙伴转介绍时的统一说明材料'
    ],
    specifications: [
      { label: '产品/品牌', value: productName },
      { label: '目标受众', value: audiences },
      { label: '主要用途', value: goal },
      { label: '推荐资料形态', value: productInfo.brochureFormat },
      { label: '内容风格', value: tone },
      { label: '适用团队', value: project.owner || '市场、销售与渠道团队' }
    ],
    faq: [
      {
        question: `${productName}适合哪些客户先了解？`,
        answer: `适合正在关注${goal}，并希望快速判断产品价值、适用场景和后续沟通方式的${audiences}。`
      },
      {
        question: '这份资料适合用在哪些触点？',
        answer: '可用于展会派发、销售拜访、线上下载、客户转发和渠道伙伴介绍。'
      },
      {
        question: '客户阅读后下一步应该做什么？',
        answer: '建议直接预约沟通、获取报价、申请体验或联系顾问确认适配方案。'
      }
    ],
    sections: [],
    callToAction: `了解${productName}如何支持${goal}，欢迎预约沟通或获取专属方案`,
    recommendedTemplateId: productInfo.brochureFormat === 'event-flyer' ? 'event-flyer' : 'business-clean',
    designNotes: [
      '封面突出产品名称与一句话价值主张',
      '正文用卡片承载卖点和客户痛点，方便快速扫描',
      '产品图片建议放在封面右侧和产品介绍页辅助理解',
      'CTA 使用高对比色块，形成明确转化出口'
    ]
  })
}

function extractJsonObject(rawContent: string): string {
  const fencedMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fencedMatch?.[1] ?? rawContent
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('AI 返回内容不是有效 JSON。')
  }

  return candidate.slice(start, end + 1)
}

function ensureStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`AI 返回缺少 ${field} 列表。`)
  }

  return value.map((item) => String(item).trim()).filter(Boolean)
}

function parseGeneratedContent(rawContent: string): BrochureContent {
  const parsed = JSON.parse(extractJsonObject(rawContent)) as Partial<BrochureContent>
  const content: BrochureContent = {
    coverTitle: String(parsed.coverTitle ?? '').trim(),
    coverSubtitle: String(parsed.coverSubtitle ?? '').trim(),
    productIntro: String(parsed.productIntro ?? '').trim(),
    keySellingPoints: ensureStringArray(parsed.keySellingPoints, 'keySellingPoints'),
    targetAudiencePainPoints: ensureStringArray(
      parsed.targetAudiencePainPoints,
      'targetAudiencePainPoints'
    ),
    solutions: ensureStringArray(parsed.solutions, 'solutions'),
    useCases: ensureStringArray(parsed.useCases, 'useCases'),
    specifications: Array.isArray(parsed.specifications)
      ? parsed.specifications
          .map((item) => ({
            label: String((item as { label?: unknown }).label ?? '').trim(),
            value: String((item as { value?: unknown }).value ?? '').trim()
          }))
          .filter((item) => item.label && item.value)
      : [],
    faq: Array.isArray(parsed.faq)
      ? parsed.faq
          .map((item) => ({
            question: String((item as { question?: unknown }).question ?? '').trim(),
            answer: String((item as { answer?: unknown }).answer ?? '').trim()
          }))
          .filter((item) => item.question && item.answer)
      : [],
    sections: [],
    callToAction: String(parsed.callToAction ?? '').trim(),
    recommendedTemplateId: String(parsed.recommendedTemplateId ?? '').trim(),
    designNotes: Array.isArray(parsed.designNotes)
      ? parsed.designNotes.map((item) => String(item).trim()).filter(Boolean)
      : []
  }

  if (!content.coverTitle || !content.coverSubtitle || !content.productIntro || !content.callToAction) {
    throw new Error('AI 返回 JSON 缺少必要文本字段。')
  }

  if (content.specifications.length === 0) {
    throw new Error('AI 返回缺少 specifications。')
  }

  if (content.faq.length === 0) {
    throw new Error('AI 返回缺少 faq。')
  }

  return buildSectionsFromGeneratedContent(content)
}

async function callLargeModel(project: BrochureProject, settings: AiSettings): Promise<BrochureContent> {
  if (settings.provider === 'anthropic') {
    return callAnthropicModel(project, settings)
  }

  return callOpenAiCompatibleModel(project, settings)
}

async function callOpenAiCompatibleModel(
  project: BrochureProject,
  settings: AiSettings
): Promise<BrochureContent> {
  const promptTemplate = await readFile(getPromptTemplatePath(), 'utf8')
  const endpoint = normalizeOpenAiCompatibleEndpoint(settings.endpoint)
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: promptTemplate
        },
        {
          role: 'user',
          content: JSON.stringify(
            {
              projectName: project.name,
              pages: project.pages,
              status: project.status,
              productInfo: project.productInfo
            },
            null,
            2
          )
        }
      ]
    })
  })

  const responseText = await response.text()

  if (!response.ok) {
    let message = responseText

    try {
      const parsed = JSON.parse(responseText) as { error?: { message?: string } }
      message = parsed.error?.message || message
    } catch {
      message = responseText
    }

    throw new Error(`AI 接口调用失败 (${response.status}): ${message}`)
  }

  const payload = JSON.parse(responseText) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = payload.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('AI 接口没有返回可用内容。')
  }

  return parseGeneratedContent(content)
}

function normalizeOpenAiCompatibleEndpoint(endpoint: string): string {
  const trimmedEndpoint = endpoint.trim().replace(/\/+$/, '')

  if (!trimmedEndpoint) {
    throw new Error('未配置 OpenAI 兼容接口 Endpoint。')
  }

  if (trimmedEndpoint.endsWith('/chat/completions')) {
    return trimmedEndpoint
  }

  if (trimmedEndpoint.endsWith('/v1')) {
    return `${trimmedEndpoint}/chat/completions`
  }

  return `${trimmedEndpoint}/v1/chat/completions`
}

async function callAnthropicModel(project: BrochureProject, settings: AiSettings): Promise<BrochureContent> {
  const promptTemplate = await readFile(getPromptTemplatePath(), 'utf8')
  const response = await fetch(settings.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: settings.model,
      max_tokens: 2200,
      system: promptTemplate,
      messages: [
        {
          role: 'user',
          content: JSON.stringify(
            {
              instruction: '请只返回符合要求的 JSON 对象，不要输出 Markdown 或解释。',
              projectName: project.name,
              pages: project.pages,
              status: project.status,
              productInfo: project.productInfo
            },
            null,
            2
          )
        }
      ]
    })
  })

  const responseText = await response.text()

  if (!response.ok) {
    let message = responseText

    try {
      const parsed = JSON.parse(responseText) as { error?: { message?: string } }
      message = parsed.error?.message || message
    } catch {
      message = responseText
    }

    throw new Error(`Claude 接口调用失败 (${response.status}): ${message}`)
  }

  const payload = JSON.parse(responseText) as {
    content?: Array<{ type?: string; text?: string }>
  }
  const content = payload.content?.find((item) => item.type === 'text' && item.text)?.text

  if (!content) {
    throw new Error('Claude 接口没有返回可用内容。')
  }

  return parseGeneratedContent(content)
}

export async function generateBrochureContentForProject(
  project: BrochureProject,
  settings: AiSettings
): Promise<GenerateContentServiceResult> {
  if (settings.provider === 'mock' || settings.model === 'local-mock') {
    return {
      content: normalizeContent(createMockBrochureContent(project)),
      usedMock: true
    }
  }

  if (!settings.apiKey) {
    if (!settings.useMockFallback) {
      throw new Error('未配置 API Key。请在设置中选择本地 Mock 模型，或填写真实模型 API Key。')
    }

    return {
      content: normalizeContent(createMockBrochureContent(project)),
      usedMock: true
    }
  }

  try {
    return {
      content: normalizeContent(await callLargeModel(project, settings)),
      usedMock: false
    }
  } catch (error) {
    if (!settings.useMockFallback) {
      throw error
    }

    return {
      content: normalizeContent(createMockBrochureContent(project)),
      usedMock: true
    }
  }
}
