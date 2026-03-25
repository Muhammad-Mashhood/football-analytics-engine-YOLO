import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Upload, Plus } from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'

const statusConfig = {
  completed: { color: '#00ff41', label: 'Completed', dot: '#00ff41' },
  processing: { color: '#00daf3', label: 'Processing', dot: '#00daf3' },
  queued: { color: '#b9ccb2', label: 'Queued', dot: '#b9ccb2' },
  failed: { color: '#ffb4ab', label: 'Failed', dot: '#ffb4ab' },
}

function formatDuration(job) {
  const started = job.started_at ? new Date(job.started_at).getTime() : null
  if (!started) return '--:--'

  const ended = job.completed_at ? new Date(job.completed_at).getTime() : Date.now()
  const totalSeconds = Math.max(0, Math.floor((ended - started) / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs', user?.id],
    queryFn: () => api.get('/api/jobs/').then((r) => r.data),
    enabled: !!user,
    refetchInterval: 5000,
  })

  const stats = {
    total: jobs.length,
    completed: jobs.filter((j) => j.status === 'completed').length,
    processing: jobs.filter((j) => j.status === 'processing').length,
    failed: jobs.filter((j) => j.status === 'failed').length,
  }

  return (
    <div className="p-4 lg:p-8 min-h-full">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Sessions', value: stats.total },
          { label: 'Completed', value: stats.completed },
          { label: 'Processing', value: stats.processing },
          { label: 'Failed', value: stats.failed },
        ].map(({ label, value }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-bg-card border border-border-default rounded-lg p-6"
          >
            <p className="text-[10px] text-text-secondary uppercase tracking-widest mb-3">{label}</p>
            <span className="font-heading font-bold text-text-primary text-4xl leading-none">{value}</span>
          </motion.div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-text-primary text-xl tracking-tight">Recent Processed Streams</h2>
          <button
            onClick={() => navigate('/analyze')}
            className="flex items-center gap-2 px-4 py-2 rounded text-xs font-bold text-[#f5fff6] bg-btn-primary"
          >
            <Upload size={12} /> New Upload
          </button>
        </div>

        <div className="bg-bg-dark border border-border-default rounded-lg overflow-hidden">
          <div className="bg-[rgba(26,28,27,0.5)] hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-6 px-6 py-3">
            {['Source File', 'Duration', 'Status', 'Timestamp', 'Action'].map((h) => (
              <span key={h} className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">
                {h}
              </span>
            ))}
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-text-secondary text-sm">Loading sessions...</div>
          ) : jobs.length === 0 ? (
            <div className="py-16 text-center">
              <Upload size={32} className="text-[rgba(226,227,224,0.2)] mx-auto mb-3" />
              <p className="text-text-secondary text-sm">No sessions yet</p>
              <button
                onClick={() => navigate('/analyze')}
                className="mt-4 text-accent text-xs uppercase tracking-widest hover:underline"
              >
                Upload your first video
              </button>
            </div>
          ) : (
            jobs.map((job) => {
              const sc = statusConfig[job.status] || statusConfig.queued
              return (
                <div
                  key={job.id}
                  className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-3 md:gap-6 px-4 md:px-6 py-4 items-center border-t border-border-default hover:bg-[rgba(0,255,65,0.02)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-8 rounded bg-bg-muted flex items-center justify-center shrink-0">
                      <Upload size={10} className="text-text-secondary" />
                    </div>
                    <div>
                      <p className="text-text-primary text-sm font-semibold truncate max-w-[180px]">{job.video_filename}</p>
                      <p className="text-text-secondary text-[10px]">
                        {job.status === 'processing' ? 'Processing...' : 'Match footage'}
                      </p>
                    </div>
                  </div>

                  <span className="font-mono text-text-secondary text-sm">{formatDuration(job)}</span>

                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sc.dot }} />
                    <span className="text-xs font-bold uppercase tracking-tight" style={{ color: sc.color }}>
                      {sc.label}
                    </span>
                  </div>

                  <span className="text-text-secondary text-xs">{new Date(job.created_at).toLocaleDateString()}</span>

                  <div>
                    {job.status === 'completed' && (
                      <button
                        onClick={() => navigate(`/results/${job.id}`)}
                        className="text-accent text-[10px] uppercase tracking-widest font-bold hover:underline"
                      >
                        View Analytics
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <button
        onClick={() => navigate('/analyze')}
        className="fixed bottom-8 right-6 lg:right-10 w-14 h-14 lg:w-16 lg:h-16 rounded-xl bg-btn-primary shadow-glow-green-lg flex items-center justify-center hover:opacity-90 transition-opacity z-50"
      >
        <Plus size={20} className="text-[#f5fff6]" />
      </button>
    </div>
  )
}
