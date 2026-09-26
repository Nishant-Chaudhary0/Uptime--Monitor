import { useState } from 'react'
import { aiApi } from '../api/client'

const SUGGESTIONS = [
  'Which monitor had the most downtime this week?',
  'What is my average response time across all monitors?',
  'How many incidents happened in the last 7 days?',
]

// Deliberately un-clever: this only ever calls the AI endpoint when the
// person presses "Ask", never on keystroke, mount, or an interval. The
// backend's /ai/ask route calls Gemini twice per question (once to write
// SQL, once to summarize), so avoiding accidental repeat calls matters
// on a free-tier quota.
export default function AskAi() {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [showSql, setShowSql] = useState(false)

  async function ask(q) {
    const text = (q ?? question).trim()
    if (!text || loading) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await aiApi.ask(text)
      setResult(res)
      setQuestion(text)
    } catch (err) {
      setError(
        err?.response?.data?.error?.formErrors?.[0] ||
          err?.response?.data?.error ||
          'Could not answer that question right now.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-line bg-surface rounded p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-ink">Ask your data</h3>
        <span className="text-xs text-ink-faint font-mono">manual · not live</span>
      </div>
      <p className="text-sm text-ink-soft mb-4">
        Ask a plain-language question about your monitors, checks, or incidents.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          ask()
        }}
        className="flex gap-2 mb-3"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. which monitor is least reliable?"
          className="flex-1 border border-line rounded px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-signal transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="bg-ink text-paper text-sm font-medium px-4 rounded hover:bg-signal transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {loading ? 'Thinking…' : 'Ask'}
        </button>
      </form>

      {!result && !loading && (
        <div className="flex flex-wrap gap-2">
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

      {error && (
        <div className="text-sm text-down bg-down-soft border border-down/20 rounded px-3 py-2 mt-3">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="text-ink leading-relaxed mb-3">{result.answer}</p>

          {Array.isArray(result.data) && result.data.length > 0 && (
            <div className="overflow-x-auto border border-line rounded mb-3">
              <table className="w-full text-xs font-mono">
                <thead className="bg-paper text-ink-soft">
                  <tr>
                    {Object.keys(result.data[0]).map((k) => (
                      <th key={k} className="text-left px-3 py-2 font-medium whitespace-nowrap">
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.data.slice(0, 20).map((row, i) => (
                    <tr key={i} className="border-t border-line">
                      {Object.values(row).map((v, j) => (
                        <td key={j} className="px-3 py-2 whitespace-nowrap tabular">
                          {String(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.generated_sql && (
            <button
              onClick={() => setShowSql((v) => !v)}
              className="text-xs text-ink-faint hover:text-ink-soft underline underline-offset-2"
            >
              {showSql ? 'Hide' : 'Show'} generated query
            </button>
          )}
          {showSql && (
            <pre className="mt-2 bg-ink text-paper/80 text-xs font-mono rounded p-3 overflow-x-auto whitespace-pre-wrap">
              {result.generated_sql}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
