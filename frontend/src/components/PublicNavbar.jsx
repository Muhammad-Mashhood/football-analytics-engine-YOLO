import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const linkClass = 'transition-colors hover:text-white'
const loginClass = 'rounded-full bg-[#19ff75] px-4 py-2 font-semibold text-[#03200f] transition-opacity hover:opacity-90'

export default function PublicNavbar() {
  const token = useAuthStore((s) => s.token)

  return (
    <header className="absolute inset-x-0 top-0 z-40 px-4 pt-2 md:px-8 md:pt-3">
      <nav className="mx-auto max-w-3xl rounded-full border border-white/15 bg-black/40 px-6 py-4 backdrop-blur-md">
        <ul className="flex items-center justify-center gap-4 text-sm text-white/75 md:gap-7">
          <li>
            <Link to="/" className={linkClass}>Home</Link>
          </li>
          <li>
            <Link to="/#about" className={linkClass}>About</Link>
          </li>
          <li>
            <Link to="/#pricing" className={linkClass}>Pricing</Link>
          </li>
          <li>
            <Link to={token ? '/app' : '/login'} className={loginClass}>Login</Link>
          </li>
        </ul>
      </nav>
    </header>
  )
}
