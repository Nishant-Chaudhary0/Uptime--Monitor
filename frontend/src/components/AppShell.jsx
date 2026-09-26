import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AppShell() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const onDashboard = location.pathname === '/'

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <header className="border-b border-line bg-surface sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <PulseMark />
            <span className="font-semibold tracking-tight text-[17px]">Pulseboard</span>
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              to="/"
              className={`text-sm ${
                onDashboard ? 'text-ink font-medium' : 'text-ink-soft hover:text-ink'
              } transition-colors`}
            >
              Overview
            </Link>
            <div className="h-4 w-px bg-line" />
            <div className="flex items-center gap-3">
              <div className="text-right leading-tight hidden sm:block">
                <div className="text-sm font-medium">{user?.name || user?.email}</div>
                <div className="text-xs text-ink-faint font-mono">{user?.email}</div>
              </div>
              <button
                onClick={logout}
                className="text-sm text-ink-soft hover:text-down border border-line hover:border-down/40 rounded px-3 py-1.5 transition-colors"
              >
                Sign out
              </button>
            </div>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-8 w-full">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-line py-5">
        <div className="max-w-6xl mx-auto px-6 text-xs text-ink-faint font-mono">
          Pulseboard — every check, one heartbeat.
        </div>
      </footer>
    </div>
  )
}

export function PulseMark({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className="shrink-0">
      <rect width="32" height="32" rx="6" fill="#161D1A" />
      <polyline
        points="4,18 10,18 13,8 18,24 21,14 24,18 28,18"
        fill="none"
        stroke="#1F6E4A"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
