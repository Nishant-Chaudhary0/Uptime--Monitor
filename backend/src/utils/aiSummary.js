import dotenv from 'dotenv';
dotenv.config();

const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function generateIncidentSummary({ monitorName, startedAt, durationMinutes, checks }) {
  // Build a more informative breakdown instead of a flat list
  const statusCounts = {};
  checks.forEach((c) => {
    const key = c.status_code ?? 'timeout/no response';
    statusCounts[key] = (statusCounts[key] || 0) + 1;
  });
  const statusBreakdown = Object.entries(statusCounts)
    .map(([code, count]) => `${code} (${count}x)`)
    .join(', ');

  // Response time context — was it a hard crash or gradual degradation?
  const responseTimes = checks
    .map((c) => c.response_time_ms)
    .filter((t) => t !== null);
  const avgResponseTime = responseTimes.length
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : null;

  const dayOfWeek = startedAt.toLocaleDateString('en-US', { weekday: 'long' });
  const timeOfDay = startedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const prompt = `You are writing an incident summary for an engineering manager who was not present during the outage. Be specific and useful — do NOT write generic phrases like "we are investigating" or "brief disruption" without adding real detail.

DATA:
- Monitor: ${monitorName}
- Day/time started: ${dayOfWeek} at ${timeOfDay}
- Duration: ${durationMinutes} minute(s)
- Total checks during incident: ${checks.length}
- Status code breakdown: ${statusBreakdown}
- Average response time during incident: ${avgResponseTime !== null ? `${avgResponseTime}ms` : 'no successful responses recorded'}

INSTRUCTIONS:
Write a 2-3 sentence summary that:
1. States what specifically happened based on the status codes (e.g., "returned 500 errors" vs "was completely unreachable" vs "timed out" — pick based on the actual data, don't guess)
2. Notes whether this looks like a sudden hard failure (all-timeout/all-500) or a partial/intermittent issue (mixed status codes)
3. Mentions the day/time if it's during a notable window (e.g., peak hours, weekend, early morning) since that's relevant context for a manager
4. Does NOT include vague filler like "we are investigating" or "brief disruption" — if there's nothing more to say about cause, just state the observed facts plainly instead of padding with a fake next-step

Write only the summary, no preamble.`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3, // lower = more grounded/factual, less "creative" filler
        },
      }),
    });

    if (!res.ok) {
      console.error('Gemini API error:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return summary ? summary.trim() : null;
  } catch (err) {
    console.error('Failed to generate AI summary:', err.message);
    return null;
  }
}

export default generateIncidentSummary;