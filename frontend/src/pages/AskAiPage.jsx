import AskAi from '../components/AskAi'

export default function AskAiPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink">Ask AI</h1>
        <p className="text-ink-soft mt-1">Ask questions about your monitors, checks and incidents.</p>
      </div>
      <AskAi />
    </div>
  )
}
