import { Bell, FilePlus2, FolderKanban, Home, Search, Settings } from 'lucide-react'
import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'

const navItems = [
  { to: '/', label: '首页', icon: Home },
  { to: '/projects', label: '项目列表', icon: FolderKanban },
  { to: '/create', label: '创建宣传册', icon: FilePlus2 },
  { to: '/settings', label: '设置', icon: Settings }
]

export function AppLayout() {
  const navigate = useNavigate()

  useEffect(() => {
    const canScrollElement = (element: Element, deltaY: number) => {
      const style = window.getComputedStyle(element)
      const allowsScroll = style.overflowY === 'auto' || style.overflowY === 'scroll'

      if (!allowsScroll || element.scrollHeight <= element.clientHeight) {
        return false
      }

      if (deltaY > 0) {
        return element.scrollTop + element.clientHeight < element.scrollHeight
      }

      return element.scrollTop > 0
    }

    const hasScrollableAncestor = (target: EventTarget | null, deltaY: number) => {
      let element = target instanceof Element ? target : null

      while (element && element !== document.body) {
        if (canScrollElement(element, deltaY)) {
          return true
        }

        element = element.parentElement
      }

      return false
    }

    const handleWheel = (event: WheelEvent) => {
      if (event.defaultPrevented || Math.abs(event.deltaY) < 1) {
        return
      }

      if (hasScrollableAncestor(event.target, event.deltaY)) {
        return
      }

      const maxScroll = document.documentElement.scrollHeight - window.innerHeight

      if (maxScroll <= 0) {
        return
      }

      const beforeScroll = window.scrollY
      window.scrollBy({ top: event.deltaY, behavior: 'auto' })

      if (window.scrollY !== beforeScroll) {
        event.preventDefault()
      }
    }

    document.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      document.removeEventListener('wheel', handleWheel)
    }
  }, [])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">SB</div>
          <div>
            <span>Smart Brochure</span>
            <strong>Generator</strong>
          </div>
        </div>

        <nav className="nav-list" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <Icon size={19} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <span>Workspace</span>
          <strong>Local Drafts</strong>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <label className="search-box">
            <Search size={18} aria-hidden="true" />
            <input placeholder="搜索功能待支持" disabled title="搜索功能暂未支持" />
          </label>
          <div className="topbar-actions">
            <button
              className="icon-button"
              type="button"
              aria-label="通知功能暂未支持"
              title="通知功能暂未支持"
              disabled
            >
              <Bell size={19} />
            </button>
            <button
              className="icon-button"
              type="button"
              aria-label="Settings"
              title="Settings"
              onClick={() => navigate('/settings')}
            >
              <Settings size={19} />
            </button>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
