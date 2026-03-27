import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'
import PublicNavbar from '../components/PublicNavbar'

function getApiErrorMessage(err, fallback) {
  const data = err?.response?.data
  if (!data) return fallback
  if (typeof data === 'string') return data
  if (data.detail) return data.detail

  const firstEntry = Object.values(data)[0]
  if (Array.isArray(firstEntry) && firstEntry[0]) return String(firstEntry[0])
  if (typeof firstEntry === 'string') return firstEntry
  return fallback
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()
  const { data: authConfig } = useQuery({
    queryKey: ['auth-config'],
    queryFn: () => api.get('/api/auth/config/').then((r) => r.data),
    retry: 1,
  })

  const githubClientId = authConfig?.github_client_id || import.meta.env.VITE_GITHUB_CLIENT_ID
  const googleClientId = authConfig?.google_client_id || import.meta.env.VITE_GOOGLE_CLIENT_ID
  const googleRedirectUri =
    authConfig?.google_redirect_uri || import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/auth/google/callback`
  const githubRedirectUri =
    authConfig?.github_redirect_uri || import.meta.env.VITE_GITHUB_REDIRECT_URI || `${window.location.origin}/auth/github/callback`
  const hasGitHubOAuth = !!githubClientId
  const hasGoogleOAuth = !!googleClientId

  const googleOauthUrl = hasGoogleOAuth
    ? `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
        client_id: googleClientId,
        redirect_uri: googleRedirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'online',
        prompt: 'select_account',
      })}`
    : '#'

  const githubOauthUrl = hasGitHubOAuth
    ? `https://github.com/login/oauth/authorize?${new URLSearchParams({
        client_id: githubClientId,
        scope: 'user:email',
        redirect_uri: githubRedirectUri,
      })}`
    : '#'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      navigate('/app')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Invalid credentials'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg relative overflow-hidden px-4">
      <PublicNavbar />
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,255,65,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,65,0.3) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[rgba(0,255,65,0.03)] blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-2 pt-20"
      >
        <div className="mb-10 w-full text-center">
          <h1 className="font-heading font-bold text-accent text-3xl tracking-tight mb-2">FieldVision</h1>
          <p className="text-text-secondary text-sm uppercase tracking-widest">Tactical HUD Engine</p>
        </div>

        <div className="w-full bg-bg-card border border-border-medium rounded-lg p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <span className="text-text-secondary text-xs uppercase tracking-widest font-bold">Secure Access</span>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] text-text-secondary uppercase tracking-widest block mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-bg-dark border border-border-strong rounded px-4 py-3 text-text-primary text-sm outline-none focus:border-green-dim3 transition-colors placeholder-[#6b7280]"
                placeholder="analyst@club.com"
              />
            </div>
            <div>
              <label className="text-[10px] text-text-secondary uppercase tracking-widest block mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-bg-dark border border-border-strong rounded px-4 py-3 text-text-primary text-sm outline-none focus:border-green-dim3 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded font-bold text-[#f5fff6] bg-btn-primary shadow-glow-green hover:opacity-90 transition-opacity mt-2 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Access System'}
            </button>
          </form>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-border-medium" />
            <span className="text-[10px] text-text-muted uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-border-medium" />
          </div>

          <div className="flex flex-col gap-3">
            {hasGoogleOAuth ? (
              <a
                href={googleOauthUrl}
                className="flex items-center justify-center gap-3 py-3 rounded border border-border-strong bg-bg-muted text-text-primary text-sm font-medium hover:border-green-dim3 transition-colors"
              >
                Continue with Google
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="flex items-center justify-center gap-3 py-3 rounded border border-border-strong bg-bg-muted text-text-muted text-sm font-medium cursor-not-allowed"
              >
                Google OAuth not configured
              </button>
            )}

            {hasGitHubOAuth ? (
              <a
                href={githubOauthUrl}
                className="flex items-center justify-center gap-3 py-3 rounded border border-border-strong bg-bg-muted text-text-primary text-sm font-medium hover:border-green-dim3 transition-colors"
              >
                Continue with GitHub
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="flex items-center justify-center gap-3 py-3 rounded border border-border-strong bg-bg-muted text-text-muted text-sm font-medium cursor-not-allowed"
              >
                GitHub OAuth not configured
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 w-full text-center text-text-muted text-xs">
          No account?{' '}
          <Link to="/register" className="text-accent hover:underline">
            Register access
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
