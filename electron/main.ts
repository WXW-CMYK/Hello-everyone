import { app, BrowserWindow, dialog, ipcMain, net, protocol, shell } from 'electron'
import { randomUUID } from 'node:crypto'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, extname, join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import type {
  AppSettings,
  AiSettings,
  BrochureContent,
  BrochureProject,
  CreateBrochureProjectInput,
  ExportBrochurePdfInput,
  ExportBrochurePdfResult,
  GenerateBrochureContentResult,
  UploadedImageAsset,
  UpdateBrochureProjectInput
} from '../src/shared/brochure'
import { brochureFormatPageCounts } from '../src/shared/brochure'
import { findAiModelPreset, getAiModelPreset } from '../src/shared/modelPresets'
import { defaultTemplateId, getBrochureTemplate } from '../src/shared/templates'
import { generateBrochureContentForProject } from './services/aiService'

const isDevelopment = Boolean(process.env.ELECTRON_RENDERER_URL)
const projectsFileName = 'brochure-projects.json'
const settingsFileName = 'settings.json'
const assetsDirectoryName = 'assets'
const supportedImageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp'])
const defaultAiPreset = getAiModelPreset('claude-opus-4-8')
const defaultAiSettings: AiSettings = {
  provider: defaultAiPreset.provider,
  presetId: defaultAiPreset.presetId,
  apiKey: '',
  endpoint: defaultAiPreset.endpoint,
  model: defaultAiPreset.model,
  useMockFallback: false
}
const defaultAppSettings: AppSettings = {
  ai: defaultAiSettings,
  defaultBrand: {
    brandName: '',
    contactName: '',
    phone: '',
    email: '',
    website: ''
  },
  export: {
    defaultExportPath: '',
    pdfFileNamePrefix: 'brochure'
  }
}

function getProjectsFilePath(): string {
  return join(app.getPath('userData'), projectsFileName)
}

function getSettingsFilePath(): string {
  return join(app.getPath('userData'), settingsFileName)
}

function getAssetsDirectoryPath(): string {
  return join(app.getPath('userData'), assetsDirectoryName)
}

function registerAssetProtocol(): void {
  protocol.handle('app-asset', async (request) => {
    const url = new URL(request.url)
    const assetPath = decodeURIComponent(url.pathname.slice(1))
    const relativeAssetPath = relative(getAssetsDirectoryPath(), assetPath)

    if (relativeAssetPath.startsWith('..') || relativeAssetPath === '' || relativeAssetPath.startsWith('/')) {
      return new Response('Asset not found', { status: 404 })
    }

    return net.fetch(pathToFileURL(assetPath).toString())
  })
}

function toAssetProtocolUrl(assetPath: string | undefined): string {
  return assetPath ? `app-asset://local/${encodeURIComponent(assetPath)}` : ''
}

