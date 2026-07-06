import type { BrochureTemplate } from './brochure'

export const defaultTemplateId = 'business-clean'

export const brochureTemplates: BrochureTemplate[] = [
  {
    templateId: 'business-clean',
    name: '商务简洁',
    description: '稳重清晰的企业宣传册版式，适合方案介绍、销售材料和常规产品手册。',
    primaryColor: '#1f2a2a',
    accentColor: '#d99a45',
    backgroundColor: '#fffdfa',
    textColor: '#26302f',
    layoutStyle: 'business-clean'
  },
  {
    templateId: 'tech-product',
    name: '科技产品',
    description: '冷静、模块化的科技产品视觉，适合 SaaS、硬件、智能设备和技术服务。',
    primaryColor: '#173a5e',
    accentColor: '#1fb6a6',
    backgroundColor: '#f5fbff',
    textColor: '#17232f',
    layoutStyle: 'tech-product'
  },
  {
    templateId: 'premium-brand',
    name: '高端品牌',
    description: '克制优雅的高端品牌风格，适合精品服务、生活方式品牌和高客单产品。',
    primaryColor: '#2b2622',
    accentColor: '#b9955b',
    backgroundColor: '#fbf7ef',
    textColor: '#28241f',
    layoutStyle: 'premium-brand'
  },
  {
    templateId: 'event-flyer',
    name: '展会单页',
    description: '信息集中、行动明确的活动单页版式，适合展会获客、发布会和促销活动。',
    primaryColor: '#245348',
    accentColor: '#e05d3f',
    backgroundColor: '#fffaf1',
    textColor: '#202b29',
    layoutStyle: 'event-flyer'
  }
]

export function getBrochureTemplate(templateId: string | undefined): BrochureTemplate {
  return (
    brochureTemplates.find((template) => template.templateId === templateId) ??
    brochureTemplates.find((template) => template.templateId === defaultTemplateId) ??
    brochureTemplates[0]
  )
}
