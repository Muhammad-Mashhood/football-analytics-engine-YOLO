import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function HomePage() {
  const token = useAuthStore((s) => s.token)

  return (
    <div className="min-h-screen bg-[#060808] text-text-primary">
      <header className="sticky top-3 z-20 px-4 pt-3">
        <nav className="mx-auto max-w-6xl rounded-full border border-white/15 bg-black/40 px-5 py-3 backdrop-blur-md">
          <ul className="flex items-center justify-center gap-6 text-sm text-white/75 md:gap-10">
            <li><a href="#home" className="transition-colors hover:text-white">Home</a></li>
            <li><a href="#about" className="transition-colors hover:text-white">About</a></li>
            <li><a href="#upload" className="transition-colors hover:text-white">Upload</a></li>
            <li><a href="#pricing" className="transition-colors hover:text-white">Pricing</a></li>
            <li><Link to="/login" className="transition-colors hover:text-white">Login</Link></li>
          </ul>
        </nav>
      </header>

      <main>
        <section id="home" className="px-4 pb-12 pt-6 md:px-8 md:pb-16 md:pt-8">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.5)]">
            <img
              src="/landing-gemini.png"
              alt="Football analytics hero"
              className="h-[60vh] w-full object-cover md:h-[72vh]"
            />
          </div>
        </section>

        <section id="about" className="mx-auto max-w-6xl px-4 pb-10 text-center text-white/70 md:px-8">
          <p>AI-powered football analysis for tracking, events, and tactical insights.</p>
        </section>

        <section id="upload" className="mx-auto max-w-6xl px-4 pb-14 md:px-8">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
            <Link
              to={token ? '/app/analyze' : '/login'}
              className="inline-flex rounded-full bg-[#19ff75] px-8 py-3 font-semibold text-[#03200f] transition-opacity hover:opacity-90"
            >
              Upload Match Video
            </Link>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl px-4 pb-20 md:px-8">
          <div className="grid gap-5 md:grid-cols-3">
            <article className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-xl font-semibold">Free Tier</h3>
              <p className="mt-1 text-2xl font-bold">$0</p>
              <p className="mt-3 text-white/70">Starter plan for trying core analysis features.</p>
            </article>

            <article className="rounded-2xl border border-[#19ff75]/40 bg-[#19ff75]/10 p-6">
              <h3 className="text-xl font-semibold">Premium</h3>
              <p className="mt-1 text-2xl font-bold">$29/mo</p>
              <p className="mt-3 text-white/70">More uploads, faster processing, and richer metrics.</p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-xl font-semibold">Team Pro</h3>
              <p className="mt-1 text-2xl font-bold">$99/mo</p>
              <p className="mt-3 text-white/70">Built for clubs and analysts with collaborative workflows.</p>
            </article>
          </div>
        </section>
      </main>
    </div>
  )
}
