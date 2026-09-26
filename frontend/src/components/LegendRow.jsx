export default function LegendRow({ items }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
      {items.map((item) => (
        <div key={item.name} className="flex items-center gap-1.5 text-xs">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
          <span className="text-ink-soft">{item.name}</span>
          <span className="font-mono text-ink tabular">{item.value}</span>
        </div>
      ))}
    </div>
  )
}
