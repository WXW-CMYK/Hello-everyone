import { Eye, EyeOff, Save } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import type { AppSettings } from '../../../shared/brochure'
import { aiModelPresets, getAiModelPreset } from '../../../shared/modelPresets'

const defaultPreset = getAiModelPreset('claude-opus-4-8')

const defaultSettings: AppSettings = {
  ai: {
    provider: defaultPreset.provider,
    presetId: defaultPreset.presetId,
    apiKey: '',
    endpoint: defaultPreset.endpoint,
    model: defaultPreset.model,
    useMockFallback: false
  },
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

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const selectedPreset = getAiModelPreset(settings.ai.presetId)
  const isMockPreset = selectedPreset.provider === 'mock'

  const handlePresetChange = (presetId: string) => {
    const preset = getAiModelPreset(presetId)

    setSettings((current) => ({
      ...current,
      ai: {
        ...current.ai,
        provider: preset.provider,
        presetId: preset.presetId,
        endpoint: preset.endpoint,
        model: preset.model,
        useMockFallback: preset.provider === 'mock' ? true : current.ai.useMockFallback
      }
    }))
    setMessage(null)
    setError(null)
  }

  useEffect(() => {
    let isMounted = true

    window.appSettings
      .get()
      .then((nextSettings) => {
        if (isMounted) {
          setSettings(nextSettings)
          setError(null)
        }
      })
      .catch((loadError) => {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : '读取设置失败。')
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setMessage(null)
    setError(null)

    try {
      const savedSettings = await window.appSettings.update(settings)
      setSettings(savedSettings)
      setMessage('设置已保存。')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存设置失败，请稍后重试。')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="page settings-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>设置</h1>
          <p className="muted">集中管理 AI 模型、品牌默认信息和导出偏好。</p>
        </div>
        <button className="primary-action" type="submit" form="settings-form" disabled={isSaving || isLoading}>
          <Save size={18} />
          <span>{isSaving ? '保存中' : '保存设置'}</span>
        </button>
      </div>

      <form className="settings-page-form" id="settings-form" onSubmit={handleSubmit}>
        {message ? <div className="form-alert">{message}</div> : null}
        {error ? <div className="form-alert error-alert">{error}</div> : null}

        <section className="settings-section" aria-labelledby="ai-settings-title">
          <div className="settings-section-heading">
            <h2 id="ai-settings-title">AI 模型设置</h2>
            <span>用于生成宣传册结构化文案</span>
          </div>

          <div className="settings-grid">
            <label className="full-field">
              <span>模型预设</span>
              <select
                className="field-select"
                value={settings.ai.presetId}
                onChange={(event) => handlePresetChange(event.target.value)}
              >
                {aiModelPresets.map((preset) => (
                  <option value={preset.presetId} key={preset.presetId}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="model-preset-card full-field">
              <strong>{selectedPreset.label}</strong>
              <span>{selectedPreset.description}</span>
              <p>
                {selectedPreset.requiresApiKey
                  ? '真实接口测试需要填写对应平台的 API Key。'
                  : '本地完整流程测试可直接使用，不需要联网或 API Key。'}
              </p>
            </div>

            <label className="full-field">
              <span>{isMockPreset ? 'API Key（Mock 模式不需要）' : 'API Key'}</span>
              <div className="secret-input">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="输入你的大模型 API Key"
                  value={settings.ai.apiKey}
                  disabled={isMockPreset}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      ai: { ...current.ai, apiKey: event.target.value }
                    }))
                  }
                />
                <button
                  className="icon-button compact"
                  type="button"
                  aria-label={showApiKey ? '隐藏 API Key' : '显示 API Key'}
                  title={showApiKey ? '隐藏 API Key' : '显示 API Key'}
                  onClick={() => setShowApiKey((current) => !current)}
                >
                  {showApiKey ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>

            <label className="full-field">
              <span>Endpoint</span>
              <input
                placeholder="https://api.openai.com/v1/chat/completions"
                value={settings.ai.endpoint}
                disabled={isMockPreset}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    ai: {
                      ...current.ai,
                      endpoint: event.target.value,
                      presetId: 'custom-openai-compatible',
                      provider: 'openai-compatible'
                    }
                  }))
                }
              />
            </label>

            <label>
              <span>Model</span>
              <input
                placeholder="local-mock"
                value={settings.ai.model}
                disabled={isMockPreset}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    ai: {
                      ...current.ai,
                      model: event.target.value,
                      presetId: 'custom-openai-compatible',
                      provider: 'openai-compatible'
                    }
                  }))
                }
              />
            </label>

            <label className="switch-row settings-switch">
              <input
                type="checkbox"
                checked={settings.ai.useMockFallback}
                disabled={isMockPreset}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    ai: { ...current.ai, useMockFallback: event.target.checked }
                  }))
                }
              />
              <span>启用 mock fallback</span>
            </label>
          </div>
        </section>

        <section className="settings-section" aria-labelledby="brand-settings-title">
          <div className="settings-section-heading">
            <h2 id="brand-settings-title">默认品牌信息</h2>
            <span>用于后续创建项目时预填品牌联系信息</span>
          </div>

          <div className="settings-grid">
            <label>
              <span>品牌名称</span>
              <input
                placeholder="例如：Acme Studio"
                value={settings.defaultBrand.brandName}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    defaultBrand: { ...current.defaultBrand, brandName: event.target.value }
                  }))
                }
              />
            </label>

            <label>
              <span>联系人</span>
              <input
                placeholder="例如：张经理"
                value={settings.defaultBrand.contactName}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    defaultBrand: { ...current.defaultBrand, contactName: event.target.value }
                  }))
                }
              />
            </label>

            <label>
              <span>联系电话</span>
              <input
                placeholder="例如：400-000-0000"
                value={settings.defaultBrand.phone}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    defaultBrand: { ...current.defaultBrand, phone: event.target.value }
                  }))
                }
              />
            </label>

            <label>
              <span>邮箱</span>
              <input
                placeholder="hello@example.com"
                value={settings.defaultBrand.email}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    defaultBrand: { ...current.defaultBrand, email: event.target.value }
                  }))
                }
              />
            </label>

            <label className="full-field">
              <span>官网</span>
              <input
                placeholder="https://example.com"
                value={settings.defaultBrand.website}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    defaultBrand: { ...current.defaultBrand, website: event.target.value }
                  }))
                }
              />
            </label>
          </div>
        </section>

        <section className="settings-section" aria-labelledby="export-settings-title">
          <div className="settings-section-heading">
            <h2 id="export-settings-title">导出设置</h2>
            <span>控制默认输出位置和 PDF 文件命名</span>
          </div>

          <div className="settings-grid">
            <label className="full-field">
              <span>默认导出路径</span>
              <input
                placeholder="/Users/yourname/Documents/Brochures"
                value={settings.export.defaultExportPath}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    export: { ...current.export, defaultExportPath: event.target.value }
                  }))
                }
              />
            </label>

            <label>
              <span>PDF 文件名前缀</span>
              <input
                placeholder="brochure"
                value={settings.export.pdfFileNamePrefix}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    export: { ...current.export, pdfFileNamePrefix: event.target.value }
                  }))
                }
              />
            </label>
          </div>
        </section>
      </form>
    </section>
  )
}
