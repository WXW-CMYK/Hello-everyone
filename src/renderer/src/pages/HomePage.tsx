import { ArrowRight, FileText, Palette, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { BrochureProject } from '../../../shared/brochure'

const steps = [
  { title: '导入资料', text: '整理产品介绍、品牌颜色、受众和投放渠道。', icon: FileText },
  { title: '生成版式', text: '根据内容密度自动匹配宣传册页数和视觉节奏。', icon: Sparkles },
  { title: '校准风格', text: '快速微调色彩、字体、封面语气和导出规格。', icon: Palette }
]

export function HomePage() {
  const [projects, setProjects] = useState<BrochureProject[]>([])

  useEffect(() => {
    window.brochureStore
      .listProjects()
      .then(setProjects)
      .catch(() => setProjects([]))
  }, [])

  const stats = useMemo(() => {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - 7)

    const activeProjects = projects.filter((project) => project.status !== '已导出').length
    const recentProjects = projects.filter((project) => new Date(project.createdAt) >= weekStart).length

    return [
      { label: '进行中项目', value: String(activeProjects) },
      { label: '本周生成', value: String(recentProjects) },
      { label: '品牌模板', value: '4' }
    ]
  }, [projects])

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>首页</h1>
          <p className="muted">从一个清晰的工作台开始管理宣传册项目、素材和生成流程。</p>
        </div>
        <Link className="primary-action" to="/create">
          <Sparkles size={18} />
          <span>创建宣传册</span>
        </Link>
      </div>

      <div className="stats-grid">
        {stats.map((stat) => (
          <div className="metric" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>

      <div className="section-header">
        <h2>快速流程</h2>
        <Link to="/projects">
          查看项目
          <ArrowRight size={16} />
        </Link>
      </div>

      <div className="workflow-grid">
        {steps.map((step) => {
          const Icon = step.icon

          return (
            <article className="workflow-item" key={step.title}>
              <Icon size={22} aria-hidden="true" />
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}
