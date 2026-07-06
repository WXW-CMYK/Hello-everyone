import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { CreateBrochurePage } from './pages/CreateBrochurePage'
import { BrochureEditorPage } from './pages/BrochureEditorPage'
import { HomePage } from './pages/HomePage'
import { ProjectListPage } from './pages/ProjectListPage'
import { SettingsPage } from './pages/SettingsPage'

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="projects" element={<ProjectListPage />} />
        <Route path="projects/:id/edit" element={<BrochureEditorPage />} />
        <Route path="create" element={<CreateBrochurePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
