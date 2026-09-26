import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
} from 'recharts'
import { monitorApi, checkApi, incidentApi } from '../api/client'
import StatCard from '../components/StatCard'
import StatusPill from '../components/StatusPill'
import HeartbeatBar from '../components/HeartbeatBar'
import AddMonitorModal from '../components/AddMonitorModal'
import AskAi from '../components/AskAi'
import ChartCard from '../components/ChartCard'
import LegendRow from '../components/LegendRow'
import {
  uptimeColor,
  incidentDailyCounts,
  statusCodeBreakdown,
  monitorUptimeRanking,
  monitorResponseComparison,
  CHART_COLORS,
} from '../utils/insights'

// Cheap DB-backed refresh only (no AI calls) — safe to run on an interval.
const REFRESH_MS = 45_000

const tickStyle = { fontSize: 11, fill: '#8B958D', fontFamily: 'JetBrains Mono' }
const tooltipStyle = {
  contentStyle: {
    background: '#161D1A',
    border: 'none',
    borderRadius: 4,
    fontSize: 12,
    fontFamily: 'JetBrains Mono',
  },
  labelStyle: { color: '#8B958D' },
  itemStyle: { color: '#F1F3F0' },
  cursor: { fill: 'rgba(22,29,26,0.04)' },
}

export default function Dashboard() {
  const [monitors, setMonitors] = useState(null)
  const [rows, setRows] = useState({}) // monitor_id -> { checks, stats }
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError('')
    try {
      const [monitorList, incidentList] = await Promise.all([
        monitorApi.list(),
        incidentApi.listAll(),
      ])
      setMonitors(monitorList)
      setIncidents(incidentList)

      const entries = await Promise.all(
        monitorList.map(async (m) => {
          const [checks, stats] = await Promise.all([
            checkApi.listForMonitor(m.id).catch(() => []),
            checkApi.uptimeStats(m.id, '24h').catch(() => null),
          ])
          return [m.id, { checks, stats }]
        })
      )
      setRows(Object.fromEntries(entries))
    } catch (err) {
      setError('Could not load your monitors. Check that the backend is running and reachable.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(() => load(true), REFRESH_MS)
    return () => clearInterval(interval)
  }, [load])

  function statusFor(monitorId) {
    const checks = rows[monitorId]?.checks || []
    if (checks.length === 0) return 'pending'
    return checks[0].is_up ? 'up' : 'down'
  }

  const upCount = monitors?.filter((m) => statusFor(m.id) === 'up').length ?? 0
  const downCount = monitors?.filter((m) => statusFor(m.id) === 'down').length ?? 0
  const pendingCount = (monitors?.length ?? 0) - upCount - downCount

  const uptimeValues = Object.values(rows)
    .map((r) => r.stats?.uptime_percent)
    .filter((v) => typeof v === 'number')
  const avgUptime =
    uptimeValues.length > 0
      ? (uptimeValues.reduce((a, b) => a + b, 0) / uptimeValues.length).toFixed(2)
      : '—'

  const responseValues = Object.values(rows)
    .map((r) => r.stats?.avg_response_time_ms)
    .filter((v) => typeof v === 'number')
  const avgResponse =
    responseValues.length > 0
      ? Math.round(responseValues.reduce((a, b) => a + b, 0) / responseValues.length)
      : '—'

  // ---- chart data, derived client-side from what we already fetched ----
  const allChecks = useMemo(() => Object.values(rows).flatMap((r) => r.checks || []), [rows])

  const uptimeRanking = useMemo(
    () => (monitors ? monitorUptimeRanking(monitors, rows) : []),
    [monitors, rows]
  )
  const responseComparison = useMemo(
    () => (monitors ? monitorResponseComparison(monitors, rows) : []),
    [monitors, rows]
  )
  const incidentTrend = useMemo(() => incidentDailyCounts(incidents, 14), [incidents])
  const statusBreakdown = useMemo(() => statusCodeBreakdown(allChecks), [allChecks])
  const hasIncidentActivity = incidentTrend.some((d) => d.count > 0)

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Overview</h1>
          <p className="text-ink-soft mt-1">
            {monitors?.length
              ? `Watching ${monitors.length} endpoint${monitors.length === 1 ? '' : 's'}.`
              : 'Add your first endpoint to start watching it.'}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-ink text-paper text-sm font-medium px-4 py-2.5 rounded hover:bg-signal transition-colors shrink-0"
        >
          + Add monitor
        </button>
      </div>

      {error && (
        <div className="text-sm text-down bg-down-soft border border-down/20 rounded px-4 py-3 mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <StatCard label="Monitors" value={monitors?.length ?? '—'} />
        <StatCard label="Up now" value={upCount} tone="up" />
        <StatCard label="Down now" value={downCount} tone={downCount > 0 ? 'down' : 'default'} />
        <StatCard label="Avg uptime (24h)" value={avgUptime} unit="%" />
        <StatCard label="Avg response" value={avgResponse} unit="ms" />
      </div>

      {monitors && monitors.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <ChartCard
            title="Uptime by monitor"
            subtitle="Last 24h · lowest first"
            empty={uptimeRanking.length === 0 ? 'No check data yet.' : null}
          >
            <ResponsiveContainer width="100%" height={Math.max(120, uptimeRanking.length * 34)}>
              <BarChart
                layout="vertical"
                data={uptimeRanking}
                margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
                barCategoryGap={10}
              >
                <CartesianGrid stroke={CHART_COLORS.line} horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={tickStyle}
                  axisLine={{ stroke: CHART_COLORS.line }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ ...tickStyle, fontFamily: 'Inter', fill: '#161D1A' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip {...tooltipStyle} formatter={(v) => [`${v}%`, 'uptime']} />
                <Bar dataKey="uptime" radius={[0, 3, 3, 0]} maxBarSize={16}>
                  {uptimeRanking.map((entry) => (
                    <Cell key={entry.id} fill={uptimeColor(entry.uptime)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Response time by monitor"
            subtitle="Last 24h average, slowest first"
            empty={responseComparison.length === 0 ? 'No check data yet.' : null}
          >
            <ResponsiveContainer width="100%" height={Math.max(120, responseComparison.length * 34)}>
              <BarChart
                layout="vertical"
                data={responseComparison}
                margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
                barCategoryGap={10}
              >
                <CartesianGrid stroke={CHART_COLORS.line} horizontal={false} />
                <XAxis
                  type="number"
                  tick={tickStyle}
                  axisLine={{ stroke: CHART_COLORS.line }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ ...tickStyle, fontFamily: 'Inter', fill: '#161D1A' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip {...tooltipStyle} formatter={(v) => [`${v}ms`, 'avg response']} />
                <Bar dataKey="ms" radius={[0, 3, 3, 0]} fill={CHART_COLORS.ink} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Incidents, last 14 days"
            subtitle="Across all monitors, by day started"
            empty={!hasIncidentActivity ? 'No incidents in the last 14 days — clean run.' : null}
          >
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={incidentTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={CHART_COLORS.line} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={tickStyle}
                  axisLine={{ stroke: CHART_COLORS.line }}
                  tickLine={false}
                  interval={2}
                />
                <YAxis tick={tickStyle} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                <Tooltip {...tooltipStyle} formatter={(v) => [v, 'incidents']} />
                <Bar dataKey="count" fill={CHART_COLORS.down} radius={[2, 2, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Check outcomes"
            subtitle="All monitors, most recent checks"
            empty={statusBreakdown.length === 0 ? 'No check data yet.' : null}
          >
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {statusBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <LegendRow items={statusBreakdown} />
          </ChartCard>
        </div>
      )}

      <div className="mb-8">
        <AskAi />
      </div>

      <div className="border border-line bg-surface rounded overflow-hidden">
        <div className="px-5 py-3.5 border-b border-line flex items-center justify-between">
          <h2 className="font-semibold text-ink">Monitors</h2>
          {pendingCount > 0 && (
            <span className="text-xs text-ink-faint font-mono">
              {pendingCount} awaiting first check
            </span>
          )}
        </div>

        {loading && !monitors && (
          <div className="px-5 py-10 text-center text-ink-soft text-sm">Loading monitors…</div>
        )}

        {monitors && monitors.length === 0 && (
          <div className="px-5 py-14 text-center">
            <p className="text-ink font-medium mb-1">No monitors yet</p>
            <p className="text-ink-soft text-sm mb-5">
              Add a URL and Pulseboard will start checking it right away.
            </p>
            <button
              onClick={() => setShowAdd(true)}
              className="bg-ink text-paper text-sm font-medium px-4 py-2.5 rounded hover:bg-signal transition-colors"
            >
              + Add monitor
            </button>
          </div>
        )}

        {monitors && monitors.length > 0 && (
          <ul>
            {monitors.map((m) => {
              const status = statusFor(m.id)
              const stats = rows[m.id]?.stats
              const checks = rows[m.id]?.checks || []
              return (
                <li key={m.id} className="border-b border-line last:border-b-0">
                  <Link
                    to={`/monitors/${m.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-paper transition-colors"
                  >
                    <div className="w-40 shrink-0">
                      <div className="font-medium text-ink truncate">{m.name}</div>
                      <div className="text-xs text-ink-faint font-mono truncate">{m.url}</div>
                    </div>

                    <div className="w-20 shrink-0">
                      <StatusPill status={status} />
                    </div>

                    <div className="flex-1 min-w-[140px] hidden sm:block">
                      <HeartbeatBar checks={checks} limit={32} height={24} />
                    </div>

                    <div className="w-20 shrink-0 text-right font-mono text-sm tabular text-ink">
                      {stats?.uptime_percent != null ? `${stats.uptime_percent}%` : '—'}
                    </div>

                    <div className="w-20 shrink-0 text-right font-mono text-sm tabular text-ink-soft hidden md:block">
                      {stats?.avg_response_time_ms != null ? `${stats.avg_response_time_ms}ms` : '—'}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {showAdd && (
        <AddMonitorModal
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false)
            load(true)
          }}
        />
      )}
    </div>
  )
}
