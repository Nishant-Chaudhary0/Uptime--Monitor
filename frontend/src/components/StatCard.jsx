export default function StatCard({ label, value, unit, tone = 'default', hint }) {
  const toneClass =
    tone === 'up' ? 'text-signal' : tone === 'down' ? 'text-down' : 'text-ink'

  return (
    <div className="border border-line bg-surface rounded px-5 py-4">
      <div className="text-xs text-ink-soft mb-2">{label}</div>
      <div className={`font-mono text-2xl font-semibold tabular ${toneClass}`}>
        {value}
        {unit && <span className="text-sm font-normal text-ink-faint ml-1">{unit}</span>}
      </div>
      {hint && <div className="text-xs text-ink-faint mt-1">{hint}</div>}
    </div>
  )
}
