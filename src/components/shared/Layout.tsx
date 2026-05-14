import { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Bot, BarChart2, Settings, LogOut, Users, KeyRound, ChevronLeft, ChevronRight } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore, useSse } from '../../lib/store'
import { ChangePasswordModal } from './ChangePasswordModal'

const SIDEBAR_LS_KEY = 'crm-sidebar-collapsed'

export function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem(SIDEBAR_LS_KEY) === '1'
  )
  useEffect(() => {
    localStorage.setItem(SIDEBAR_LS_KEY, collapsed ? '1' : '0')
  }, [collapsed])
  useSse()

  const handleLogout = () => {
    logout()
    queryClient.clear()
    navigate('/login', { replace: true })
  }

  const nav = [
    { to: '/',            icon: LayoutDashboard, label: 'CRM' },
    { to: '/contatos',    icon: Users,           label: 'Contatos' },
    { to: '/assistente',  icon: Bot,             label: 'Assistente' },
    { to: '/performance', icon: BarChart2,        label: 'Performance' },
    ...(user?.role === 'admin'
      ? [{ to: '/admin', icon: Settings, label: 'Admin' }]
      : []),
  ]

  // Cuando collapsed, troca padding horizontal, centraliza icones e
  // esconde labels. O estado persiste em localStorage entre sessoes.
  const asideCls = `${collapsed ? 'w-16 px-2' : 'w-56 px-3'} bg-white border-r border-gray-100 flex flex-col py-6 flex-shrink-0 overflow-y-auto transition-[width] duration-200`
  const itemCls = (isActive: boolean) =>
    `flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-xl text-sm transition-colors ${
      isActive ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'
    }`
  const footerBtnCls = `flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors`

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      <aside className={asideCls}>
        <div className={`${collapsed ? 'px-0 flex justify-center' : 'px-3'} mb-8`}>
          {collapsed ? (
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center" title={user?.name}>
              <span className="text-white font-bold text-sm">CP</span>
            </div>
          ) : (
            <>
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center mb-3">
                <span className="text-white font-bold text-sm">CP</span>
              </div>
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
            </>
          )}
        </div>

        <nav className="flex-1 space-y-1">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={collapsed ? label : undefined}
              className={({ isActive }) => itemCls(isActive)}
            >
              <Icon size={18} />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expandir menu' : 'Minimizar menu'}
          className={footerBtnCls}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && 'Minimizar'}
        </button>

        <button
          onClick={() => setShowChangePassword(true)}
          title={collapsed ? 'Trocar senha' : undefined}
          className={footerBtnCls}
        >
          <KeyRound size={18} />
          {!collapsed && 'Trocar senha'}
        </button>

        <button
          onClick={handleLogout}
          title={collapsed ? 'Sair' : undefined}
          className={footerBtnCls}
        >
          <LogOut size={18} />
          {!collapsed && 'Sair'}
        </button>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>

      {showChangePassword && (
        <ChangePasswordModal
          mode={{ kind: 'self' }}
          onClose={() => setShowChangePassword(false)}
        />
      )}
    </div>
  )
}
