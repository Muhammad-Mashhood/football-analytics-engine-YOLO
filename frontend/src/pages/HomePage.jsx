import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function HomePage() {
  const token = useAuthStore((s) => s.token)

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      <section className="relative overflow-hidden border-b border-border-medium">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_15%,rgba(0,255,95,0.2),transparent_35%),radial-gradient(circle_at_70%_10%,rgba(0,255,95,0.08),transparent_45%),linear-gradient(180deg,#0a0f0d_0%,#080b0a_90%)]" />
        <div className="absolute inset-0 opacity-40 bg-[linear-gradient(rgba(25,255,117,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(25,255,117,0.08)_1px,transparent_1px)] bg-[size:56px_56px]" />

        <header className="relative max-w-7xl mx-auto px-5 py-4 flex items-center justify-between">
          <h1 className="font-heading font-bold text-3xl text-accent">FieldVision</h1>
          <nav className="hidden md:flex items-center gap-7 text-sm text-text-secondary">
            <Link to={token ? '/app' : '/login'} className="text-accent">Dashboard</Link>
            <Link to={token ? '/app/analyze' : '/login'} className="hover:text-text-primary transition-colors">Uploads</Link>
            <Link to={token ? '/app/models' : '/login'} className="hover:text-text-primary transition-colors">Models</Link>
            <Link to={token ? '/app/settings' : '/login'} className="hover:text-text-primary transition-colors">Settings</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 rounded-lg border border-border-strong text-sm hover:bg-green-dim transition-colors">Sign In</Link>
            <Link to={token ? '/app' : '/login'} className="px-4 py-2 rounded-lg text-sm font-bold text-[#031a0b] bg-btn-primary shadow-glow-green">
              Open Dashboard
            </Link>
          </div>
        </header>

        <div className="relative max-w-7xl mx-auto px-5 pt-14 pb-24 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1 rounded-full border border-border-strong bg-[rgba(17,22,20,0.7)] text-[10px] tracking-[0.22em] uppercase text-text-secondary">
            Tactical HUD Active
          </span>
          <h2 className="mt-8 font-heading font-bold text-5xl md:text-7xl leading-[0.95]">
            Elite Performance,
            <br />
            <span className="text-accent italic">Decoded</span>
          </h2>
          <p className="mt-6 max-w-3xl mx-auto text-lg text-text-secondary">
            Transform raw match footage into tactical intelligence. Neural models extract every movement, pass,
            and pressing trigger with sub-second latency.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link to={token ? '/app/analyze' : '/login'} className="px-9 py-3 rounded-lg font-bold text-[#031a0b] bg-btn-primary shadow-glow-green hover:opacity-90">
              Get Started
            </Link>
            <Link to={token ? '/app/analyze' : '/login'} className="px-9 py-3 rounded-lg font-semibold border border-border-strong bg-[rgba(20,24,22,0.75)] hover:bg-green-dim transition-colors">
              Watch Demo
            </Link>
          </div>

          <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto text-left">
            <div className="rounded-lg border border-border-default bg-[rgba(14,19,17,0.8)] px-4 py-3">
              <p className="text-[9px] uppercase tracking-[0.2em] text-accent">Engine State</p>
              <p className="text-sm mt-1">FieldVision_v1.0</p>
            </div>
            <div className="rounded-lg border border-border-default bg-[rgba(14,19,17,0.8)] px-4 py-3">
              <p className="text-[9px] uppercase tracking-[0.2em] text-accent">System Latency</p>
              <p className="text-sm mt-1">14ms_RTP</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
