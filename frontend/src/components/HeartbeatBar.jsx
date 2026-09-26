// Renders a row of small bars, one per check, oldest -> newest, colored by
// up/down state. This is the core "signal" visual of the product: a quick
// scan of recent health without reading numbers.
export default function HeartbeatBar({ checks = [], limit = 40, height = 28 }) {
  const ordered = [...checks].reverse().slice(-limit)
  const padded = Array.from({ length: Math.max(0, limit - ordered.length) }).map(() => null)
  const bars = [...padded, ...ordered]

  return (
    <div className="flex items-end gap-[3px]" style={{ height }}>
      {bars.map((c, i) => {
        if (!c) {
          return (
            <div
              key={i}
              className="flex-1 min-w-[3px] rounded-[1px] bg-line"
              style={{ height: '35%' }}
            />
          )
        }
        const isUp = c.is_up
        return (
          <div
            key={c.id ?? i}
            title={`${isUp ? 'Up' : 'Down'} · ${new Date(c.checked_at).toLocaleString()}${
              c.response_time_ms != null ? ` · ${c.response_time_ms}ms` : ''
            }`}
            className={`flex-1 min-w-[3px] rounded-[1px] origin-bottom animate-rise ${
              isUp ? 'bg-signal' : 'bg-down'
            }`}
            style={{ height: '100%', animationDelay: `${i * 6}ms` }}
          />
        )
      })}
    </div>
  )
}
