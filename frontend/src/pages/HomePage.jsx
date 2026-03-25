import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const PHASES = [
  { p: 0.08, title: 'Set Position', text: 'Kicker reads the wall and plants his support foot.' },
  { p: 0.24, title: 'First Step', text: 'Measured run-up begins with controlled acceleration.' },
  { p: 0.4, title: 'Second Step', text: 'Body angle opens for curl and lift.' },
  { p: 0.58, title: 'Contact', text: 'Boot meets the lower half of the ball for launch.' },
  { p: 0.78, title: 'Strike Through', text: 'Follow-through directs spin and trajectory.' },
  { p: 0.95, title: 'Ball Flight', text: 'The shot rises and bends toward the top corner.' },
]

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

export default function HomePage() {
  const token = useAuthStore((s) => s.token)
  const wrapperRef = useRef(null)
  const videoRef = useRef(null)
  const rafRef = useRef(0)
  const readyRef = useRef(false)
  const [progress, setProgress] = useState(0)

  const activePhase = useMemo(() => {
    let phase = PHASES[0]
    for (const p of PHASES) {
      if (progress >= p.p) phase = p
    }
    return phase
  }, [progress])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.pause()
    const onLoaded = () => {
      readyRef.current = true
    }

    video.addEventListener('loadedmetadata', onLoaded)
    return () => {
      video.removeEventListener('loadedmetadata', onLoaded)
    }
  }, [])

  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)

      rafRef.current = requestAnimationFrame(() => {
        const container = wrapperRef.current
        const video = videoRef.current
        if (!container || !video) return

        const rect = container.getBoundingClientRect()
        const total = container.offsetHeight - window.innerHeight
        if (total <= 0) return

        const scrolled = clamp(-rect.top, 0, total)
        const p = scrolled / total
        setProgress(p)

        if (!readyRef.current || !video.duration || Number.isNaN(video.duration)) return

        const targetTime = p * video.duration
        if (Math.abs(video.currentTime - targetTime) > 0.033) {
          video.currentTime = targetTime
        }
      })
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <div className="bg-bg text-text-primary min-h-screen">
      <section className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(0,255,65,0.12),transparent_35%),radial-gradient(circle_at_85%_10%,rgba(0,218,243,0.18),transparent_30%),linear-gradient(180deg,#0f1211_0%,#121413_100%)]" />
        <div className="relative max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
          <h1 className="font-heading font-bold text-xl tracking-tight text-accent">SyntheticPitch</h1>
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 rounded border border-border-strong text-text-primary text-sm hover:bg-green-dim transition-colors">
              Sign In
            </Link>
            <Link
              to={token ? '/app' : '/register'}
              className="px-4 py-2 rounded bg-btn-primary text-[#f5fff6] text-sm font-bold shadow-glow-green hover:opacity-90 transition-opacity"
            >
              {token ? 'Open Dashboard' : 'Get Started'}
            </Link>
          </div>
        </div>

        <div className="relative max-w-6xl mx-auto px-6 pt-12 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-10 items-end">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-accent-cyan mb-4">Scroll-Controlled Breakdown</p>
            <h2 className="font-heading font-bold text-4xl lg:text-6xl leading-tight mb-5">Freekick Frame Engine</h2>
            <p className="text-text-secondary text-base max-w-xl">
              Scroll to scrub the freekick moment. Every section maps to a precise timeline stage so analysts can inspect
              body mechanics and ball flight progression without lag.
            </p>
          </div>

          <div className="bg-bg-card/80 border border-border-medium rounded-xl p-5 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-widest text-text-secondary mb-2">Active Phase</p>
            <h3 className="font-heading font-bold text-2xl text-accent mb-2">{activePhase.title}</h3>
            <p className="text-sm text-text-secondary">{activePhase.text}</p>
          </div>
        </div>
      </section>

      <section ref={wrapperRef} className="relative h-[520vh]">
        <div className="sticky top-0 h-screen overflow-hidden border-y border-border-medium bg-bg-dark">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            src="/scroll.mp4"
            playsInline
            muted
            preload="auto"
          />

          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,11,10,0.65)_0%,rgba(8,11,10,0.18)_40%,rgba(8,11,10,0.7)_100%)]" />

          <div className="absolute left-6 right-6 lg:left-12 lg:right-auto bottom-8 lg:bottom-12 max-w-xl">
            <div className="bg-[rgba(12,15,14,0.72)] border border-border-strong rounded-xl p-5 backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-widest text-text-secondary mb-2">Timeline</p>
              <h4 className="font-heading font-bold text-2xl text-text-primary mb-2">{activePhase.title}</h4>
              <p className="text-text-secondary text-sm">{activePhase.text}</p>
              <div className="mt-4 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                <div className="h-full bg-btn-primary" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PHASES.map((phase) => (
            <div key={phase.title} className="bg-bg-card border border-border-default rounded-lg p-4">
              <p className="text-[10px] uppercase tracking-widest text-accent-cyan mb-1">{Math.round(phase.p * 100)}%</p>
              <h5 className="font-heading font-bold text-text-primary mb-2">{phase.title}</h5>
              <p className="text-xs text-text-secondary">{phase.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