function escapeHtml(value: string | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function sanitizeFileName(value: string): string {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
}

function renderParagraph(value: string): string {
  return escapeHtml(value).replace(/\n/g, '<br />')
}

function renderList(items: string[]): string {
  const normalizedItems = items.map((item) => item.trim()).filter(Boolean)

  if (normalizedItems.length === 0) {
    return '<p class="empty-text">暂无内容</p>'
  }

  return `<ul>${normalizedItems.map((item) => `<li>${renderParagraph(item)}</li>`).join('')}</ul>`
}

function createPdfHtml(project: BrochureProject): string {
  const template = getBrochureTemplate(project.templateId)
  const content = project.content
  const logoUrl = toAssetProtocolUrl(project.logoAssetPath)
  const productImageUrl = toAssetProtocolUrl(project.productImageAssetPath)
  const coverTitle = escapeHtml(content.coverTitle || project.name)
  const coverSubtitle = renderParagraph(content.coverSubtitle)
  const documentLabel = escapeHtml(content.coverTitle || project.name)
  const productName = escapeHtml(project.productInfo.productName || content.coverTitle || project.name)

  const specifications = content.specifications
    .filter((item) => item.label.trim() || item.value.trim())
    .map(
      (item) =>
        `<div class="spec-row"><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd></div>`
    )
    .join('')

  const faqItems = content.faq
    .filter((item) => item.question.trim() || item.answer.trim())
    .map(
      (item) =>
        `<article class="faq-item"><h3>${escapeHtml(item.question)}</h3><p>${renderParagraph(item.answer)}</p></article>`
    )
    .join('')

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: ${template.textColor};
        background: #ffffff;
        font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
      }
      .page {
        width: 210mm;
        height: 297mm;
        overflow: hidden;
        page-break-after: always;
        background: ${template.backgroundColor};
        padding: 20mm 22mm 24mm;
        position: relative;
      }
      .page:last-child { page-break-after: auto; }
      .cover {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 64mm;
        align-items: end;
        gap: 16mm;
        color: #fff;
        background:
          radial-gradient(circle at 86% 12%, ${template.accentColor}cc 0, transparent 30mm),
          linear-gradient(135deg, ${template.primaryColor} 0%, ${template.primaryColor}f0 58%, ${template.accentColor} 100%);
      }
      .cover::after {
        position: absolute;
        right: -18mm;
        bottom: -18mm;
        width: 86mm;
        height: 86mm;
        border: 4mm solid rgba(255,255,255,.18);
        border-radius: 18mm;
        content: '';
      }
      .cover-logo {
        max-width: 45mm;
        max-height: 18mm;
        object-fit: contain;
        object-position: left center;
        margin-bottom: 12mm;
      }
      .cover-label {
        color: ${template.accentColor};
        font-size: 10pt;
        font-weight: 800;
        letter-spacing: 0;
        text-transform: uppercase;
        margin-bottom: 10mm;
      }
      .cover-badge {
        display: inline-flex;
        width: fit-content;
        border: 1px solid rgba(255,255,255,.28);
        border-radius: 999px;
        color: rgba(255,255,255,.86);
        padding: 2.5mm 5mm;
        font-size: 9pt;
        font-weight: 700;
        margin-bottom: 9mm;
      }
      h1 {
        margin: 0 0 8mm;
        font-size: ${template.layoutStyle === 'premium-brand' ? '38pt' : '34pt'};
        line-height: 1.12;
        font-family: ${template.layoutStyle === 'premium-brand' ? 'Georgia, "Times New Roman", serif' : 'inherit'};
        font-weight: ${template.layoutStyle === 'premium-brand' ? '600' : '820'};
      }
      .cover p {
        margin: 0;
        max-width: 118mm;
        color: rgba(255,255,255,.88);
        font-size: 14pt;
        line-height: 1.6;
      }
      .cover-product {
        overflow: hidden;
        width: 64mm;
        height: 52mm;
        border: 1px solid rgba(255,255,255,.24);
        border-radius: 4mm;
        background: rgba(255,255,255,.14);
      }
      .cover-product img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .page-heading {
        display: flex;
        justify-content: space-between;
        gap: 12mm;
        border-bottom: .7mm solid ${template.accentColor};
        padding-bottom: 7mm;
        margin-bottom: 12mm;
      }
      .page-kicker {
        color: ${template.accentColor};
        font-size: 9pt;
        font-weight: 800;
        margin: 0 0 3mm;
        text-transform: uppercase;
      }
      h2 {
        margin: 0;
        color: ${template.primaryColor};
        font-size: 24pt;
        line-height: 1.16;
        font-family: ${template.layoutStyle === 'premium-brand' ? 'Georgia, "Times New Roman", serif' : 'inherit'};
      }
      h3 {
        margin: 0 0 3mm;
        color: ${template.primaryColor};
        font-size: 13pt;
      }
      p, li, dd {
        color: ${template.textColor};
        font-size: 10.8pt;
        line-height: 1.66;
      }
      p { margin: 0; }
      ul {
        display: grid;
        gap: 5mm;
        margin: 0;
        padding-left: 6mm;
      }
      li::marker { color: ${template.accentColor}; }
      .intro-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) ${productImageUrl ? '58mm' : '0'};
        gap: 12mm;
        align-items: start;
      }
      .inline-product {
        overflow: hidden;
        width: 58mm;
        height: 72mm;
        border-radius: 4mm;
        background: #fff;
        border: .4mm solid rgba(0,0,0,.08);
      }
      .inline-product img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .cards {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8mm;
      }
      .card, .faq-item {
        border: .35mm solid rgba(0,0,0,.08);
        border-radius: 4mm;
        background: rgba(255,255,255,.7);
        padding: 7mm;
        box-shadow: 0 3mm 10mm rgba(0,0,0,.045);
      }
      .card h3 {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 11mm;
        height: 8mm;
        border-radius: 999px;
        color: #fff;
        background: ${template.primaryColor};
        font-size: 9pt;
        margin-bottom: 4mm;
      }
      .specs {
        display: grid;
        gap: 4mm;
        margin: 12mm 0 0;
      }
      .spec-row {
        display: grid;
        grid-template-columns: 44mm minmax(0, 1fr);
        gap: 8mm;
        border-bottom: .25mm solid rgba(0,0,0,.12);
        padding-bottom: 3mm;
      }
      dt {
        color: ${template.primaryColor};
        font-size: 10.5pt;
        font-weight: 800;
      }
      dd { margin: 0; }
      .faq-list {
        display: grid;
        gap: 6mm;
      }
      .cta {
        position: absolute;
        left: 22mm;
        right: 22mm;
        bottom: 22mm;
        border-radius: 4mm;
        color: #fff;
        background: ${template.primaryColor};
        padding: 9mm;
        font-size: 16pt;
        font-weight: 800;
        text-align: center;
      }
      .doc-footer {
        position: absolute;
        left: 22mm;
        right: 22mm;
        bottom: 9mm;
        display: flex;
        justify-content: space-between;
        border-top: .25mm solid rgba(0,0,0,.1);
        padding-top: 3mm;
        color: ${template.primaryColor};
        opacity: .62;
        font-size: 8.5pt;
        font-weight: 700;
      }
      .empty-text { color: rgba(0,0,0,.48); }
      .tech-product .card,
      .tech-product .faq-item {
        border-color: color-mix(in srgb, ${template.accentColor} 32%, transparent);
      }
      .event-flyer .cards {
        grid-template-columns: 1fr;
        gap: 5mm;
      }
      .event-flyer .card {
        border-left: 2mm solid ${template.accentColor};
      }
      .premium-brand .page-heading {
        border-bottom-width: .5mm;
      }
    </style>
  </head>
  <body class="${template.layoutStyle}">
    <section class="page cover">
      <div>
        ${logoUrl ? `<img class="cover-logo" src="${logoUrl}" alt="Logo" />` : `<div class="cover-label">${escapeHtml(template.name)}</div>`}
        <div class="cover-badge">产品宣传资料</div>
        <h1>${coverTitle}</h1>
        <p>${coverSubtitle}</p>
      </div>
      ${productImageUrl ? `<figure class="cover-product"><img src="${productImageUrl}" alt="Product" /></figure>` : ''}
    </section>

    <section class="page">
      <header class="page-heading">
        <div>
          <p class="page-kicker">Product Intro</p>
          <h2>产品介绍</h2>
        </div>
      </header>
      <div class="intro-layout">
        <p>${renderParagraph(content.productIntro)}</p>
        ${productImageUrl ? `<figure class="inline-product"><img src="${productImageUrl}" alt="Product" /></figure>` : ''}
      </div>
      ${specifications ? `<dl class="specs">${specifications}</dl>` : ''}
      <footer class="doc-footer"><span>${documentLabel}</span><span>02 / 05</span></footer>
    </section>

    <section class="page">
      <header class="page-heading">
        <div>
          <p class="page-kicker">Value</p>
          <h2>核心卖点</h2>
        </div>
      </header>
      <div class="cards">
        ${content.keySellingPoints
          .filter(Boolean)
          .map((item, index) => `<article class="card"><h3>0${index + 1}</h3><p>${renderParagraph(item)}</p></article>`)
          .join('') || '<p class="empty-text">暂无核心卖点。</p>'}
      </div>
      <footer class="doc-footer"><span>${productName}</span><span>03 / 05</span></footer>
    </section>

    <section class="page">
      <header class="page-heading">
        <div>
          <p class="page-kicker">Use Cases</p>
          <h2>应用场景与解决方案</h2>
        </div>
      </header>
      <div class="cards">
        <article class="card"><h3>应用场景</h3>${renderList(content.useCases)}</article>
        <article class="card"><h3>目标客户痛点</h3>${renderList(content.targetAudiencePainPoints)}</article>
        <article class="card"><h3>解决方案</h3>${renderList(content.solutions)}</article>
      </div>
      <footer class="doc-footer"><span>${productName}</span><span>04 / 05</span></footer>
    </section>

    <section class="page">
      <header class="page-heading">
        <div>
          <p class="page-kicker">FAQ / CTA</p>
          <h2>常见问题与行动引导</h2>
        </div>
      </header>
      <div class="faq-list">
        ${faqItems || '<p class="empty-text">暂无 FAQ。</p>'}
      </div>
      <div class="cta">${renderParagraph(content.callToAction)}</div>
      <footer class="doc-footer"><span>${documentLabel}</span><span>05 / 05</span></footer>
    </section>
  </body>
