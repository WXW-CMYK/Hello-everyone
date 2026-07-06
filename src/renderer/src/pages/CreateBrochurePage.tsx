import { Download, ImagePlus, LayoutTemplate, Save, Wand2 } from 'lucide-react'
import { FormEvent, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type {
  AiGenerationStatus,
  BrochureProject,
  BrochureFormat,
  CreateBrochureProjectInput,
  TargetAudience,
  UploadedImageAsset
} from '../../../shared/brochure'
import { brochureFormatLabels, brochureFormatPageCounts } from '../../../shared/brochure'

const formats = Object.entries(brochureFormatLabels) as Array<[BrochureFormat, string]>
const audiences: TargetAudience[] = ['企业客户', '门店访客', '渠道代理', '线上投放']

const initialForm: CreateBrochureProjectInput = {
  projectName: '',
  productName: '',
  coreSellingPoints: '',
  brochureFormat: 'product-booklet',
  targetAudiences: ['企业客户'],
  brandTone: '专业、清晰、可信赖',
  campaignGoal: '',
  owner: 'Marketing'
}

export function CreateBrochurePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<CreateBrochureProjectInput>(initialForm)
  const [currentProject, setCurrentProject] = useState<BrochureProject | null>(null)
  const [generationStatus, setGenerationStatus] = useState<AiGenerationStatus>('idle')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [previewImageAsset, setPreviewImageAsset] = useState<UploadedImageAsset | null>(null)
  const [imageMessage, setImageMessage] = useState<string | null>(null)
  const [isSelectingImage, setIsSelectingImage] = useState(false)

  const previewTitle = useMemo(() => {
    if (generationStatus === 'success' && currentProject?.content.coverTitle) {
      return currentProject.content.coverTitle
    }

    return form.productName.trim() || form.projectName.trim() || '宣传册封面预览'
  }, [currentProject?.content.coverTitle, form.productName, form.projectName, generationStatus])

  const previewSubtitle = useMemo(() => {
    if (generationStatus === 'success' && currentProject?.content.coverSubtitle) {
      return currentProject.content.coverSubtitle
    }

    return form.coreSellingPoints.trim() || '这里会展示根据项目资料生成的封面、版式结构和页面节奏。'
  }, [currentProject?.content.coverSubtitle, form.coreSellingPoints, generationStatus])
  const previewImageAssetUrl = previewImageAsset
    ? window.assetStore.toAssetUrl(previewImageAsset.assetPath)
    : null

  const generationStatusLabel: Record<AiGenerationStatus, string> = {
    idle: '未生成',
    generating: '生成中',
    success: '生成成功',
    error: '生成失败'
  }

  const updateField = (field: keyof CreateBrochureProjectInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const toggleAudience = (audience: TargetAudience) => {
    setForm((current) => {
      const exists = current.targetAudiences.includes(audience)
      const targetAudiences = exists
        ? current.targetAudiences.filter((item) => item !== audience)
        : [...current.targetAudiences, audience]

      return { ...current, targetAudiences }
    })
  }

  const validateForm = () => {
    setMessage(null)
    setGenerationError(null)

    if (!form.projectName.trim() && !form.productName.trim()) {
      setMessage('请至少填写项目名称或品牌/产品名称。')
      return false
    }

    return true
  }

  const saveCurrentForm = async () => {
    const projectName = form.projectName.trim() || form.productName.trim() || '未命名宣传册'
    const productName = form.productName.trim() || projectName

    if (!currentProject) {
      const createdProject = await window.brochureStore.createProject({
        ...form,
        projectName,
        productName
      })
      const projectWithImage = previewImageAsset
        ? await window.brochureStore.updateProject({
            id: createdProject.id,
            productImageAssetPath: previewImageAsset.assetPath
          })
        : createdProject

      setCurrentProject(projectWithImage)
      return projectWithImage
    }

    const updatedProject = await window.brochureStore.updateProject({
      id: currentProject.id,
      name: projectName,
      owner: form.owner.trim() || 'Marketing',
      pages: brochureFormatPageCounts[form.brochureFormat],
      productImageAssetPath: previewImageAsset?.assetPath ?? currentProject.productImageAssetPath,
      productInfo: {
        ...form,
        projectName,
        productName,
        owner: form.owner.trim() || 'Marketing',
        targetAudiences: form.targetAudiences
      }
    })

    setCurrentProject(updatedProject)
    return updatedProject
  }

  const handleAddPreviewImage = async () => {
    setImageMessage('正在打开文件选择器...')
    setIsSelectingImage(true)

    try {
      const asset = await window.assetStore.selectImage()

      if (!asset) {
        setImageMessage('已取消选择图片。')
        return
      }

      setPreviewImageAsset(asset)
      setImageMessage('图片已添加到预览，保存草稿或生成方案后会写入项目。')
    } catch (error) {
      setImageMessage(
        error instanceof Error
          ? `添加图片失败：${error.message}`
          : '添加图片失败，请确认图片格式为 PNG、JPG、JPEG 或 WEBP 后重试。'
      )
    } finally {
      setIsSelectingImage(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSaving(true)

    try {
      await saveCurrentForm()
      navigate('/projects')
    } catch (error) {
      setMessage(error instanceof Error ? `保存项目失败：${error.message}` : '保存项目失败，请稍后重试。')
    } finally {
      setIsSaving(false)
    }
  }

  const handleGenerate = async () => {
    if (!validateForm()) {
      setGenerationStatus('error')
      setGenerationError('请先补充项目名称或品牌/产品名称，再生成 AI 文案。')
      return
    }

    setGenerationStatus('generating')
    setGenerationError(null)
    setMessage(null)

    try {
      const project = await saveCurrentForm()
      const result = await window.brochureAi.generateContent(project.id)
      setCurrentProject(result.project)
      setGenerationStatus('success')
      setMessage(
        result.usedMock
          ? '已使用本地 Mock fallback 生成文案。若要验证外部模型质量，请在设置中关闭 mock fallback。'
          : '已使用外部模型生成文案、样式建议并保存到当前项目。'
      )
    } catch (error) {
      setGenerationStatus('error')
      setGenerationError(
        error instanceof Error
          ? `AI 文案生成失败：${error.message}`
          : 'AI 文案生成失败，请检查设置中的 API Key、Endpoint、Model 或开启 mock fallback 后重试。'
      )
    }
  }

  return (
    <section className="page builder-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Builder</p>
          <h1>创建宣传册</h1>
          <p className="muted">填写基础资料，生成结构化 AI 文案并保存到当前项目。</p>
        </div>
        <div className="action-row">
          <button
            className="secondary-action"
            type="submit"
            form="create-brochure-form"
            disabled={isSaving || generationStatus === 'generating'}
          >
            <Save size={18} />
            <span>{isSaving ? '保存中' : '保存草稿'}</span>
          </button>
          <button
            className="primary-action"
            type="button"
            disabled={isSaving || generationStatus === 'generating'}
            onClick={() => void handleGenerate()}
          >
            <Wand2 size={18} />
            <span>{generationStatus === 'generating' ? '生成中' : '生成方案'}</span>
          </button>
        </div>
      </div>

      <div className="builder-layout">
        <form className="form-panel" id="create-brochure-form" onSubmit={handleSubmit}>
          {message ? <div className="form-alert">{message}</div> : null}
          {generationError ? <div className="form-alert error-alert">{generationError}</div> : null}

          <div className={`generation-status ${generationStatus}`}>
            <span>AI 文案状态</span>
            <strong>{generationStatusLabel[generationStatus]}</strong>
          </div>

          <label>
            <span>项目名称</span>
            <input
              placeholder="例如：春季新品宣传册"
              value={form.projectName}
              onChange={(event) => updateField('projectName', event.target.value)}
            />
          </label>

          <label>
            <span>品牌或产品名称</span>
            <input
              placeholder="输入品牌、门店或产品名称"
              value={form.productName}
              onChange={(event) => updateField('productName', event.target.value)}
            />
          </label>

          <label>
            <span>核心卖点</span>
            <textarea
              placeholder="用几句话描述产品优势、受众痛点和转化目标"
              rows={5}
              value={form.coreSellingPoints}
              onChange={(event) => updateField('coreSellingPoints', event.target.value)}
            />
          </label>

          <div className="form-row">
            <label>
              <span>品牌语气</span>
              <input
                placeholder="例如：专业、科技、亲和、高端"
                value={form.brandTone}
                onChange={(event) => updateField('brandTone', event.target.value)}
              />
            </label>

            <label>
              <span>负责人</span>
              <input
                placeholder="例如：Marketing"
                value={form.owner}
                onChange={(event) => updateField('owner', event.target.value)}
              />
            </label>
          </div>

          <label>
            <span>宣传目标</span>
            <input
              placeholder="例如：展会获客、招商加盟、官网下载、销售拜访"
              value={form.campaignGoal}
              onChange={(event) => updateField('campaignGoal', event.target.value)}
            />
          </label>

          <div className="field-group">
            <span>宣传册类型</span>
            <div className="segmented">
              {formats.map(([format, label]) => (
                <button
                  className={form.brochureFormat === format ? 'selected' : ''}
                  type="button"
                  key={format}
                  onClick={() => setForm((current) => ({ ...current, brochureFormat: format }))}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="field-group">
            <span>目标受众</span>
            <div className="checkbox-grid">
              {audiences.map((audience) => (
                <label key={audience}>
                  <input
                    type="checkbox"
                    checked={form.targetAudiences.includes(audience)}
                    onChange={() => toggleAudience(audience)}
                  />
                  <span>{audience}</span>
                </label>
              ))}
            </div>
          </div>
        </form>

        <aside className="preview-panel">
          <div className="preview-toolbar">
            <button
              className="icon-button"
              type="button"
              aria-label="模板会在编辑器中选择"
              title="模板会在编辑器中选择"
              onClick={() => setImageMessage('模板选择在项目编辑器中完成。请先保存或生成方案，再进入项目列表打开编辑器。')}
            >
              <LayoutTemplate size={18} />
            </button>
            <button
              className="icon-button"
              type="button"
              aria-label="添加产品图片"
              title="添加产品图片"
              disabled={isSelectingImage}
              onClick={() => void handleAddPreviewImage()}
            >
              <ImagePlus size={18} />
            </button>
            <button
              className="icon-button"
              type="button"
              aria-label="导出 PDF 在编辑器中完成"
              title="导出 PDF 在编辑器中完成"
              onClick={() => setImageMessage('PDF 导出在项目编辑器中完成。请先保存或生成方案，再进入项目列表打开编辑器。')}
            >
              <Download size={18} />
            </button>
          </div>
          {imageMessage ? <div className="form-alert preview-note">{imageMessage}</div> : null}
          <div className="brochure-preview">
            {previewImageAssetUrl ? (
              <figure className="builder-preview-image">
                <img src={previewImageAssetUrl} alt="Product preview" />
              </figure>
            ) : (
              <div className="preview-accent" />
            )}
            <span>{brochureFormatLabels[form.brochureFormat]}</span>
            <h2>{previewTitle}</h2>
            <p>{previewSubtitle}</p>
            {generationStatus === 'success' && currentProject ? (
              <div className="preview-generated">
                <strong>核心卖点</strong>
                <ul>
                  {currentProject.content.keySellingPoints.slice(0, 3).map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </section>
  )
}
