export default function StatusPill({ status }) {
  const map = {
    up: { label: 'Up', dot: 'bg-signal', text: 'text-signal', bg: 'bg-signal-soft' },
    down: { label: 'Down', dot: 'bg-down', text: 'text-down', bg: 'bg-down-soft' },
    pending: { label: 'Pending', dot: 'bg-ink-faint', text: 'text-ink-soft', bg: 'bg-line/40' },
  }
  const s = map[status] || map.pending

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${s.text} ${s.bg} rounded px-2 py-1`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}
