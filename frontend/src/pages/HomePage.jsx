import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const PHASES = [
  { at: 0.04, title: 'Set Position', text: 'Kicker reads the wall and plants his support foot.' },
  { at: 0.2, title: 'First Step', text: 'Measured run-up begins with controlled acceleration.' },
  { at: 0.36, title: 'Second Step', text: 'Body angle opens for curl and lift.' },
  { at: 0.54, title: 'Touch Ball', text: 'Final setup touch aligns the strike window.' },
  { at: 0.72, title: 'Strike', text: 'Boot drives through the ball with spin and lift.' },
  { at: 0.9, title: 'Ball Flight', text: 'Shot rises and bends toward the top corner.' },
]

export default function HomePage() {
  const token = useAuthStore((s) => s.token)
  const videoRef = useRef(null)
  const sectionRefs = useRef([])
  const durationRef = useRef(0)
  const [activeIndex, setActiveIndex] = useState(0)
  const [videoReady, setVideoReady] = useState(false)
  const activePhase = PHASES[activeIndex]

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.pause()
    const onLoaded = () => {
      durationRef.current = video.duration || 0
      setVideoReady(true)
      video.currentTime = Math.min(0.001, durationRef.current || 0)
    }

    const onError = () => {
      setVideoReady(false)
    }

    video.addEventListener('loadedmetadata', onLoaded)
    video.addEventListener('error', onError)

    return () => {
      video.removeEventListener('loadedmetadata', onLoaded)
      video.removeEventListener('error', onError)
    }
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        let best = null
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          if (!best || entry.intersectionRatio > best.intersectionRatio) {
            best = entry
          }
        }
        if (!best) return
        const idx = Number(best.target.getAttribute('data-phase-index'))
        if (!Number.isNaN(idx)) setActiveIndex(idx)
      },
      { threshold: [0.45, 0.6, 0.75] }
    )

    sectionRefs.current.forEach((el) => el && observer.observe(el))

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    const duration = durationRef.current
    if (!video || !videoReady || !duration) return

    const targetTime = PHASES[activeIndex].at * duration
    if (Number.isFinite(targetTime) && Math.abs(video.currentTime - targetTime) > 0.02) {
      video.currentTime = targetTime
    }
  }, [activeIndex, videoReady])

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

      <section className="relative grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="lg:sticky lg:top-0 h-screen overflow-hidden border-y border-border-medium bg-bg-dark">
          <video ref={videoRef} className="w-full h-full object-cover" src="/scroll.mp4" playsInline muted preload="auto" />

          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,11,10,0.65)_0%,rgba(8,11,10,0.18)_40%,rgba(8,11,10,0.7)_100%)]" />

          <div className="absolute left-6 right-6 lg:left-12 lg:right-auto bottom-8 lg:bottom-12 max-w-xl">
            <div className="bg-[rgba(12,15,14,0.72)] border border-border-strong rounded-xl p-5 backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-widest text-text-secondary mb-2">Timeline</p>
              <h4 className="font-heading font-bold text-2xl text-text-primary mb-2">{activePhase.title}</h4>
              <p className="text-text-secondary text-sm">{activePhase.text}</p>
              <div className="mt-4 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                <div className="h-full bg-btn-primary" style={{ width: `${Math.round(((activeIndex + 1) / PHASES.length) * 100)}%` }} />
              </div>
            </div>
          </div>

          {!videoReady && (
            <div className="absolute top-4 left-4 right-4 bg-[rgba(20,20,20,0.7)] border border-border-strong rounded px-3 py-2 text-xs text-text-secondary">
              Loading scroll video...
            </div>
          )}
        </div>

        <div className="bg-bg min-h-[600vh]">
          {PHASES.map((phase, idx) => (
            <div
              key={phase.title}
              ref={(el) => {
                sectionRefs.current[idx] = el
              }}
              data-phase-index={idx}
              className="h-screen flex items-center px-6 lg:px-10"
            >
              <div className={`w-full border rounded-xl p-6 transition-colors ${idx === activeIndex ? 'border-accent bg-green-dim' : 'border-border-medium bg-bg-card'}`}>
                <p className="text-[10px] uppercase tracking-widest text-accent-cyan mb-2">Step {idx + 1}</p>
                <h3 className="font-heading font-bold text-3xl mb-2">{phase.title}</h3>
                <p className="text-text-secondary">{phase.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PHASES.map((phase) => (
            <div key={phase.title} className="bg-bg-card border border-border-default rounded-lg p-4">
              <p className="text-[10px] uppercase tracking-widest text-accent-cyan mb-1">{Math.round(phase.at * 100)}%</p>
              <h5 className="font-heading font-bold text-text-primary mb-2">{phase.title}</h5>
              <p className="text-xs text-text-secondary">{phase.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
