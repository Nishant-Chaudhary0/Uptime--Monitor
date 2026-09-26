import { PulseMark } from './AppShell'

const LOG_LINES = [
  { path: '/health', code: 200, ms: 41 },
  { path: '/api/v1/status', code: 200, ms: 118 },
  { path: '/checkout', code: 200, ms: 73 },
  { path: '/api/users', code: 200, ms: 96 },
  { path: '/webhook', code: 503, ms: 4012 },
  { path: '/api/v1/status', code: 200, ms: 55 },
]

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-paper flex">
      <div className="hidden lg:flex lg:w-[46%] bg-ink text-paper flex-col justify-between p-10 relative overflow-hidden">
        <div className="flex items-center gap-2.5">
          <PulseMark />
          <span className="font-semibold tracking-tight text-[17px]">Pulseboard</span>
        </div>

        <div className="relative z-10">
          <svg viewBox="0 0 400 120" className="w-full h-28 mb-8">
            <polyline
              points="0,60 60,60 78,20 100,100 122,60 400,60"
              fill="none"
              stroke="#3D8863"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength="1"
              style={{
                strokeDasharray: 1,
                strokeDashoffset: 1,
                animation: 'draw 1.8s ease-out forwards',
              }}
            />
          </svg>
          <style>{`@keyframes draw { to { stroke-dashoffset: 0; } }`}</style>

          <h2 className="text-2xl font-semibold leading-snug mb-3 max-w-sm">
            Know the moment something goes quiet.
          </h2>
          <p className="text-paper/60 text-[15px] leading-relaxed max-w-sm">
            Pulseboard checks your endpoints on a schedule you set, and tells you
            the instant one stops answering.
          </p>
        </div>

        <div className="font-mono text-xs space-y-1.5 relative z-10">
          {LOG_LINES.map((l, i) => (
            <div key={i} className="flex items-center gap-3 text-paper/50">
              <span className={l.code >= 400 ? 'text-down' : 'text-signal-dim'}>
                {l.code >= 400 ? '✕' : '✓'}
              </span>
              <span className="w-36 truncate">{l.path}</span>
              <span className="w-10">{l.code}</span>
              <span className="tabular">{l.ms}ms</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-10 justify-center">
            <PulseMark />
            <span className="font-semibold tracking-tight text-[17px]">Pulseboard</span>
          </div>
          <h1 className="text-2xl font-semibold text-ink mb-1.5">{title}</h1>
          <p className="text-ink-soft text-[15px] mb-8">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  )
}
