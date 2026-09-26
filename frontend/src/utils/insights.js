// All of these work on data we've already fetched (checks, incidents,
// uptime stats) — no extra API calls, so adding charts doesn't cost any
// additional requests against the backend or its quota.

export const CHART_COLORS = {
  up: '#1F6E4A',
  upDim: '#3D8863',
  down: '#C1432B',
  warn: '#B8863A',
  ink: '#161D1A',
  faint: '#8B958D',
  line: '#DCE1DC',
}

export function uptimeColor(pct) {
  if (pct == null) return CHART_COLORS.faint
  if (pct >= 99.5) return CHART_COLORS.up
  if (pct >= 95) return CHART_COLORS.warn
  return CHART_COLORS.down
}

// Buckets a monitor's checks into one row per day for the last `days` days
// (today inclusive), using whatever checks we already have in hand. If the
// monitor checks infrequently, some early days may simply have no data.
export function dailyUptimeBuckets(checks, days = 14) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const buckets = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    buckets.push({ key: d.toDateString(), date: d, up: 0, down: 0, total: 0, sumMs: 0, msCount: 0 })
  }
  const byKey = Object.fromEntries(buckets.map((b) => [b.key, b]))

  checks.forEach((c) => {
    const d = new Date(c.checked_at)
    d.setHours(0, 0, 0, 0)
    const b = byKey[d.toDateString()]
    if (!b) return
    b.total += 1
    if (c.is_up) b.up += 1
    else b.down += 1
    if (c.response_time_ms != null) {
      b.sumMs += c.response_time_ms
      b.msCount += 1
    }
  })

  return buckets.map((b) => ({
    label: b.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    total: b.total,
    upPct: b.total ? Math.round((b.up / b.total) * 1000) / 10 : null,
    avgMs: b.msCount ? Math.round(b.sumMs / b.msCount) : null,
  }))
}

// Same day-bucketing idea, applied to incident start times instead of checks.
export function incidentDailyCounts(incidents, days = 14) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const buckets = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    buckets.push({ key: d.toDateString(), date: d, count: 0 })
  }
  const byKey = Object.fromEntries(buckets.map((b) => [b.key, b]))

  incidents.forEach((inc) => {
    const d = new Date(inc.started_at)
    d.setHours(0, 0, 0, 0)
    const b = byKey[d.toDateString()]
    if (b) b.count += 1
  })

  return buckets.map((b) => ({
    label: b.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    count: b.count,
  }))
}

// Groups checks by HTTP status class. Checks with no status code (a
// connection failure / timeout) get their own bucket rather than being
// dropped.
export function statusCodeBreakdown(checks) {
  const groups = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0, 'No response': 0 }
  checks.forEach((c) => {
    const code = c.status_code
    if (code == null) groups['No response'] += 1
    else if (code < 300) groups['2xx'] += 1
    else if (code < 400) groups['3xx'] += 1
    else if (code < 500) groups['4xx'] += 1
    else groups['5xx'] += 1
  })
  const colorMap = {
    '2xx': CHART_COLORS.up,
    '3xx': CHART_COLORS.upDim,
    '4xx': CHART_COLORS.warn,
    '5xx': CHART_COLORS.down,
    'No response': CHART_COLORS.faint,
  }
  return Object.entries(groups)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({ name, value, color: colorMap[name] }))
}

export function responsePercentiles(checks) {
  const values = checks.map((c) => c.response_time_ms).filter((v) => v != null).sort((a, b) => a - b)
  if (values.length === 0) return null
  const at = (p) => values[Math.min(values.length - 1, Math.floor(p * values.length))]
  return {
    min: values[0],
    p50: at(0.5),
    p95: at(0.95),
    p99: at(0.99),
    max: values[values.length - 1],
    count: values.length,
  }
}

export function responseHistogram(checks) {
  const bands = [
    { label: '0–100ms', min: 0, max: 100 },
    { label: '100–250ms', min: 100, max: 250 },
    { label: '250–500ms', min: 250, max: 500 },
    { label: '500ms–1s', min: 500, max: 1000 },
    { label: '1s+', min: 1000, max: Infinity },
  ]
  const values = checks.map((c) => c.response_time_ms).filter((v) => v != null)
  return bands.map((b) => ({
    label: b.label,
    count: values.filter((v) => v >= b.min && v < b.max).length,
  }))
}

// Ranks monitors by 24h-ish uptime %, worst first — the ones that most
// need attention float to the top of the chart.
export function monitorUptimeRanking(monitors, rows) {
  return monitors
    .map((m) => ({ name: m.name, id: m.id, uptime: rows[m.id]?.stats?.uptime_percent ?? null }))
    .filter((r) => r.uptime != null)
    .sort((a, b) => a.uptime - b.uptime)
}

export function monitorResponseComparison(monitors, rows) {
  return monitors
    .map((m) => ({ name: m.name, id: m.id, ms: rows[m.id]?.stats?.avg_response_time_ms ?? null }))
    .filter((r) => r.ms != null)
    .sort((a, b) => b.ms - a.ms)
}
