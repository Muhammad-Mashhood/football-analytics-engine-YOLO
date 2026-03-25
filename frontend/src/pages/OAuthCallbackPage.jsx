import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'

function getApiErrorMessage(err, fallback) {
  const data = err?.response?.data
  if (!data) return fallback
  if (typeof data === 'string') return data
  if (data.detail) return data.detail
  if (data.error) return data.error

  const firstEntry = Object.values(data)[0]
  if (Array.isArray(firstEntry) && firstEntry[0]) return String(firstEntry[0])
  if (typeof firstEntry === 'string') return firstEntry
  return fallback
}

export default function OAuthCallbackPage({ provider }) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const loginGoogleCode = useAuthStore((s) => s.loginGoogleCode)
  const loginGitHub = useAuthStore((s) => s.loginGitHub)

  useEffect(() => {
    const run = async () => {
      const err = searchParams.get('error')
      if (err) {
        toast.error(`OAuth error: ${err}`)
        navigate('/login', { replace: true })
        return
      }

      const code = searchParams.get('code')
      if (!code) {
        toast.error('Missing OAuth code')
        navigate('/login', { replace: true })
        return
      }

      try {
        if (provider === 'google') {
          const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/auth/google/callback`
          await loginGoogleCode(code, redirectUri)
        } else {
          const redirectUri = import.meta.env.VITE_GITHUB_REDIRECT_URI || `${window.location.origin}/auth/github/callback`
          await loginGitHub(code, redirectUri)
        }
        navigate('/', { replace: true })
      } catch (error) {
        toast.error(getApiErrorMessage(error, `${provider} login failed`))
        navigate('/login', { replace: true })
      }
    }

    run()
  }, [provider, searchParams, navigate, loginGoogleCode, loginGitHub])

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-text-secondary text-sm">Completing {provider} sign-in...</div>
    </div>
  )
}
