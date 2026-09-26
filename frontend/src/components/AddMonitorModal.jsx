import { useState } from 'react'
import { monitorApi } from '../api/client'

const INTERVALS = [
  { label: 'Every minute', value: 1 },
  { label: 'Every 5 minutes', value: 5 },
  { label: 'Every 15 minutes', value: 15 },
  { label: 'Every 30 minutes', value: 30 },
  { label: 'Every hour', value: 60 },
]

export default function AddMonitorModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [interval, setInterval] = useState(5)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    let normalizedUrl = url.trim()
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`
    }

    setLoading(true)
    try {
      const monitor = await monitorApi.create({
        name: name.trim(),
        url: normalizedUrl,
        check_intervel_minutes: interval,
      })
      onCreated(monitor)
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not create the monitor. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-line rounded-md w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-ink mb-1">Add a monitor</h2>
        <p className="text-sm text-ink-soft mb-6">
          We'll start checking this URL on the interval you choose.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-ink-soft">Name</span>
            <input
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Marketing site"
              className="mt-1.5 w-full border border-line bg-surface rounded px-3 py-2.5 text-ink placeholder:text-ink-faint focus:border-signal transition-colors"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-ink-soft">URL</span>
            <input
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="example.com"
              className="mt-1.5 w-full border border-line bg-surface rounded px-3 py-2.5 font-mono text-sm text-ink placeholder:text-ink-faint focus:border-signal transition-colors"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-ink-soft">Check interval</span>
            <select
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
              className="mt-1.5 w-full border border-line bg-surface rounded px-3 py-2.5 text-ink focus:border-signal transition-colors"
            >
              {INTERVALS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          {error && (
            <div className="text-sm text-down bg-down-soft border border-down/20 rounded px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-line rounded py-2.5 text-sm font-medium text-ink-soft hover:text-ink hover:border-line-strong transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-ink text-paper rounded py-2.5 text-sm font-medium hover:bg-signal transition-colors disabled:opacity-50"
            >
              {loading ? 'Adding…' : 'Add monitor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
