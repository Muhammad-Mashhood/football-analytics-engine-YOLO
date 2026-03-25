import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Download, RefreshCw } from 'lucide-react'
import api from '../lib/api'

export default function ResultsPage() {
  const { jobId } = useParams()
  const [videoLoadError, setVideoLoadError] = useState(false)
  const { data: job, isLoading, isError } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => api.get(`/api/ml/jobs/${jobId}`).then((r) => r.data),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'processing' || status === 'queued' ? 2000 : false
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-text-secondary">
          <RefreshCw size={18} className="animate-spin text-accent" />
          Loading results...
        </div>
      </div>
    )
  }

  if (isError || !job) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="bg-bg-card border border-[rgba(255,180,171,0.2)] rounded-lg p-8 text-center max-w-sm">
          <p className="text-error font-bold mb-2">Failed To Fetch Job</p>
          <p className="text-text-secondary text-sm">Could not load job data. Try refreshing the page.</p>
        </div>
      </div>
    )
  }

  if (job.status === 'queued' || job.status === 'processing') {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-bg-card border border-border-medium rounded-lg p-12 text-center max-w-md w-full">
          <div className="w-16 h-16 rounded-xl bg-green-dim flex items-center justify-center mx-auto mb-6">
            <RefreshCw size={24} className="text-accent animate-spin" />
          </div>
          <h2 className="font-heading font-bold text-text-primary text-xl mb-2">Processing Analysis</h2>
          <p className="text-text-secondary text-sm mb-6">
            YOLO is detecting players, tracking ball possession and generating heatmaps.
          </p>
          <div className="flex items-center gap-2 justify-center">
            <div className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />
            <span className="text-accent-cyan text-xs uppercase tracking-widest font-bold">
              {job.status === 'queued' ? 'Queued' : 'Processing'}
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (job.status === 'failed') {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="bg-bg-card border border-[rgba(255,180,171,0.2)] rounded-lg p-8 text-center max-w-sm">
          <p className="text-error font-bold mb-2">Analysis Failed</p>
          <p className="text-text-secondary text-sm">{job.error}</p>
        </div>
      </div>
    )
  }

  const stats = job.results?.stats || {}

  return (
    <div className="p-4 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-8">
        <div>
          <h2 className="font-heading font-bold text-text-primary text-2xl tracking-tight mb-1">Match Analysis Complete</h2>
          <p className="text-text-secondary text-sm font-mono">JOB_{jobId?.slice(0, 8).toUpperCase()}</p>
        </div>
            {job.results?.output_video && (
              <a
                href={job.results.output_video}
                download
                className="flex items-center gap-2 px-4 py-2 rounded text-sm font-bold text-[#f5fff6] bg-btn-primary"
              >
                <Download size={14} /> Download Video
              </a>
            )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8">
          {job.results?.output_video ? (
            <div className="bg-bg-dark border border-border-default rounded-lg overflow-hidden">
              <video
                controls
                autoPlay
                muted
                playsInline
                className="w-full"
                src={job.results.output_video}
                onError={() => setVideoLoadError(true)}
              />
              {videoLoadError && (
                <div className="p-4 border-t border-border-default">
                  <p className="text-error text-sm mb-2">
                    This browser could not decode this video stream. Download still works.
                  </p>
                  <a href={job.results.output_video} target="_blank" rel="noreferrer" className="text-accent text-xs uppercase tracking-widest hover:underline">
                    Open raw video in new tab
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-bg-card border border-border-default rounded-lg aspect-video flex items-center justify-center">
              <p className="text-text-secondary text-sm">Video not available</p>
            </div>
          )}

          {stats.team_a !== undefined && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-bg-card border border-border-default rounded-lg p-6 mt-4"
            >
              <p className="text-xs text-text-secondary uppercase tracking-widest font-bold mb-4">Ball Possession</p>
              <div className="flex items-center gap-4 mb-3">
                <span className="text-text-primary font-bold text-sm w-16">Team A</span>
                <div className="flex-1 h-2 bg-bg-elevated rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${stats.team_a}%` }} />
                </div>
                <span className="font-mono text-accent font-bold text-sm w-12 text-right">{stats.team_a}%</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-text-primary font-bold text-sm w-16">Team B</span>
                <div className="flex-1 h-2 bg-bg-elevated rounded-full overflow-hidden">
                  <div className="h-full bg-accent-cyan rounded-full transition-all" style={{ width: `${stats.team_b}%` }} />
                </div>
                <span className="font-mono text-accent-cyan font-bold text-sm w-12 text-right">{stats.team_b}%</span>
              </div>
            </motion.div>
          )}
        </div>

        <div className="xl:col-span-4 flex flex-col gap-4">
          <div className="bg-bg-card border border-border-default rounded-lg p-6">
            <p className="text-xs text-text-secondary uppercase tracking-widest font-bold mb-4">Session Stats</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Total Frames', value: stats.total_frames || '—' },
                { label: 'Players Detected', value: stats.unique_players || '—' },
                { label: 'Possession A', value: stats.team_a !== undefined ? `${stats.team_a}%` : '—' },
                { label: 'Possession B', value: stats.team_b !== undefined ? `${stats.team_b}%` : '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] text-text-secondary uppercase tracking-widest mb-1">{label}</p>
                  <p className="font-heading font-bold text-text-primary text-2xl">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {job.results?.heatmap_team_a && (
            <div className="bg-bg-card border border-border-default rounded-lg p-6">
              <p className="text-xs text-text-secondary uppercase tracking-widest font-bold mb-4">Position Heatmaps</p>
              <div className="flex flex-col gap-3">
                {[
                  { url: job.results.heatmap_team_a, label: 'Team A' },
                  { url: job.results.heatmap_team_b, label: 'Team B' },
                ].map(({ url, label }) => (
                  <div key={label}>
                    <p className="text-[10px] text-text-secondary uppercase tracking-widest mb-2">{label}</p>
                    <img src={url} alt={`${label} heatmap`} className="w-full rounded border border-border-medium" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
