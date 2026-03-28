import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import PublicNavbar from '../components/PublicNavbar'

function getApiErrorMessage(err, fallback) {
  const data = err?.response?.data
  if (!data) return fallback
  if (typeof data === 'string') return data
  if (data.detail) return typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)

  const messages = []
  const walk = (v) => {
    if (typeof v === 'string') messages.push(v)
    else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') Object.values(v).forEach(walk)
  }
  walk(data)
  if (messages.length) return [...new Set(messages)].join(' ')
  return fallback
}

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', username: '', password: '', password2: '' })
  const [loading, setLoading] = useState(false)
  const { register } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.password2) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await register(form.email, form.username, form.password, form.password2)
      navigate('/app')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Registration failed'))
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-2 pt-20"
      >
        <div className="mb-6 w-full text-center">
          <h1 className="font-heading font-bold text-accent text-3xl tracking-tight mb-2">FieldVision</h1>
          <p className="text-text-secondary text-sm uppercase tracking-widest">Request System Access</p>
        </div>

        <div className="w-full bg-bg-card border border-border-medium rounded-lg p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {[
              { key: 'email', label: 'Email', type: 'email', ph: 'analyst@club.com' },
              { key: 'username', label: 'Username', type: 'text', ph: 'tactician_01' },
              { key: 'password', label: 'Password', type: 'password', ph: '••••••••' },
              { key: 'password2', label: 'Confirm Password', type: 'password', ph: '••••••••' },
            ].map(({ key, label, type, ph }) => (
              <div key={key}>
                <label className="text-[10px] text-text-secondary uppercase tracking-widest block mb-2">{label}</label>
                <input
                  type={type}
                  value={form[key]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  required
                  placeholder={ph}
                  className="w-full bg-bg-dark border border-border-strong rounded px-4 py-2 text-text-primary text-sm outline-none focus:border-green-dim3 transition-colors placeholder-[#6b7280]"
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full rounded bg-btn-primary py-2 font-bold text-[#f5fff6] shadow-glow-green transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Creating Access...' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="mt-5 w-full text-center text-text-muted text-xs">
          Already have access?{' '}
          <Link to="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
