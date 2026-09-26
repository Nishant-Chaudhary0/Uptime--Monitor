export default function ChartCard({ title, subtitle, right, children, empty, className = '' }) {
  return (
    <div className={`border border-line bg-surface rounded p-5 ${className}`}>
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h3 className="font-semibold text-ink text-sm">{title}</h3>
          {subtitle && <p className="text-xs text-ink-faint mt-0.5">{subtitle}</p>}
        </div>
        {right}
      </div>
      {empty ? (
        <div className="h-[160px] flex items-center justify-center text-sm text-ink-faint">
          {empty}
        </div>
      ) : (
        children
      )}
    </div>
  )
}
