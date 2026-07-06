import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  FileDown,
  ImagePlus,
  Plus,
  Save,
  Trash2,
  Upload,
  Wand2
} from 'lucide-react'
import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type {
  BrochureContent,
  BrochureFaqItem,
  BrochureProject,
  BrochureSection,
  BrochureSpecification
} from '../../../shared/brochure'
import { brochureTemplates, getBrochureTemplate } from '../../../shared/templates'

type EditorSectionId =
  | 'cover'
  | 'intro'
  | 'sellingPoints'
  | 'painPoints'
  | 'solutions'
  | 'useCases'
  | 'specifications'
  | 'faq'
  | 'cta'

type SaveStatus = 'unsaved' | 'saving' | 'saved' | 'error'
type ExportStatus = 'idle' | 'exporting' | 'success' | 'error'
type AssetUploadStatus = 'idle' | 'selecting' | 'selected' | 'canceled' | 'error'
type ShowFileStatus = 'idle' | 'opening' | 'error'
type RegenerateStatus = 'idle' | 'generating' | 'success' | 'error'

const sectionItems: Array<{ id: EditorSectionId; label: string }> = [
  { id: 'cover', label: '封面' },
  { id: 'intro', label: '产品介绍' },
  { id: 'sellingPoints', label: '核心卖点' },
  { id: 'painPoints', label: '目标痛点' },
  { id: 'solutions', label: '解决方案' },
  { id: 'useCases', label: '应用场景' },
  { id: 'specifications', label: '规格参数' },
  { id: 'faq', label: 'FAQ' },
  { id: 'cta', label: '行动引导' }
]

const saveStatusLabel: Record<SaveStatus, string> = {
  unsaved: '未保存',
  saving: '保存中',
  saved: '已保存',
  error: '保存失败'
}

const exportStatusLabel: Record<ExportStatus, string> = {
  idle: '',
  exporting: '正在导出 PDF...',
  success: 'PDF 导出完成。',
  error: 'PDF 导出失败。'
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}

function normalizeContent(content: BrochureContent): BrochureContent {
  return buildSections({
    coverTitle: content.coverTitle || '',
    coverSubtitle: content.coverSubtitle || '',
    productIntro: content.productIntro || content.sections?.[0]?.body || '',
    keySellingPoints: Array.isArray(content.keySellingPoints) ? content.keySellingPoints : [],
    targetAudiencePainPoints: Array.isArray(content.targetAudiencePainPoints)
      ? content.targetAudiencePainPoints
      : [],
    solutions: Array.isArray(content.solutions) ? content.solutions : [],
    useCases: Array.isArray(content.useCases) ? content.useCases : [],
    specifications: Array.isArray(content.specifications) ? content.specifications : [],
    faq: Array.isArray(content.faq) ? content.faq : [],
    sections: [],
    callToAction: content.callToAction || ''
  })
}

function buildSections(content: BrochureContent): BrochureContent {
  const sections: BrochureSection[] = [
    { title: '产品介绍', body: content.productIntro },
    { title: '核心卖点', body: content.keySellingPoints.join('\n') },
    { title: '目标客户痛点', body: content.targetAudiencePainPoints.join('\n') },
    { title: '解决方案', body: content.solutions.join('\n') },
    { title: '应用场景', body: content.useCases.join('\n') },
    {
      title: '规格参数',
      body: content.specifications.map((item) => `${item.label}: ${item.value}`).join('\n')
    },
    {
      title: 'FAQ',
      body: content.faq.map((item) => `${item.question}\n${item.answer}`).join('\n\n')
    }
  ].filter((section) => section.body.trim())

  return {
    ...content,
    sections
  }
}

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function joinLines(value: string[]): string {
  return value.join('\n')
}

