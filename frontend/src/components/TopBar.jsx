import { useLocation } from 'react-router-dom'
import { Bell, User, Search } from 'lucide-react'

const pageTitles = {
  '/': 'Dashboard',
  '/analyze': 'Video Processing Unit',
}

export default function TopBar() {
  const { pathname } = useLocation()
  const title = pageTitles[pathname] || 'Dashboard'

  return (
    <header className="h-16 bg-bg border-b border-border-medium flex items-center justify-between px-4 lg:px-8 shadow-[0_24px_48px_rgba(0,0,0,0.4)] z-30 shrink-0">
      <h1 className="font-heading font-bold text-text-primary text-xl tracking-tight">{title}</h1>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 bg-bg-dark border border-border-strong rounded-xl px-3 py-1.5">
          <Search size={11} className="text-text-muted" />
          <input
            placeholder="Search analytics..."
            className="bg-transparent text-xs text-text-primary placeholder-[#6b7280] outline-none w-36"
          />
        </div>
        <button className="text-text-secondary hover:text-text-primary transition-colors">
          <Bell size={20} />
        </button>
        <button className="text-text-secondary hover:text-text-primary transition-colors">
          <User size={20} />
        </button>
      </div>
    </header>
  )
}
