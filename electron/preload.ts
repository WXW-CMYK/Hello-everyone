import { contextBridge, ipcRenderer } from 'electron'
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
} from '../src/shared/brochure'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform
})

contextBridge.exposeInMainWorld('brochureStore', {
  listProjects: () => ipcRenderer.invoke('projects:list') as Promise<BrochureProject[]>,
  createProject: (input: CreateBrochureProjectInput) =>
    ipcRenderer.invoke('projects:create', input) as Promise<BrochureProject>,
  updateProject: (input: UpdateBrochureProjectInput) =>
    ipcRenderer.invoke('projects:update', input) as Promise<BrochureProject>,
  deleteProject: (id: string) => ipcRenderer.invoke('projects:delete', id) as Promise<boolean>,
  duplicateProject: (id: string) =>
    ipcRenderer.invoke('projects:duplicate', id) as Promise<BrochureProject>
})

contextBridge.exposeInMainWorld('appSettings', {
  get: () => ipcRenderer.invoke('settings:get') as Promise<AppSettings>,
  update: (settings: AppSettings) => ipcRenderer.invoke('settings:update', settings) as Promise<AppSettings>,
  getAi: () => ipcRenderer.invoke('settings:getAi') as Promise<AiSettings>,
  updateAi: (settings: AiSettings) => ipcRenderer.invoke('settings:updateAi', settings) as Promise<AiSettings>
})

contextBridge.exposeInMainWorld('brochureAi', {
  generateContent: (projectId: string) =>
    ipcRenderer.invoke('ai:generateBrochureContent', projectId) as Promise<GenerateBrochureContentResult>
})

contextBridge.exposeInMainWorld('assetStore', {
  selectImage: () => ipcRenderer.invoke('assets:selectImage') as Promise<UploadedImageAsset | null>,
  toAssetUrl: (assetPath: string) => `app-asset://local/${encodeURIComponent(assetPath)}`
})

contextBridge.exposeInMainWorld('brochureExport', {
  exportPdf: (input: ExportBrochurePdfInput) =>
    ipcRenderer.invoke('export:pdf', input) as Promise<ExportBrochurePdfResult>,
  showInFolder: (filePath: string) => ipcRenderer.invoke('export:showInFolder', filePath) as Promise<void>
})
