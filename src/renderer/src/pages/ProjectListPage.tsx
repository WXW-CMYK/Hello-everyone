import { CalendarDays, Copy, FilePlus2, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { BrochureProject } from '../../../shared/brochure'

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(value))
}

export function ProjectListPage() {
  const [projects, setProjects] = useState<BrochureProject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [busyProjectId, setBusyProjectId] = useState<string | null>(null)

  const loadProjects = async () => {
    setIsLoading(true)
    setMessage(null)

    try {
      const nextProjects = await window.brochureStore.listProjects()
      setProjects(nextProjects)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '读取项目失败。')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadProjects()
  }, [])

  const handleDuplicate = async (id: string) => {
    setMessage(null)
    setBusyProjectId(id)

    try {
      await window.brochureStore.duplicateProject(id)
      await loadProjects()
      setMessage('项目已复制。')
    } catch (error) {
      setMessage(error instanceof Error ? `复制项目失败：${error.message}` : '复制项目失败，请稍后重试。')
    } finally {
      setBusyProjectId(null)
    }
  }

  const handleDelete = async (project: BrochureProject) => {
    const shouldDelete = window.confirm(`确定删除“${project.name}”吗？`)

    if (!shouldDelete) {
      return
    }

    setMessage(null)
    setBusyProjectId(project.id)

    try {
      await window.brochureStore.deleteProject(project.id)
      await loadProjects()
      setMessage('项目已删除。')
    } catch (error) {
      setMessage(error instanceof Error ? `删除项目失败：${error.message}` : '删除项目失败，请稍后重试。')
    } finally {
      setBusyProjectId(null)
    }
  }

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Projects</p>
          <h1>项目列表</h1>
          <p className="muted">集中查看宣传册草稿、审核状态和最近更新。</p>
        </div>
        <Link className="primary-action" to="/create">
          <FilePlus2 size={18} />
          <span>新建项目</span>
        </Link>
      </div>

      {message ? <div className="form-alert">{message}</div> : null}

      <div className="project-table" role="table" aria-label="Brochure projects">
        <div className="table-row table-head" role="row">
          <span role="columnheader">项目名称</span>
          <span role="columnheader">状态</span>
          <span role="columnheader">负责人</span>
          <span role="columnheader">页数</span>
          <span role="columnheader">更新时间</span>
          <span role="columnheader" />
        </div>

        {isLoading ? (
          <div className="table-empty">正在读取本地项目...</div>
        ) : projects.length === 0 ? (
          <div className="table-empty">
            <strong>还没有宣传册项目</strong>
            <span>创建第一个项目后，这里会显示草稿、页数和更新时间。</span>
          </div>
        ) : (
          projects.map((project) => (
            <div className={`table-row${busyProjectId === project.id ? ' row-busy' : ''}`} role="row" key={project.id}>
              <strong role="cell">
                <Link className="project-name-link" to={`/projects/${project.id}/edit`}>
                  {project.name}
                </Link>
              </strong>
              <span role="cell">
                <span className="status-pill">{project.status}</span>
              </span>
              <span role="cell">{project.owner}</span>
              <span role="cell">{project.pages} 页</span>
              <span className="date-cell" role="cell">
                <CalendarDays size={16} />
                {formatDate(project.updatedAt)}
              </span>
              <span className="row-actions" role="cell">
                <button
                  className="icon-button compact"
                  type="button"
                  aria-label={`复制 ${project.name}`}
                  title={busyProjectId === project.id ? '正在处理项目' : '复制项目'}
                  disabled={Boolean(busyProjectId)}
                  onClick={() => void handleDuplicate(project.id)}
                >
                  <Copy size={17} />
                </button>
                <button
                  className="icon-button compact danger"
                  type="button"
                  aria-label={`删除 ${project.name}`}
                  title={busyProjectId === project.id ? '正在处理项目' : '删除项目'}
                  disabled={Boolean(busyProjectId)}
                  onClick={() => void handleDelete(project)}
                >
                  <Trash2 size={17} />
                </button>
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
