import { useEffect, useRef, useState } from 'react'
import { aiApi } from '../api/client'
import { CHART_COLORS } from '../utils/insights'

const SUGGESTIONS = [
  'Which monitor had the most downtime this week?',
  'What is my average response time across all monitors?',
  'How many incidents happened in the last 7 days?',
  'Which monitor is the least reliable?',
]

const FOLLOW_UPS = [
  'Which monitor is the slowest right now?',
  'List my longest incidents this month',
  'Which monitors have 100% uptime in the last 24 hours?',
  'Compare uptime of all monitors over the last 7 days',
]

// ---------------------------------------------------------------------------
// Answer formatting helpers
// ---------------------------------------------------------------------------

function humanizeKey(key) {
  return String(key)
    .replace(/_/g, ' ')
    .replace(/\bms\b/i, '(ms)')
    .replace(/\bpct\b/i, '%')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/

function formatCell(key, value) {
  if (value == null || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  const k = String(key).toLowerCase()
  if (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value)) && !ISO_DATE.test(value))) {
    const n = Number(value)
    const rounded = Number.isInteger(n) ? n : Math.round(n * 100) / 100
    const text = rounded.toLocaleString()
    if (/percent|pct|uptime/.test(k)) return `${text}%`
    if (/(_ms$|response_time|latency)/.test(k)) return `${text} ms`
    if (/minute/.test(k)) return `${text} min`
    return text
  }
  if (typeof value === 'string' && ISO_DATE.test(value)) {
    const d = new Date(value)
    if (!isNaN(d)) return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  }
  return String(value)
}

const isNumeric = (v) => typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v)) && !ISO_DATE.test(v))

// Decide how to show the rows: a few headline numbers, a ranked bar list,
// or a plain table.
function resultShape(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return 'none'
  const keys = Object.keys(rows[0])
  if (rows.length === 1 && keys.length <= 4 && keys.every((k) => isNumeric(rows[0][k]))) return 'stats'
  if (rows.length >= 2 && rows.length <= 12 && keys.length === 2) {
    const [a, b] = keys
    if (!isNumeric(rows[0][a]) && isNumeric(rows[0][b])) return 'bars'
  }
  return 'table'
}

// Tiny markdown subset: **bold**, `code`, "- " / "* " bullets, "1." lists.
function renderInline(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i} className="font-semibold text-ink">{p.slice(2, -2)}</strong>
    if (p.startsWith('`') && p.endsWith('`')) return <code key={i} className="font-mono text-[0.85em] bg-paper border border-line rounded px-1 py-0.5 text-signal">{p.slice(1, -1)}</code>
    return <span key={i}>{p}</span>
  })
}

function AnswerText({ text }) {
  const lines = String(text || '').split('\n')
  const blocks = []
  let list = null
  const flush = () => {
    if (list) blocks.push(list)
    list = null
  }
  lines.forEach((raw) => {
    const line = raw.trim()
    if (!line) return flush()
    const bullet = line.match(/^[-*•]\s+(.*)/)
    const numbered = line.match(/^\d+[.)]\s+(.*)/)
    if (bullet || numbered) {
      const type = bullet ? 'ul' : 'ol'
      if (!list || list.type !== type) {
        flush()
        list = { type, items: [] }
      }
      list.items.push((bullet || numbered)[1])
    } else {
      flush()
      blocks.push({ type: 'p', text: line })
    }
  })
  flush()

  return (
    <div className="space-y-2.5 text-[15px] leading-relaxed text-ink">
      {blocks.map((b, i) =>
        b.type === 'p' ? (
          <p key={i}>{renderInline(b.text)}</p>
        ) : (
          <ul key={i} className={`space-y-1 pl-5 ${b.type === 'ul' ? 'list-disc' : 'list-decimal'} marker:text-ink-faint`}>
            {b.items.map((it, j) => (
              <li key={j}>{renderInline(it)}</li>
            ))}
          </ul>
        )
      )}
    </div>
  )
}

