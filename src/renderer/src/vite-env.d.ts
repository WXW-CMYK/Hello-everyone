/// <reference types="vite/client" />

import type {
  AppSettings,
  AiSettings,
  BrochureProject,
  CreateBrochureProjectInput,
  ExportBrochurePdfInput,
  ExportBrochurePdfResult,
  GenerateBrochureContentResult,
  UploadedImageAsset,
  UpdateBrochureProjectInput
} from '../../shared/brochure'

declare global {
  interface Window {
    electronAPI: {
      platform: NodeJS.Platform
    }
    brochureStore: {
      listProjects: () => Promise<BrochureProject[]>
      createProject: (input: CreateBrochureProjectInput) => Promise<BrochureProject>
      updateProject: (input: UpdateBrochureProjectInput) => Promise<BrochureProject>
      deleteProject: (id: string) => Promise<boolean>
      duplicateProject: (id: string) => Promise<BrochureProject>
    }
    appSettings: {
      get: () => Promise<AppSettings>
      update: (settings: AppSettings) => Promise<AppSettings>
      getAi: () => Promise<AiSettings>
      updateAi: (settings: AiSettings) => Promise<AiSettings>
    }
    brochureAi: {
      generateContent: (projectId: string) => Promise<GenerateBrochureContentResult>
    }
    assetStore: {
      selectImage: () => Promise<UploadedImageAsset | null>
      toAssetUrl: (assetPath: string) => string
    }
    brochureExport: {
      exportPdf: (input: ExportBrochurePdfInput) => Promise<ExportBrochurePdfResult>
      showInFolder: (filePath: string) => Promise<void>
    }
  }
}
