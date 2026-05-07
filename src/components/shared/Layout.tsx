import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Bot, BarChart2, Settings, LogOut } from 'lucide-react'
import { useAuthStore, useSse } from '../../lib/store'

export function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  useSse()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const nav = [
    { to: '/',            icon: LayoutDashboard, label: 'CRM' },
    { to: '/assistente',  icon: Bot,             label: 'Assistente' },
    { to: '/performance', icon: BarChart2,        label: 'Performance' },
    ...(user?.role === 'admin'
      ? [{ to: '/admin', icon: Settings, label: 'Admin' }]
      : []),
  ]

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col py-6 px-3 flex-shrink-0">
        <div className="px-3 mb-8">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center mb-3">
            <span className="text-white font-bold text-sm">CP</span>
          </div>
          <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
          <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
        </div>

        <nav className="flex-1 space-y-1">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <LogOut size={18} />
          Sair
        </button>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