function StatsRow({ row }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {Object.entries(row).map(([k, v]) => (
        <div key={k} className="border border-line bg-paper rounded px-3 py-2.5">
          <div className="text-[11px] text-ink-faint mb-1">{humanizeKey(k)}</div>
          <div className="font-mono text-lg font-semibold text-signal tabular">{formatCell(k, v)}</div>
        </div>
      ))}
    </div>
  )
}

function BarList({ rows }) {
  const [labelKey, valueKey] = Object.keys(rows[0])
  const max = Math.max(...rows.map((r) => Number(r[valueKey]) || 0), 1)
  return (
    <div className="border border-line rounded bg-paper p-3 space-y-2">
      <div className="flex justify-between text-[11px] text-ink-faint">
        <span>{humanizeKey(labelKey)}</span>
        <span>{humanizeKey(valueKey)}</span>
      </div>
      {rows.map((r, i) => {
        const pct = Math.max(2, ((Number(r[valueKey]) || 0) / max) * 100)
        return (
          <div key={i}>
            <div className="flex justify-between text-xs mb-1 gap-3">
              <span className="text-ink truncate">{String(r[labelKey])}</span>
              <span className="font-mono text-ink-soft tabular shrink-0">{formatCell(valueKey, r[valueKey])}</span>
            </div>
            <div className="h-1.5 bg-line rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: CHART_COLORS.up }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DataTable({ rows }) {
  const shown = rows.slice(0, 20)
  const keys = Object.keys(rows[0])
  return (
    <div>
      <div className="overflow-x-auto border border-line rounded">
        <table className="w-full text-xs">
          <thead className="bg-paper text-ink-soft">
            <tr>
              {keys.map((k) => (
                <th key={k} className="text-left px-3 py-2 font-medium whitespace-nowrap">{humanizeKey(k)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, i) => (
              <tr key={i} className="border-t border-line hover:bg-paper/60">
                {keys.map((k) => (
                  <td key={k} className={`px-3 py-2 whitespace-nowrap text-ink ${isNumeric(row[k]) ? 'font-mono tabular text-right' : ''}`}>
                    {formatCell(k, row[k])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > shown.length && (
        <p className="text-[11px] text-ink-faint mt-1.5">Showing {shown.length} of {rows.length} rows</p>
      )}
    </div>
  )
}

function Thinking() {
  return (
    <div className="flex items-center gap-2 text-sm text-ink-soft">
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-signal animate-blink" style={{ animationDelay: `${i * 180}ms` }} />
        ))}
      </span>
      Looking through your monitors…
    </div>
  )
}

function Turn({ turn, onRetry, onFollowUp, isLast }) {
  const [showSql, setShowSql] = useState(false)
  const [copied, setCopied] = useState(false)
  const { result } = turn
  const rows = Array.isArray(result?.data) ? result.data : []
  const shape = resultShape(rows)

  async function copy() {
    try {
      await navigator.clipboard.writeText(result.answer)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-signal-soft border border-signal/30 text-ink text-sm rounded-lg rounded-br-sm px-3.5 py-2">
          {turn.q}
        </div>
      </div>

      <div className="border border-line bg-surface rounded-lg rounded-bl-sm p-4 space-y-3">
        {turn.loading && <Thinking />}

        {turn.error && (
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-down">{turn.error}</p>
            <button onClick={() => onRetry(turn)} className="text-xs text-ink-soft border border-line hover:border-signal hover:text-signal rounded px-2.5 py-1 shrink-0 transition-colors">
              Try again
            </button>
          </div>
        )}

        {result && (
          <>
            {result.answer ? (
              <AnswerText text={result.answer} />
            ) : (
              <p className="text-sm text-ink-soft">I couldn't put together an answer for that. Try rephrasing it.</p>
            )}

            {shape === 'stats' && <StatsRow row={rows[0]} />}
            {shape === 'bars' && <BarList rows={rows} />}
            {shape === 'table' && <DataTable rows={rows} />}
            {shape === 'none' && Array.isArray(result.data) && (
              <p className="text-xs text-ink-faint">The query ran but returned no matching records.</p>
            )}

            <div className="flex items-center gap-4 pt-1">
              {result.answer && (
                <button onClick={copy} className="text-xs text-ink-faint hover:text-ink-soft transition-colors">
                  {copied ? 'Copied' : 'Copy answer'}
                </button>
              )}
              {result.generated_sql && (
                <button onClick={() => setShowSql((v) => !v)} className="text-xs text-ink-faint hover:text-ink-soft transition-colors">
                  {showSql ? 'Hide' : 'Show'} query
                </button>
              )}
            </div>
            {showSql && (
              <pre className="bg-paper border border-line text-ink-soft text-xs font-mono rounded p-3 overflow-x-auto whitespace-pre-wrap">
                {result.generated_sql}
              </pre>
            )}
          </>
        )}
      </div>

      {isLast && result && (
        <div className="flex flex-wrap gap-2">
          {onFollowUp.map((s) => (
            <button
              key={s}
              onClick={() => onFollowUp.ask(s)}
              className="text-xs text-ink-soft border border-line rounded-full px-3 py-1.5 hover:border-signal hover:text-signal transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Deliberately un-clever: the AI endpoint is only called when the person
// presses "Ask" (or taps a suggestion) — never on keystroke, mount or an
// interval. The backend calls Gemini twice per question, so this keeps
// free-tier usage predictable.
export default function AskAi() {
  const [question, setQuestion] = useState('')
  const [turns, setTurns] = useState([])
  const busy = turns.some((t) => t.loading)
  const endRef = useRef(null)

  useEffect(() => {
    if (turns.length) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [turns])

  function errorMessage(err) {
    const e = err?.response?.data?.error
    if (err?.response?.status === 429) return 'The AI is rate limited right now. Give it a minute and try again.'
    if (typeof e === 'string') return e
    return e?.formErrors?.[0] || 'Could not answer that question right now.'
  }

  async function run(id, text) {
    try {
      const res = await aiApi.ask(text)
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, loading: false, result: res } : x)))
    } catch (err) {
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, loading: false, error: errorMessage(err) } : x)))
    }
  }

  function ask(q) {
    const text = (q ?? question).trim()
    if (!text || busy) return
    const id = Date.now()
    setTurns((t) => [...t, { id, q: text, loading: true, result: null, error: '' }])
    setQuestion('')
    run(id, text)
  }

  function retry(turn) {
    if (busy) return
    setTurns((t) => t.map((x) => (x.id === turn.id ? { ...x, loading: true, error: '' } : x)))
    run(turn.id, turn.q)
  }

  const asked = new Set(turns.map((t) => t.q))
  const followUps = FOLLOW_UPS.filter((s) => !asked.has(s)).slice(0, 3)
  followUps.ask = ask

  return (
    <div className="border border-line bg-surface rounded p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-ink">Ask your data</h3>
        {turns.length > 0 ? (
          <button onClick={() => !busy && setTurns([])} disabled={busy} className="text-xs text-ink-faint hover:text-ink-soft disabled:opacity-40">
            Clear chat
          </button>
        ) : (
          <span className="text-xs text-ink-faint font-mono">manual · not live</span>
        )}
      </div>
      <p className="text-sm text-ink-soft mb-4">
        Ask a plain-language question about your monitors, checks, or incidents.
      </p>

      {turns.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="text-xs text-ink-soft border border-line rounded-full px-3 py-1.5 hover:border-signal hover:text-signal transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {turns.length > 0 && (
        <div className="space-y-5 mb-4 max-h-[560px] overflow-y-auto pr-1">
          {turns.map((t, i) => (
            <Turn key={t.id} turn={t} onRetry={retry} onFollowUp={followUps} isLast={i === turns.length - 1 && !busy} />
          ))}
          <div ref={endRef} />
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          ask()
        }}
        className="flex gap-2"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. which monitor is least reliable?"
          maxLength={300}
          className="flex-1 border border-line rounded px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-signal transition-colors"
        />
        <button
          type="submit"
          disabled={busy || !question.trim()}
          className="bg-signal text-paper text-sm font-semibold px-4 rounded hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {busy ? 'Thinking…' : 'Ask'}
        </button>
      </form>
    </div>
  )
}
