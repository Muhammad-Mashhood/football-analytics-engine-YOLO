import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { LayoutDashboard, Upload, Cpu, Settings, Zap, HelpCircle, LogOut } from 'lucide-react'

const links = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/analyze', label: 'Uploads', icon: Upload },
  { to: '/app/models', label: 'Models', icon: Cpu },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-bg border-r border-border-medium flex-col z-40">
      <div className="p-4 pb-8">
        <div className="font-heading font-bold text-accent text-xl tracking-tight mb-4">FieldVision</div>
        {user && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-bg-muted flex items-center justify-center text-accent font-bold text-sm">
              {user.email?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-text-primary text-sm font-semibold leading-tight">{user.username || 'Tactical Room'}</p>
              <p className="text-text-muted text-[10px] uppercase tracking-widest">Elite Analytics</p>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 px-4 flex flex-col gap-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/app'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-green-dim text-accent'
                  : 'text-text-muted hover:text-text-primary hover:bg-green-dim2'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border-medium p-4 flex flex-col gap-2">
        <button
          onClick={() => navigate('/app/analyze')}
          className="w-full py-3 rounded text-sm font-bold text-[#f5fff6] bg-btn-primary flex items-center justify-center gap-2 shadow-glow-green hover:opacity-90 transition-opacity"
        >
          <Zap size={16} />
          Start Processing
        </button>
        <button className="flex items-center gap-3 px-4 py-2 text-xs text-text-muted hover:text-text-primary transition-colors">
          <HelpCircle size={12} /> Help
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2 text-xs text-text-muted hover:text-text-primary transition-colors"
        >
          <LogOut size={12} /> Logout
        </button>
      </div>
    </aside>
  )
}