export function BrochureEditorPage() {
  const { id } = useParams()
  const [project, setProject] = useState<BrochureProject | null>(null)
  const [content, setContent] = useState<BrochureContent | null>(null)
  const [templateId, setTemplateId] = useState<string>('business-clean')
  const [logoAssetPath, setLogoAssetPath] = useState<string | undefined>()
  const [productImageAssetPath, setProductImageAssetPath] = useState<string | undefined>()
  const [selectedSection, setSelectedSection] = useState<EditorSectionId>('cover')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle')
  const [exportMessage, setExportMessage] = useState<string | null>(null)
  const [exportedFilePath, setExportedFilePath] = useState<string | null>(null)
  const [showFileStatus, setShowFileStatus] = useState<ShowFileStatus>('idle')
  const [assetUploadStatus, setAssetUploadStatus] = useState<AssetUploadStatus>('idle')
  const [assetMessage, setAssetMessage] = useState<string | null>(null)
  const [regenerateStatus, setRegenerateStatus] = useState<RegenerateStatus>('idle')
  const [regenerateMessage, setRegenerateMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadProject() {
      setIsLoading(true)
      setLoadError(null)

      try {
        const projects = await window.brochureStore.listProjects()
        const nextProject = projects.find((item) => item.id === id)

        if (!nextProject) {
          throw new Error('未找到该宣传册项目。')
        }

        if (isMounted) {
          setProject(nextProject)
          setContent(normalizeContent(nextProject.content))
          setTemplateId(getBrochureTemplate(nextProject.templateId).templateId)
          setLogoAssetPath(nextProject.logoAssetPath)
          setProductImageAssetPath(nextProject.productImageAssetPath)
          setSaveStatus('saved')
          if (!nextProject.content.designNotes || nextProject.content.designNotes.length === 0) {
            setRegenerateStatus('idle')
            setRegenerateMessage('当前项目可能是旧版生成结果。可点击“重新生成”使用当前外部模型刷新文案和样式。')
          } else {
            setRegenerateStatus('idle')
            setRegenerateMessage(null)
          }
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(error instanceof Error ? error.message : '读取项目失败。')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadProject()

    return () => {
      isMounted = false
    }
  }, [id])

  const previewSections = useMemo(() => {
    if (!content) {
      return []
    }

    return [
      { title: '产品介绍', items: [content.productIntro] },
      { title: '核心卖点', items: content.keySellingPoints },
      { title: '目标客户痛点', items: content.targetAudiencePainPoints },
      { title: '解决方案', items: content.solutions },
      { title: '应用场景', items: content.useCases }
    ].filter((section) => section.items.some((item) => item.trim()))
  }, [content])

  const activeTemplate = useMemo(() => getBrochureTemplate(templateId), [templateId])
  const logoAssetUrl = logoAssetPath ? window.assetStore.toAssetUrl(logoAssetPath) : null
  const productImageAssetUrl = productImageAssetPath
    ? window.assetStore.toAssetUrl(productImageAssetPath)
    : null

  const templateStyle = useMemo(
    () =>
      ({
        '--template-primary': activeTemplate.primaryColor,
        '--template-accent': activeTemplate.accentColor,
        '--template-bg': activeTemplate.backgroundColor,
        '--template-text': activeTemplate.textColor
      }) as CSSProperties,
    [activeTemplate]
  )

  const updateContent = (updater: (current: BrochureContent) => BrochureContent) => {
    setContent((current) => {
      if (!current) {
        return current
      }

      const nextContent = buildSections(updater(current))
      setSaveStatus('unsaved')
      setSaveError(null)
      return nextContent
    })
  }

  const handleTemplateChange = (nextTemplateId: string) => {
    setTemplateId(nextTemplateId)
    setSaveStatus('unsaved')
    setSaveError(null)
  }

  const handleUploadAsset = async (assetType: 'logo' | 'product') => {
    setSaveError(null)
    setAssetUploadStatus('selecting')
    setAssetMessage('正在打开文件选择器...')

    try {
      const asset = await window.assetStore.selectImage()

      if (!asset) {
        setAssetUploadStatus('canceled')
        setAssetMessage('已取消选择。')
        return
      }

      if (assetType === 'logo') {
        setLogoAssetPath(asset.assetPath)
      } else {
        setProductImageAssetPath(asset.assetPath)
      }

      setSaveStatus('unsaved')
      setAssetUploadStatus('selected')
      setAssetMessage(assetType === 'logo' ? 'Logo 已添加，记得保存项目。' : '产品图片已添加，记得保存项目。')
    } catch (error) {
      setSaveStatus('error')
      setAssetUploadStatus('error')
      setAssetMessage(
        error instanceof Error
          ? `上传图片失败：${error.message}`
          : '上传图片失败，请确认图片格式为 PNG、JPG、JPEG 或 WEBP 后重试。'
      )
    }
  }

  const handleRemoveAsset = (assetType: 'logo' | 'product') => {
    if (assetType === 'logo') {
      setLogoAssetPath(undefined)
    } else {
      setProductImageAssetPath(undefined)
    }

    setSaveStatus('unsaved')
    setSaveError(null)
    setAssetUploadStatus('idle')
    setAssetMessage(null)
  }

  const handleSave = async () => {
    if (!project || !content) {
      return
    }

    setSaveStatus('saving')
    setSaveError(null)
    setExportMessage(null)

    try {
      const updatedProject = await window.brochureStore.updateProject({
        id: project.id,
        content: buildSections(content),
        templateId,
        logoAssetPath,
        productImageAssetPath,
        status: project.status === '草稿' ? '编辑中' : project.status
      })
      setProject(updatedProject)
      setContent(normalizeContent(updatedProject.content))
      setTemplateId(getBrochureTemplate(updatedProject.templateId).templateId)
      setLogoAssetPath(updatedProject.logoAssetPath)
      setProductImageAssetPath(updatedProject.productImageAssetPath)
      setSaveStatus('saved')
    } catch (error) {
      setSaveStatus('error')
      setSaveError(error instanceof Error ? `保存项目失败：${error.message}` : '保存项目失败，请稍后重试。')
    }
  }

  const buildExportProject = (): BrochureProject | null => {
    if (!project || !content) {
      return null
    }

    return {
      ...project,
      content: buildSections(content),
      templateId,
      logoAssetPath,
      productImageAssetPath
    }
  }

  const handleExportPdf = async () => {
    const exportProject = buildExportProject()

    if (!exportProject) {
      setExportStatus('error')
      setExportMessage('PDF 导出失败：项目数据尚未加载完成，请稍后重试。')
      return
    }

    setExportStatus('exporting')
    setExportMessage(exportStatusLabel.exporting)
    setExportedFilePath(null)
    setShowFileStatus('idle')

    try {
      const hasUnsavedChanges = saveStatus === 'unsaved' || saveStatus === 'error'
      const projectForExport = hasUnsavedChanges
        ? await window.brochureStore.updateProject({
            id: exportProject.id,
            content: exportProject.content,
            templateId,
            logoAssetPath,
            productImageAssetPath,
            status: exportProject.status === '草稿' ? '编辑中' : exportProject.status
          })
        : exportProject

      if (hasUnsavedChanges) {
        setProject(projectForExport)
        setContent(normalizeContent(projectForExport.content))
        setTemplateId(getBrochureTemplate(projectForExport.templateId).templateId)
        setLogoAssetPath(projectForExport.logoAssetPath)
        setProductImageAssetPath(projectForExport.productImageAssetPath)
        setSaveStatus('saved')
      }

      const result = await window.brochureExport.exportPdf({ project: projectForExport })

      if (result.canceled) {
        setExportStatus('idle')
        setExportMessage('已取消 PDF 导出。')
        return
      }

      setExportStatus('success')
      setExportMessage(exportStatusLabel.success)
      setExportedFilePath(result.filePath)
    } catch (error) {
      setExportStatus('error')
      setExportMessage(
        error instanceof Error
          ? `PDF 导出失败：${error.message}`
          : 'PDF 导出失败，请检查导出路径是否可写后重试。'
      )
    }
  }

  const handleShowExportedFile = async () => {
    if (!exportedFilePath) {
      setExportStatus('error')
      setExportMessage('无法打开文件所在位置：还没有可打开的 PDF 文件。')
      return
    }

    setShowFileStatus('opening')

    try {
      await window.brochureExport.showInFolder(exportedFilePath)
      setShowFileStatus('idle')
    } catch (error) {
      setShowFileStatus('error')
      setExportStatus('error')
      setExportMessage(error instanceof Error ? `无法打开文件所在位置：${error.message}` : '无法打开文件所在位置。')
    }
  }

  const handleRegenerateContent = async () => {
    if (!project) {
      return
    }

    if (saveStatus === 'unsaved') {
      const shouldContinue = window.confirm('重新生成会覆盖当前未保存的文案内容。确定继续吗？')

      if (!shouldContinue) {
        return
      }
    }

    setRegenerateStatus('generating')
    setRegenerateMessage('正在使用外部模型重新生成文案和样式建议...')
    setSaveError(null)
    setExportMessage(null)

    try {
      const result = await window.brochureAi.generateContent(project.id)
      const nextProject = result.project

      setProject(nextProject)
      setContent(normalizeContent(nextProject.content))
      setTemplateId(getBrochureTemplate(nextProject.templateId).templateId)
      setLogoAssetPath(nextProject.logoAssetPath)
      setProductImageAssetPath(nextProject.productImageAssetPath)
      setSaveStatus('saved')
      setRegenerateStatus('success')
      setRegenerateMessage(
        result.usedMock
          ? '已使用本地 Mock 重新生成。若要验证外部模型，请关闭 mock fallback。'
          : '已使用外部模型重新生成，并应用推荐模板。'
      )
    } catch (error) {
      setRegenerateStatus('error')
      setRegenerateMessage(
        error instanceof Error
          ? `重新生成失败：${error.message}`
          : '重新生成失败，请检查模型设置和网络后重试。'
      )
    }
  }

  const updateSpec = (index: number, patch: Partial<BrochureSpecification>) => {
    updateContent((current) => ({
      ...current,
      specifications: current.specifications.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    }))
  }

  const updateFaq = (index: number, patch: Partial<BrochureFaqItem>) => {
    updateContent((current) => ({
      ...current,
      faq: current.faq.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
    }))
  }

  if (isLoading) {
    return (
      <section className="page editor-page">
        <div className="table-empty">正在打开宣传册编辑器...</div>
      </section>
    )
  }

  if (loadError || !project || !content) {
    return (
      <section className="page editor-page">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Editor</p>
            <h1>无法打开项目</h1>
            <p className="muted">{loadError || '项目数据不可用。'}</p>
          </div>
          <Link className="secondary-action" to="/projects">
            <ArrowLeft size={18} />
            <span>返回项目列表</span>
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="page editor-page">
      <div className="editor-topbar">
        <div>
          <p className="eyebrow">Editor</p>
          <h1>{project.name}</h1>
          <div className="editor-meta">
            <span className="status-pill">{project.status}</span>
            <span>
              <CalendarDays size={15} />
              更新时间 {formatDateTime(project.updatedAt)}
            </span>
            <span className={`save-status ${saveStatus}`}>{saveStatusLabel[saveStatus]}</span>
          </div>
        </div>
        <div className="action-row">
          <label className="template-select">
            <span>模板</span>
            <select value={templateId} onChange={(event) => handleTemplateChange(event.target.value)}>
              {brochureTemplates.map((template) => (
                <option value={template.templateId} key={template.templateId}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>
          <Link className="secondary-action" to="/projects">
            <ArrowLeft size={18} />
            <span>返回项目列表</span>
          </Link>
          <button
            className="secondary-action"
            type="button"
            disabled={
              regenerateStatus === 'generating' ||
              exportStatus === 'exporting' ||
              saveStatus === 'saving'
            }
            title="使用当前模型重新生成文案和样式建议"
            onClick={() => void handleRegenerateContent()}
          >
            <Wand2 size={18} />
            <span>{regenerateStatus === 'generating' ? '生成中' : '重新生成'}</span>
          </button>
          <button
            className="secondary-action"
            type="button"
            disabled={exportStatus === 'exporting' || saveStatus === 'saving'}
            title={saveStatus === 'saving' ? '保存完成后才能导出 PDF' : '导出 PDF'}
            onClick={() => void handleExportPdf()}
          >
            <FileDown size={18} />
            <span>{exportStatus === 'exporting' ? '导出中' : '导出 PDF'}</span>
          </button>
          <button
            className="primary-action"
            type="button"
            disabled={saveStatus === 'saving' || exportStatus === 'exporting'}
            title={exportStatus === 'exporting' ? 'PDF 导出中，暂不能保存' : '保存项目'}
            onClick={() => void handleSave()}
          >
            <Save size={18} />
            <span>{saveStatus === 'saving' ? '保存中' : '保存'}</span>
          </button>
        </div>
      </div>

      {saveError ? <div className="form-alert error-alert">{saveError}</div> : null}
      {regenerateMessage ? (
        <div className={`form-alert ${regenerateStatus === 'error' ? 'error-alert' : ''}`}>
          {regenerateMessage}
        </div>
      ) : null}
      {exportMessage ? (
        <div className={`form-alert export-alert ${exportStatus === 'error' ? 'error-alert' : ''}`}>
          <span>{exportMessage}</span>
          {exportStatus === 'success' && exportedFilePath ? (
            <button
              className="secondary-action compact-action"
              type="button"
              disabled={showFileStatus === 'opening'}
              onClick={() => void handleShowExportedFile()}
            >
              <ExternalLink size={16} />
              <span>{showFileStatus === 'opening' ? '打开中' : '打开文件所在位置'}</span>
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="editor-layout">
        <aside className="editor-sidebar">
          <span className="panel-title">页面 / 章节</span>
          <nav className="editor-section-nav" aria-label="Brochure sections">
            {sectionItems.map((item) => (
              <button
                className={selectedSection === item.id ? 'active' : ''}
                type="button"
                key={item.id}
                onClick={() => setSelectedSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="editor-preview">
          <article
            className={`brochure-page-preview template-${activeTemplate.layoutStyle}`}
            style={templateStyle}
          >
            <section className="preview-cover">
              <div className="preview-cover-content">
                {logoAssetUrl ? (
                  <img className="preview-logo" src={logoAssetUrl} alt="Logo" />
                ) : (
                  <span>{activeTemplate.name}</span>
                )}
                <h2>{content.coverTitle || '封面标题'}</h2>
                <p>{content.coverSubtitle || '封面副标题'}</p>
              </div>
              {productImageAssetUrl ? (
                <figure className="preview-product-image">
                  <img src={productImageAssetUrl} alt="Product" />
                </figure>
              ) : null}
            </section>

            <section className="preview-body">
              {previewSections.map((section) => (
                <div className="preview-section" key={section.title}>
                  <h3>{section.title}</h3>
                  {section.items.length === 1 ? (
                    <p>{section.items[0]}</p>
                  ) : (
                    <ul>
                      {section.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}

              {content.specifications.length > 0 ? (
                <div className="preview-section">
                  <h3>规格参数</h3>
                  <dl className="preview-specs">
                    {content.specifications.map((item) => (
                      <div key={`${item.label}-${item.value}`}>
                        <dt>{item.label}</dt>
                        <dd>{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}

              {content.faq.length > 0 ? (
                <div className="preview-section">
                  <h3>FAQ</h3>
                  <div className="preview-faq">
                    {content.faq.map((item) => (
                      <div key={item.question}>
                        <strong>{item.question}</strong>
                        <p>{item.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="preview-cta">{content.callToAction || '行动引导'}</div>
            </section>
          </article>
        </main>

        <aside className="editor-properties">
          <span className="panel-title">属性编辑</span>

          <div className="template-panel">
            <span>当前模板</span>
            <strong>{activeTemplate.name}</strong>
            <p>{activeTemplate.description}</p>
            <div className="template-swatches" aria-label="Template colors">
              <i style={{ background: activeTemplate.primaryColor }} />
              <i style={{ background: activeTemplate.accentColor }} />
              <i style={{ background: activeTemplate.backgroundColor }} />
            </div>
            {content.designNotes && content.designNotes.length > 0 ? (
              <div className="design-notes">
                <span>AI 样式建议</span>
                <ul>
                  {content.designNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="asset-panel">
            <span className="panel-title">品牌图片</span>
            {assetMessage ? (
              <div className={`asset-message ${assetUploadStatus === 'error' ? 'error' : ''}`}>
                {assetMessage}
              </div>
            ) : null}
            <div className="asset-actions">
              <button
                className="secondary-action"
                type="button"
                disabled={assetUploadStatus === 'selecting'}
                onClick={() => void handleUploadAsset('logo')}
              >
                <Upload size={17} />
                <span>{assetUploadStatus === 'selecting' ? '选择中' : '上传 Logo'}</span>
              </button>
              <button
                className="secondary-action danger-action"
                type="button"
                disabled={!logoAssetPath || assetUploadStatus === 'selecting'}
                onClick={() => handleRemoveAsset('logo')}
              >
                <Trash2 size={16} />
                <span>删除 Logo</span>
              </button>
            </div>
            {logoAssetUrl ? (
              <div className="asset-thumb logo-thumb">
                <img src={logoAssetUrl} alt="Logo preview" />
              </div>
            ) : (
              <p>未上传 Logo。</p>
            )}

            <div className="asset-actions">
              <button
                className="secondary-action"
                type="button"
                disabled={assetUploadStatus === 'selecting'}
                onClick={() => void handleUploadAsset('product')}
              >
                <ImagePlus size={17} />
                <span>{assetUploadStatus === 'selecting' ? '选择中' : '上传产品图片'}</span>
              </button>
              <button
                className="secondary-action danger-action"
                type="button"
                disabled={!productImageAssetPath || assetUploadStatus === 'selecting'}
                onClick={() => handleRemoveAsset('product')}
              >
                <Trash2 size={16} />
                <span>删除产品图片</span>
              </button>
            </div>
            {productImageAssetUrl ? (
              <div className="asset-thumb product-thumb">
                <img src={productImageAssetUrl} alt="Product preview" />
              </div>
            ) : (
              <p>未上传产品图片。</p>
            )}
          </div>

          {selectedSection === 'cover' ? (
            <div className="property-group">
              <label>
                <span>封面标题</span>
                <input
                  value={content.coverTitle}
                  onChange={(event) =>
                    updateContent((current) => ({ ...current, coverTitle: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>封面副标题</span>
                <textarea
                  rows={4}
                  value={content.coverSubtitle}
                  onChange={(event) =>
                    updateContent((current) => ({ ...current, coverSubtitle: event.target.value }))
                  }
                />
              </label>
            </div>
          ) : null}

          {selectedSection === 'intro' ? (
            <div className="property-group">
              <label>
                <span>产品介绍</span>
                <textarea
                  rows={10}
                  value={content.productIntro}
                  onChange={(event) =>
                    updateContent((current) => ({ ...current, productIntro: event.target.value }))
                  }
                />
              </label>
            </div>
          ) : null}

          {selectedSection === 'sellingPoints' ? (
            <TextListEditor
              label="核心卖点"
              value={content.keySellingPoints}
              onChange={(value) => updateContent((current) => ({ ...current, keySellingPoints: value }))}
            />
          ) : null}

          {selectedSection === 'painPoints' ? (
            <TextListEditor
              label="目标客户痛点"
              value={content.targetAudiencePainPoints}
              onChange={(value) =>
                updateContent((current) => ({ ...current, targetAudiencePainPoints: value }))
              }
            />
          ) : null}

          {selectedSection === 'solutions' ? (
            <TextListEditor
              label="解决方案"
              value={content.solutions}
              onChange={(value) => updateContent((current) => ({ ...current, solutions: value }))}
            />
          ) : null}

          {selectedSection === 'useCases' ? (
            <TextListEditor
              label="应用场景"
              value={content.useCases}
              onChange={(value) => updateContent((current) => ({ ...current, useCases: value }))}
            />
          ) : null}

          {selectedSection === 'specifications' ? (
            <div className="property-group">
              {content.specifications.map((item, index) => (
                <div className="property-pair" key={`${index}-${item.label}`}>
                  <input
                    placeholder="参数名"
                    value={item.label}
                    onChange={(event) => updateSpec(index, { label: event.target.value })}
                  />
                  <input
                    placeholder="参数值"
                    value={item.value}
                    onChange={(event) => updateSpec(index, { value: event.target.value })}
                  />
                  <button
                    className="icon-button compact danger"
                    type="button"
                    aria-label="删除规格参数"
                    onClick={() =>
                      updateContent((current) => ({
                        ...current,
                        specifications: current.specifications.filter((_, itemIndex) => itemIndex !== index)
                      }))
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                className="secondary-action"
                type="button"
                onClick={() =>
                  updateContent((current) => ({
                    ...current,
                    specifications: [...current.specifications, { label: '', value: '' }]
                  }))
                }
              >
                <Plus size={17} />
                <span>添加规格</span>
              </button>
            </div>
          ) : null}

          {selectedSection === 'faq' ? (
            <div className="property-group">
              {content.faq.map((item, index) => (
                <div className="faq-editor-item" key={`${index}-${item.question}`}>
                  <label>
                    <span>问题</span>
                    <input
                      value={item.question}
                      onChange={(event) => updateFaq(index, { question: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>回答</span>
                    <textarea
                      rows={4}
                      value={item.answer}
                      onChange={(event) => updateFaq(index, { answer: event.target.value })}
                    />
                  </label>
                  <button
                    className="secondary-action danger-action"
                    type="button"
                    onClick={() =>
                      updateContent((current) => ({
                        ...current,
                        faq: current.faq.filter((_, itemIndex) => itemIndex !== index)
                      }))
                    }
                  >
                    <Trash2 size={16} />
                    <span>删除 FAQ</span>
                  </button>
                </div>
              ))}
              <button
                className="secondary-action"
                type="button"
                onClick={() =>
                  updateContent((current) => ({
                    ...current,
                    faq: [...current.faq, { question: '', answer: '' }]
                  }))
                }
              >
                <Plus size={17} />
                <span>添加 FAQ</span>
              </button>
            </div>
          ) : null}

          {selectedSection === 'cta' ? (
            <div className="property-group">
              <label>
                <span>行动引导</span>
                <textarea
                  rows={5}
                  value={content.callToAction}
                  onChange={(event) =>
                    updateContent((current) => ({ ...current, callToAction: event.target.value }))
                  }
                />
              </label>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  )
}

function TextListEditor({
  label,
  value,
  onChange
}: {
  label: string
  value: string[]
  onChange: (value: string[]) => void
}) {
  return (
    <div className="property-group">
      <label>
        <span>{label}</span>
        <textarea rows={12} value={joinLines(value)} onChange={(event) => onChange(splitLines(event.target.value))} />
      </label>
      <p className="field-help">每行一条内容，预览会实时更新。</p>
    </div>
  )
}
