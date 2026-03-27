import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import PublicNavbar from '../components/PublicNavbar'
import landingImage from '../assets/landing-gemini.png'

export default function HomePage() {
  const { hash } = useLocation()

  useEffect(() => {
    if (!hash) return

    const target = document.querySelector(hash)
    if (!target) return

    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [hash])

  return (
    <div className="min-h-screen bg-[#060808] text-text-primary">
      <PublicNavbar />

      <main>
        <section id="home" className="relative h-screen min-h-screen">
          <div className="absolute inset-0">
            <img
              src={landingImage}
              alt="Football analytics hero"
              className="h-full w-full object-cover object-top"
            />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02)_0%,rgba(0,0,0,0.08)_100%)]" />
        </section>

        <section id="about" className="mx-auto max-w-6xl px-4 pb-16 pt-16 md:px-8">
          <h2 className="text-3xl font-bold md:text-4xl">About FieldVision</h2>
          <p className="mt-5 max-w-4xl text-white/75">
            FieldVision is built for coaches, analysts, and players who want match intelligence without manual tagging.
            Upload game footage, run tracking and event extraction, then inspect heatmaps, possession flow, and
            player-level movements in one pipeline.
          </p>
          <p className="mt-4 max-w-4xl text-white/65">
            The platform combines computer vision and practical football analytics to turn raw video into tactical
            insight you can use for team review, opposition analysis, and performance improvement.
          </p>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl px-4 pb-20 md:px-8">
          <h2 className="mb-6 text-3xl font-bold md:text-4xl">Pricing</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <article className="rounded-2xl border border-white/10 bg-white/5 p-8">
              <h3 className="text-2xl font-semibold">Free Tier</h3>
              <p className="mt-2 text-4xl font-bold">$0</p>
              <p className="mt-4 text-white/70">Perfect to test the system and run light analysis.</p>
              <ul className="mt-5 space-y-2 text-sm text-white/70">
                <li>Up to 3 video uploads per month</li>
                <li>Standard processing queue</li>
                <li>Core dashboard metrics</li>
              </ul>
            </article>

            <article className="rounded-2xl border border-[#19ff75]/40 bg-[#19ff75]/10 p-8">
              <h3 className="text-2xl font-semibold">Premium</h3>
              <p className="mt-2 text-4xl font-bold">$29/mo</p>
              <p className="mt-4 text-white/70">For regular analysts and serious performance review.</p>
              <ul className="mt-5 space-y-2 text-sm text-white/75">
                <li>Up to 30 video uploads per month</li>
                <li>Priority processing queue</li>
                <li>Advanced tactical and possession breakdowns</li>
              </ul>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/5 p-8">
              <h3 className="text-2xl font-semibold">Team Pro</h3>
              <p className="mt-2 text-4xl font-bold">$99/mo</p>
              <p className="mt-4 text-white/70">Built for clubs, academies, and multi-analyst teams.</p>
              <ul className="mt-5 space-y-2 text-sm text-white/70">
                <li>Unlimited uploads</li>
                <li>Fastest processing priority</li>
                <li>Team workspaces and shared reports</li>
              </ul>
            </article>
          </div>
        </section>

        <footer className="border-t border-white/10 px-4 py-10 md:px-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-white/65 md:flex-row md:items-center md:justify-between">
            <p>FieldVision Analytics Platform</p>
            <p>
              Developed by Mashhood | GitHub:{' '}
              <a
                href="https://github.com/Muhammad-Mashhood/"
                target="_blank"
                rel="noreferrer"
                className="text-white/85 transition-colors hover:text-white"
              >
                Muhammad-Mashhood
              </a>
            </p>
          </div>
        </footer>
      </main>
    </div>
  )
}