</html>`
}

async function readProjects(): Promise<BrochureProject[]> {
  try {
    const raw = await readFile(getProjectsFilePath(), 'utf8')
    const projects = JSON.parse(raw) as BrochureProject[]

    if (!Array.isArray(projects)) {
      return []
    }

    return projects.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }

    throw error
  }
}

async function writeProjects(projects: BrochureProject[]): Promise<void> {
  await mkdir(app.getPath('userData'), { recursive: true })
  await writeFile(getProjectsFilePath(), JSON.stringify(projects, null, 2), 'utf8')
}

function normalizeAppSettings(settings: Partial<AppSettings> & Partial<AiSettings>): AppSettings {
  const legacyAiSettings =
    settings.ai ??
    ({
      apiKey: settings.apiKey,
      endpoint: settings.endpoint,
      model: settings.model,
      useMockFallback: settings.useMockFallback
    } as Partial<AiSettings>)
  const matchedPreset =
    legacyAiSettings.presetId && legacyAiSettings.presetId !== 'custom-openai-compatible'
      ? getAiModelPreset(legacyAiSettings.presetId)
      : findAiModelPreset(legacyAiSettings.endpoint?.trim() ?? '', legacyAiSettings.model?.trim() ?? '')
  const shouldMigrateMockToPremium = matchedPreset.provider === 'mock' && !legacyAiSettings.apiKey
  const migratedPreset = shouldMigrateMockToPremium ? defaultAiPreset : matchedPreset
  const provider = shouldMigrateMockToPremium
    ? defaultAiPreset.provider
    : legacyAiSettings.provider ?? migratedPreset.provider
  const presetId = shouldMigrateMockToPremium
    ? defaultAiPreset.presetId
    : legacyAiSettings.presetId ?? migratedPreset.presetId

  return {
    ai: {
      ...defaultAiSettings,
      ...legacyAiSettings,
      provider,
      presetId,
      apiKey: legacyAiSettings.apiKey ?? '',
      endpoint:
        provider === 'mock'
          ? ''
          : legacyAiSettings.endpoint?.trim() || migratedPreset.endpoint || defaultAiSettings.endpoint,
      model:
        provider === 'mock'
          ? migratedPreset.model || defaultAiSettings.model
          : shouldMigrateMockToPremium
            ? migratedPreset.model
            : legacyAiSettings.model?.trim() || migratedPreset.model || defaultAiSettings.model,
      useMockFallback:
        provider === 'mock'
          ? true
          : legacyAiSettings.useMockFallback ?? defaultAiSettings.useMockFallback
    },
    defaultBrand: {
      ...defaultAppSettings.defaultBrand,
      ...settings.defaultBrand,
      brandName: settings.defaultBrand?.brandName?.trim() ?? '',
      contactName: settings.defaultBrand?.contactName?.trim() ?? '',
      phone: settings.defaultBrand?.phone?.trim() ?? '',
      email: settings.defaultBrand?.email?.trim() ?? '',
      website: settings.defaultBrand?.website?.trim() ?? ''
    },
    export: {
      ...defaultAppSettings.export,
      ...settings.export,
      defaultExportPath: settings.export?.defaultExportPath?.trim() ?? '',
      pdfFileNamePrefix:
        settings.export?.pdfFileNamePrefix?.trim() || defaultAppSettings.export.pdfFileNamePrefix
    }
  }
}

async function readAppSettings(): Promise<AppSettings> {
  try {
    const raw = await readFile(getSettingsFilePath(), 'utf8')
    const settings = JSON.parse(raw) as Partial<AppSettings> & Partial<AiSettings>

    return normalizeAppSettings(settings)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return defaultAppSettings
    }

    throw error
  }
}

async function writeAppSettings(settings: AppSettings): Promise<AppSettings> {
  const nextSettings = normalizeAppSettings(settings)

  await mkdir(app.getPath('userData'), { recursive: true })
  await writeFile(getSettingsFilePath(), JSON.stringify(nextSettings, null, 2), 'utf8')
  return nextSettings
}

async function readAiSettings(): Promise<AiSettings> {
  const settings = await readAppSettings()
  return settings.ai
}

async function writeAiSettings(settings: AiSettings): Promise<AiSettings> {
  const currentSettings = await readAppSettings()
  const nextSettings = await writeAppSettings({
    ...currentSettings,
    ai: settings
  })

  return nextSettings.ai
}

function makeStarterContent(input: CreateBrochureProjectInput): BrochureContent {
  const productName = input.productName.trim() || input.projectName.trim()
  const sellingPoints = input.coreSellingPoints.trim()
  const audience = input.targetAudiences.length > 0 ? input.targetAudiences.join('、') : '目标客户'

  return {
    coverTitle: productName,
    coverSubtitle: sellingPoints || `面向${audience}的产品宣传方案`,
    productIntro: sellingPoints || `这是一个面向${audience}的宣传册项目，可继续生成完整文案。`,
    keySellingPoints: sellingPoints
      ? sellingPoints
          .split(/[，,、\n]/)
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 5)
      : ['清晰展示产品价值', '匹配目标受众需求', '支持销售和市场转化'],
    targetAudiencePainPoints: [`${audience}需要更清晰的产品认知与决策依据。`],
    solutions: ['通过结构化宣传册内容呈现核心卖点、应用场景和行动路径。'],
    useCases: [input.campaignGoal || '销售拜访、展会沟通、官网资料下载'],
    specifications: [
      { label: '宣传册类型', value: input.brochureFormat },
      { label: '品牌语气', value: input.brandTone || '专业清晰' },
      { label: '目标受众', value: audience }
    ],
    faq: [
      {
        question: '这份宣传册适合哪些场景？',
        answer: input.campaignGoal || '适合产品介绍、销售沟通、活动推广和客户跟进。'
      }
    ],
    sections: [
      {
        title: '产品概览',
        body: sellingPoints || '围绕产品定位、核心价值和使用场景生成宣传册结构。'
      },
      {
        title: '目标受众',
        body: `重点面向${audience}，以${input.brandTone || '专业清晰'}的语气组织内容。`
      },
      {
        title: '转化目标',
        body: input.campaignGoal || '帮助销售和市场团队快速完成对外介绍与线索转化。'
      }
    ],
    callToAction: '预约演示 / 获取报价 / 联系顾问'
  }
}

function createProject(input: CreateBrochureProjectInput): BrochureProject {
  const now = new Date().toISOString()
  const projectName = input.projectName.trim() || input.productName.trim() || '未命名宣传册'
  const productName = input.productName.trim() || projectName
  const brochureFormat = input.brochureFormat || 'product-booklet'

  return {
    id: randomUUID(),
    name: projectName,
    status: '草稿',
    owner: input.owner.trim() || 'Marketing',
    pages: brochureFormatPageCounts[brochureFormat],
    createdAt: now,
    updatedAt: now,
    productInfo: {
      ...input,
      projectName,
      productName,
      brochureFormat,
      owner: input.owner.trim() || 'Marketing',
      targetAudiences: input.targetAudiences ?? []
    },
    content: makeStarterContent(input),
    templateId: defaultTemplateId,
    logoAssetPath: undefined,
    productImageAssetPath: undefined
  }
}

async function generateBrochureContent(projectId: string): Promise<GenerateBrochureContentResult> {
  const projects = await readProjects()
  const projectIndex = projects.findIndex((project) => project.id === projectId)

  if (projectIndex === -1) {
    throw new Error('未找到该宣传册项目。')
  }

  const project = projects[projectIndex]
  const settings = await readAiSettings()
  const { content, usedMock } = await generateBrochureContentForProject(project, settings)
  const recommendedTemplate = getBrochureTemplate(content.recommendedTemplateId)

  const nextProject: BrochureProject = {
    ...project,
    status: '编辑中',
    content,
    templateId: recommendedTemplate.templateId,
    updatedAt: new Date().toISOString()
  }

  projects[projectIndex] = nextProject
  await writeProjects(projects)

  return {
    project: nextProject,
    usedMock
  }
}

function registerProjectHandlers(): void {
  ipcMain.handle('projects:list', async () => readProjects())

  ipcMain.handle('projects:create', async (_event, input: CreateBrochureProjectInput) => {
    const projects = await readProjects()
    const project = createProject(input)
    await writeProjects([project, ...projects])
    return project
  })

  ipcMain.handle('projects:update', async (_event, input: UpdateBrochureProjectInput) => {
    const projects = await readProjects()
    const projectIndex = projects.findIndex((project) => project.id === input.id)

    if (projectIndex === -1) {
      throw new Error('未找到该宣传册项目，无法保存。')
    }

    const nextProject: BrochureProject = {
      ...projects[projectIndex],
      ...input,
      id: projects[projectIndex].id,
      createdAt: projects[projectIndex].createdAt,
      updatedAt: new Date().toISOString()
    }

    projects[projectIndex] = nextProject
    await writeProjects(projects)
    return nextProject
  })

  ipcMain.handle('projects:delete', async (_event, id: string) => {
    const projects = await readProjects()
    const nextProjects = projects.filter((project) => project.id !== id)
    await writeProjects(nextProjects)
    return nextProjects.length !== projects.length
  })

  ipcMain.handle('projects:duplicate', async (_event, id: string) => {
    const projects = await readProjects()
    const sourceProject = projects.find((project) => project.id === id)

    if (!sourceProject) {
      throw new Error('未找到要复制的宣传册项目。')
    }

    const now = new Date().toISOString()
    const duplicate: BrochureProject = {
      ...sourceProject,
      id: randomUUID(),
      name: `${sourceProject.name} 副本`,
      status: '草稿',
      createdAt: now,
      updatedAt: now,
      productInfo: {
        ...sourceProject.productInfo,
        projectName: `${sourceProject.productInfo.projectName} 副本`
      }
    }

    await writeProjects([duplicate, ...projects])
    return duplicate
  })
}

function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', async () => readAppSettings())

  ipcMain.handle('settings:update', async (_event, settings: AppSettings) =>
    writeAppSettings(settings)
  )

  ipcMain.handle('settings:getAi', async () => readAiSettings())

  ipcMain.handle('settings:updateAi', async (_event, settings: AiSettings) => writeAiSettings(settings))
}

function registerAiHandlers(): void {
  ipcMain.handle('ai:generateBrochureContent', async (_event, projectId: string) =>
    generateBrochureContent(projectId)
  )
}

function registerAssetHandlers(): void {
  ipcMain.handle('assets:selectImage', async (event): Promise<UploadedImageAsset | null> => {
    const ownerWindow = BrowserWindow.fromWebContents(event.sender) ?? BrowserWindow.getFocusedWindow()
    const dialogOptions: Electron.OpenDialogOptions = {
      title: '选择图片',
      properties: ['openFile'],
      filters: [
        {
          name: 'Images',
          extensions: ['png', 'jpg', 'jpeg', 'webp']
        }
      ]
    }
    const result = ownerWindow
      ? await dialog.showOpenDialog(ownerWindow, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions)

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const sourcePath = result.filePaths[0]
    const extension = extname(sourcePath).toLowerCase()

    if (!supportedImageExtensions.has(extension)) {
      throw new Error('仅支持 PNG、JPG、JPEG、WEBP 图片。')
    }

    const assetsDirectory = getAssetsDirectoryPath()
    await mkdir(assetsDirectory, { recursive: true })

    const fileName = `${randomUUID()}${extension}`
    const assetPath = join(assetsDirectory, fileName)
    await copyFile(sourcePath, assetPath)

    return {
      assetPath,
      fileName: basename(sourcePath)
    }
  })
}

async function exportBrochurePdf(input: ExportBrochurePdfInput): Promise<ExportBrochurePdfResult> {
  const settings = await readAppSettings()
  const prefix = sanitizeFileName(settings.export.pdfFileNamePrefix || 'brochure') || 'brochure'
  const projectName = sanitizeFileName(input.project.name || input.project.content.coverTitle || 'untitled')
  const defaultFileName = `${prefix}-${projectName}.pdf`
  const defaultPath = settings.export.defaultExportPath
    ? join(settings.export.defaultExportPath, defaultFileName)
    : defaultFileName
  const focusedWindow = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  const result = await dialog.showSaveDialog(focusedWindow, {
    title: '导出 PDF',
    defaultPath,
    filters: [
      {
        name: 'PDF',
        extensions: ['pdf']
      }
    ]
  })

  if (result.canceled || !result.filePath) {
    return {
      filePath: '',
      canceled: true
    }
  }

  const exportWindow = new BrowserWindow({
    show: false,
    width: 794,
    height: 1123,
    webPreferences: {
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  try {
    const html = createPdfHtml(input.project)
    await exportWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    await exportWindow.webContents.executeJavaScript(`
      Promise.all([
        document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(),
        Promise.all(Array.from(document.images).map((image) => {
          if (image.complete) return Promise.resolve()
          return new Promise((resolve) => {
            image.addEventListener('load', resolve, { once: true })
            image.addEventListener('error', resolve, { once: true })
          })
        }))
      ])
    `)

    const pdfBuffer = await exportWindow.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      }
    })

    await writeFile(result.filePath, pdfBuffer)

    return {
      filePath: result.filePath
    }
  } finally {
    exportWindow.destroy()
  }
}

function registerExportHandlers(): void {
  ipcMain.handle('export:pdf', async (_event, input: ExportBrochurePdfInput) => exportBrochurePdf(input))

  ipcMain.handle('export:showInFolder', async (_event, filePath: string) => {
    shell.showItemInFolder(filePath)
  })
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    title: 'Smart Brochure Generator',
    backgroundColor: '#f6f2ea',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDevelopment && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerAssetProtocol()
  registerProjectHandlers()
  registerSettingsHandlers()
  registerAiHandlers()
  registerAssetHandlers()
  registerExportHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
