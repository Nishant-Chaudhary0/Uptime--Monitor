import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
} from 'recharts'
import { monitorApi, checkApi, incidentApi } from '../api/client'
import StatCard from '../components/StatCard'
import StatusPill from '../components/StatusPill'
import HeartbeatBar from '../components/HeartbeatBar'
import ChartCard from '../components/ChartCard'
import LegendRow from '../components/LegendRow'
import {
  dailyUptimeBuckets,
  statusCodeBreakdown,
  responsePercentiles,
  responseHistogram,
  uptimeColor,
  CHART_COLORS,
} from '../utils/insights'

const RANGES = [
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
]

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

export default function MonitorDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [monitor, setMonitor] = useState(null)
  const [checks, setChecks] = useState([])
  const [stats, setStats] = useState(null)
  const [incidents, setIncidents] = useState([])
  const [range, setRange] = useState('24h')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      setError('')
      try {
        const [m, c, i] = await Promise.all([
          monitorApi.getById(id),
          checkApi.listForMonitor(id),
          incidentApi.listForMonitor(id),
        ])
        setMonitor(m)
        setChecks(c)
        setIncidents(i)
      } catch (err) {
        setError('Could not load this monitor.')
      } finally {
        setLoading(false)
      }
    },
    [id]
  )

  useEffect(() => {
    load()
    const interval = setInterval(() => load(true), REFRESH_MS)
    return () => clearInterval(interval)
  }, [load])

  useEffect(() => {
    let cancelled = false
    checkApi
      .uptimeStats(id, range)
      .then((res) => {
        if (!cancelled) setStats(res)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [id, range])

  async function handleDelete() {
    if (!window.confirm(`Delete "${monitor?.name}"? This can't be undone.`)) return
    setDeleting(true)
    try {
      await monitorApi.remove(id)
      navigate('/', { replace: true })
    } catch {
      setError('Could not delete this monitor.')
      setDeleting(false)
    }
  }

  const rangeDays = range === '24h' ? 1 : range === '7d' ? 7 : 30
  const bucketDays = Math.max(rangeDays, 7) // always show at least a week of bars for context

  const dailyBuckets = useMemo(() => dailyUptimeBuckets(checks, bucketDays), [checks, bucketDays])
  const histogram = useMemo(() => responseHistogram(checks), [checks])
  const breakdown = useMemo(() => statusCodeBreakdown(checks), [checks])
  const percentiles = useMemo(() => responsePercentiles(checks), [checks])

  const chartData = useMemo(
    () =>
      [...checks]
        .reverse()
        .filter((c) => c.response_time_ms != null)
        .map((c) => ({
          time: new Date(c.checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          ms: c.response_time_ms,
        })),
    [checks]
  )

  const incidentDurations = useMemo(
    () =>
      [...incidents]
        .filter((i) => i.duration_minutes != null)
        .sort((a, b) => b.duration_minutes - a.duration_minutes)
        .slice(0, 8)
        .map((i) => ({
          label: new Date(i.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          minutes: i.duration_minutes,
        }))
        .reverse(),
    [incidents]
  )

  if (loading && !monitor) {
    return <div className="text-ink-soft text-sm py-10 text-center">Loading monitor…</div>
  }

  if (!monitor) {
    return (
      <div className="text-center py-14">
        <p className="text-ink font-medium mb-1">Monitor not found</p>
        <Link to="/" className="text-signal text-sm underline underline-offset-2">
          Back to overview
        </Link>
      </div>
    )
  }

  const status = checks.length === 0 ? 'pending' : checks[0].is_up ? 'up' : 'down'

  return (
    <div>
      <Link to="/" className="text-sm text-ink-soft hover:text-ink mb-4 inline-block">
        ← Overview
      </Link>

      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h1 className="text-2xl font-semibold text-ink">{monitor.name}</h1>
            <StatusPill status={status} />
          </div>
          <a
            href={monitor.url}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-mono text-ink-soft hover:text-signal underline underline-offset-2"
          >
            {monitor.url}
          </a>
          <p className="text-xs text-ink-faint mt-1">
            Checking every {monitor.check_intervel_minutes} minute
            {monitor.check_intervel_minutes === 1 ? '' : 's'}
          </p>
        </div>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-sm text-down border border-down/30 hover:bg-down-soft rounded px-3.5 py-2 transition-colors disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Delete monitor'}
        </button>
      </div>

      {error && (
        <div className="text-sm text-down bg-down-soft border border-down/20 rounded px-4 py-3 mb-6">
          {error}
        </div>
      )}

      <div className="border border-line bg-surface rounded p-5 mb-6">
        <div className="text-xs text-ink-soft mb-3">Recent checks</div>
        <HeartbeatBar checks={checks} limit={60} height={40} />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-ink">Uptime</h2>
        <div className="flex border border-line rounded overflow-hidden">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                range === r.value
                  ? 'bg-ink text-paper'
                  : 'bg-surface text-ink-soft hover:text-ink'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard
          label="Uptime"
          value={stats?.uptime_percent != null ? stats.uptime_percent : '—'}
          unit={stats?.uptime_percent != null ? '%' : ''}
        />
        <StatCard label="Avg response" value={stats?.avg_response_time_ms ?? '—'} unit="ms" />
        <StatCard
          label="Checks"
          value={stats?.total_checks ?? '—'}
          hint={stats ? `${stats.up_checks} up · ${stats.down_checks} down` : undefined}
        />
        <StatCard
          label="Incidents"
          value={stats?.incident_count ?? '—'}
          tone={stats?.incident_count > 0 ? 'down' : 'default'}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <ChartCard
          title="Uptime by day"
          subtitle={`Last ${bucketDays} days, from recent checks`}
        >
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dailyBuckets} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.line} vertical={false} />
              <XAxis
                dataKey="label"
                tick={tickStyle}
                axisLine={{ stroke: CHART_COLORS.line }}
                tickLine={false}
                interval={bucketDays > 14 ? 3 : 0}
              />
              <YAxis domain={[0, 100]} tick={tickStyle} axisLine={false} tickLine={false} width={32} />
              <Tooltip
                {...tooltipStyle}
                formatter={(v, key, entry) =>
                  v == null ? ['no data', 'uptime'] : [`${v}% (${entry.payload.total} checks)`, 'uptime']
                }
              />
              <Bar dataKey="upPct" radius={[2, 2, 0, 0]} maxBarSize={22}>
                {dailyBuckets.map((entry) => (
                  <Cell key={entry.label} fill={entry.total === 0 ? CHART_COLORS.line : uptimeColor(entry.upPct)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Response time distribution" subtitle="From checks currently loaded">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={histogram} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.line} vertical={false} />
              <XAxis dataKey="label" tick={tickStyle} axisLine={{ stroke: CHART_COLORS.line }} tickLine={false} />
              <YAxis tick={tickStyle} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
              <Tooltip {...tooltipStyle} formatter={(v) => [v, 'checks']} />
              <Bar dataKey="count" fill={CHART_COLORS.upDim} radius={[2, 2, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <ChartCard title="Response time trend" subtitle="Most recent checks, oldest to newest">
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={CHART_COLORS.line} vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={tickStyle}
                  axisLine={{ stroke: CHART_COLORS.line }}
                  tickLine={false}
                  minTickGap={40}
                />
                <YAxis tick={tickStyle} axisLine={false} tickLine={false} width={48} />
                <Tooltip {...tooltipStyle} formatter={(v) => [`${v}ms`, 'response']} />
                <Line
                  type="monotone"
                  dataKey="ms"
                  stroke={CHART_COLORS.up}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[190px] flex items-center justify-center text-sm text-ink-faint">
              Not enough data yet.
            </div>
          )}
        </ChartCard>

        <ChartCard title="Check outcomes" subtitle="From checks currently loaded">
          {breakdown.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie
                    data={breakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={44}
                    outerRadius={66}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {breakdown.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <LegendRow items={breakdown} />
            </>
          ) : (
            <div className="h-[150px] flex items-center justify-center text-sm text-ink-faint">
              No check data yet.
            </div>
          )}
        </ChartCard>
      </div>

      {percentiles && (
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-8">
          <StatCard label="Fastest" value={percentiles.min} unit="ms" />
          <StatCard label="Median (p50)" value={percentiles.p50} unit="ms" />
          <StatCard label="p95" value={percentiles.p95} unit="ms" />
          <StatCard label="p99" value={percentiles.p99} unit="ms" />
          <StatCard label="Slowest" value={percentiles.max} unit="ms" />
        </div>
      )}

      {incidentDurations.length > 0 && (
        <ChartCard
          title="Longest incidents"
          subtitle="Duration in minutes, most recent checks window"
          className="mb-4"
        >
          <ResponsiveContainer width="100%" height={Math.max(100, incidentDurations.length * 32)}>
            <BarChart
              layout="vertical"
              data={incidentDurations}
              margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
              barCategoryGap={8}
            >
              <CartesianGrid stroke={CHART_COLORS.line} horizontal={false} />
              <XAxis type="number" tick={tickStyle} axisLine={{ stroke: CHART_COLORS.line }} tickLine={false} />
              <YAxis
                type="category"
                dataKey="label"
                width={64}
                tick={{ ...tickStyle, fontFamily: 'Inter', fill: '#161D1A' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip {...tooltipStyle} formatter={(v) => [`${v} min`, 'duration']} />
              <Bar dataKey="minutes" fill={CHART_COLORS.down} radius={[0, 3, 3, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <div className="border border-line bg-surface rounded overflow-hidden">
        <div className="px-5 py-3.5 border-b border-line">
          <h2 className="font-semibold text-ink">Incidents</h2>
        </div>
        {incidents.length === 0 ? (
          <div className="px-5 py-10 text-center text-ink-soft text-sm">
            No incidents recorded for this monitor.
          </div>
        ) : (
          <ul>
            {incidents.map((inc) => (
              <li key={inc.id} className="border-b border-line last:border-b-0 px-5 py-4">
                <div className="flex items-center justify-between gap-4 mb-1">
                  <span className="text-sm font-medium text-ink">
                    {new Date(inc.started_at).toLocaleString()}
                  </span>
                  <span className="text-xs font-mono text-ink-faint tabular">
                    {inc.resolved_at
                      ? `resolved · ${inc.duration_minutes ?? '—'}m`
                      : 'ongoing'}
                  </span>
                </div>
                {inc.ai_summary && (
                  <p className="text-sm text-ink-soft leading-relaxed">{inc.ai_summary}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
