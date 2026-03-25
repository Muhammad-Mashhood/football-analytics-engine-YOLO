import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, User, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'

const pageTitles = {
  '/': 'Dashboard',
  '/analyze': 'Video Processing Unit',
  '/models': 'Model Management',
  '/settings': 'Settings',
}

export default function TopBar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const title = pageTitles[pathname] || (pathname.startsWith('/results/') ? 'Results' : 'Dashboard')
  const [panelOpen, setPanelOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const initializedRef = useRef(false)
  const seenCompletedRef = useRef(new Set())

  const { data: jobs = [] } = useQuery({
    queryKey: ['topbar-jobs', user?.id],
    queryFn: () => api.get('/api/jobs/').then((r) => r.data),
    enabled: !!user,
    refetchInterval: 5000,
  })

  useEffect(() => {
    if (!user) {
      initializedRef.current = false
      seenCompletedRef.current = new Set()
      setNotifications([])
      setUnreadCount(0)
      return
    }

    const completedJobs = jobs.filter((j) => j.status === 'completed')

    if (!initializedRef.current) {
      completedJobs.forEach((job) => seenCompletedRef.current.add(job.id))
      initializedRef.current = true
      return
    }

    const newCompletions = completedJobs.filter((job) => !seenCompletedRef.current.has(job.id))
    if (newCompletions.length === 0) return

    newCompletions.forEach((job) => seenCompletedRef.current.add(job.id))
    setUnreadCount((prev) => prev + newCompletions.length)
    setNotifications((prev) => {
      const next = newCompletions.map((job) => ({
        id: `${job.id}-${Date.now()}`,
        jobId: job.id,
        file: job.video_filename,
        createdAt: new Date().toISOString(),
      }))
      return [...next, ...prev].slice(0, 20)
    })

    newCompletions.forEach((job) => {
      toast.success(`Analysis completed: ${job.video_filename}`)
    })
  }, [jobs, user])

  const togglePanel = () => {
    setPanelOpen((prev) => {
      const next = !prev
      if (next) setUnreadCount(0)
      return next
    })
  }

  return (
    <header className="h-16 bg-bg border-b border-border-medium flex items-center justify-between px-4 lg:px-8 shadow-[0_24px_48px_rgba(0,0,0,0.4)] z-30 shrink-0">
      <h1 className="font-heading font-bold text-text-primary text-xl tracking-tight">{title}</h1>

      <div className="flex items-center gap-4 relative">
        <div className="hidden md:flex items-center gap-2 bg-bg-dark border border-border-strong rounded-xl px-3 py-1.5">
          <Search size={11} className="text-text-muted" />
          <input
            placeholder="Search analytics..."
            className="bg-transparent text-xs text-text-primary placeholder-[#6b7280] outline-none w-36"
          />
        </div>

        <button onClick={togglePanel} className="relative text-text-secondary hover:text-text-primary transition-colors">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-accent text-bg text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {panelOpen && (
          <div className="absolute right-10 top-10 w-80 max-h-96 overflow-auto bg-bg-card border border-border-strong rounded-lg shadow-[0_24px_48px_rgba(0,0,0,0.45)]">
            <div className="px-4 py-3 border-b border-border-default">
              <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">Notifications</p>
            </div>
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-sm text-text-secondary">No new notifications</div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    navigate(`/results/${n.jobId}`)
                    setPanelOpen(false)
                  }}
                  className="w-full text-left px-4 py-3 border-b border-border-default hover:bg-green-dim transition-colors"
                >
                  <p className="text-sm text-text-primary font-medium truncate">Analysis completed</p>
                  <p className="text-xs text-text-secondary truncate">{n.file}</p>
                </button>
              ))
            )}
          </div>
        )}

        <button className="text-text-secondary hover:text-text-primary transition-colors">
          <User size={20} />
        </button>
      </div>
    </header>
  )
}
