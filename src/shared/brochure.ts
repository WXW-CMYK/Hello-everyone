export type BrochureFormat = 'tri-fold' | 'product-booklet' | 'partner-deck' | 'event-flyer'

export type ProjectStatus = '草稿' | '编辑中' | '待审核' | '已导出'

export type TargetAudience = '企业客户' | '门店访客' | '渠道代理' | '线上投放'

export interface ProductInfo {
  projectName: string
  productName: string
  coreSellingPoints: string
  brochureFormat: BrochureFormat
  targetAudiences: TargetAudience[]
  brandTone: string
  campaignGoal: string
  owner: string
}

export interface BrochureSection {
  title: string
  body: string
}

export interface BrochureSpecification {
  label: string
  value: string
}

export interface BrochureFaqItem {
  question: string
  answer: string
}

export interface BrochureContent {
  coverTitle: string
  coverSubtitle: string
  productIntro: string
  keySellingPoints: string[]
  targetAudiencePainPoints: string[]
  solutions: string[]
  useCases: string[]
  specifications: BrochureSpecification[]
  faq: BrochureFaqItem[]
  sections: BrochureSection[]
  callToAction: string
  recommendedTemplateId?: string
  designNotes?: string[]
}

export interface BrochureProject {
  id: string
  name: string
  status: ProjectStatus
  owner: string
  pages: number
  createdAt: string
  updatedAt: string
  productInfo: ProductInfo
  content: BrochureContent
  templateId: string
  logoAssetPath?: string
  productImageAssetPath?: string
}

export type BrochureTemplateLayoutStyle = 'business-clean' | 'tech-product' | 'premium-brand' | 'event-flyer'

export interface BrochureTemplate {
  templateId: string
  name: string
  description: string
  primaryColor: string
  accentColor: string
  backgroundColor: string
  textColor: string
  layoutStyle: BrochureTemplateLayoutStyle
}

export interface UploadedImageAsset {
  assetPath: string
  fileName: string
}

export interface ExportBrochurePdfInput {
  project: BrochureProject
}

export interface ExportBrochurePdfResult {
  filePath: string
  canceled?: boolean
}

export type CreateBrochureProjectInput = ProductInfo

export type UpdateBrochureProjectInput = Partial<Omit<BrochureProject, 'id' | 'createdAt'>> & {
  id: string
}

export type AiGenerationStatus = 'idle' | 'generating' | 'success' | 'error'

export type AiProvider = 'mock' | 'openai-compatible' | 'anthropic'

export interface AiSettings {
  provider: AiProvider
  presetId: string
  apiKey: string
  endpoint: string
  model: string
  useMockFallback: boolean
}

export interface DefaultBrandSettings {
  brandName: string
  contactName: string
  phone: string
  email: string
  website: string
}

export interface ExportSettings {
  defaultExportPath: string
  pdfFileNamePrefix: string
}

export interface AppSettings {
  ai: AiSettings
  defaultBrand: DefaultBrandSettings
  export: ExportSettings
}

export interface GenerateBrochureContentInput {
  projectId: string
}

export interface GenerateBrochureContentResult {
  project: BrochureProject
  usedMock: boolean
}

export const brochureFormatLabels: Record<BrochureFormat, string> = {
  'tri-fold': '三折页',
  'product-booklet': '产品手册',
  'partner-deck': '招商册',
  'event-flyer': '活动单页'
}

export const brochureFormatPageCounts: Record<BrochureFormat, number> = {
  'tri-fold': 6,
  'product-booklet': 8,
  'partner-deck': 12,
  'event-flyer': 2
}
