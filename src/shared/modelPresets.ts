import type { AiProvider } from './brochure'

export interface AiModelPreset {
  presetId: string
  label: string
  provider: AiProvider
  endpoint: string
  model: string
  requiresApiKey: boolean
  description: string
}

export const aiModelPresets: AiModelPreset[] = [
  {
    presetId: 'claude-opus-4-8',
    label: 'Claude Opus 4.8（质量优先）',
    provider: 'anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-opus-4-8',
    requiresApiKey: true,
    description: '质量优先的外部模型，适合宣传册策略、长文案和高要求表达。'
  },
  {
    presetId: 'local-mock',
    label: '本地 Mock 模型',
    provider: 'mock',
    endpoint: '',
    model: 'local-mock',
    requiresApiKey: false,
    description: '默认测试模式，不调用外部接口，不需要 API Key。'
  },
  {
    presetId: 'openai-gpt-4o-mini',
    label: 'OpenAI GPT-4o mini',
    provider: 'openai-compatible',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    requiresApiKey: true,
    description: 'OpenAI 兼容 Chat Completions 接口。'
  },
  {
    presetId: 'deepseek-chat',
    label: 'DeepSeek Chat',
    provider: 'openai-compatible',
    endpoint: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat',
    requiresApiKey: true,
    description: 'DeepSeek 的 OpenAI 兼容接口。'
  },
  {
    presetId: 'qwen-plus',
    label: '通义千问 Qwen Plus',
    provider: 'openai-compatible',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen-plus',
    requiresApiKey: true,
    description: '阿里云 DashScope OpenAI 兼容模式。'
  },
  {
    presetId: 'claude-sonnet',
    label: 'Claude Sonnet',
    provider: 'anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-5',
    requiresApiKey: true,
    description: 'Anthropic Messages API。'
  },
  {
    presetId: 'custom-openai-compatible',
    label: '自定义 OpenAI 兼容接口',
    provider: 'openai-compatible',
    endpoint: 'https://api.example.com/v1/chat/completions',
    model: 'your-model-name',
    requiresApiKey: true,
    description: '用于兼容 OpenAI Chat Completions 协议的私有或第三方接口。'
  }
]

export function getAiModelPreset(presetId: string): AiModelPreset {
  return aiModelPresets.find((preset) => preset.presetId === presetId) ?? aiModelPresets[0]
}

export function findAiModelPreset(endpoint: string, model: string): AiModelPreset {
  return (
    aiModelPresets.find((preset) => preset.endpoint === endpoint && preset.model === model) ??
    aiModelPresets[0]
  )
}
