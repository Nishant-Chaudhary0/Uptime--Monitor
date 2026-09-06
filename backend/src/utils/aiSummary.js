import dotenv from 'dotenv';
dotenv.config();

const GEMINI_MODEL = 'gemini-2.5-flash-lite'; // free-tier model, generous limits
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function generateIncidentSummary({ monitorName, startedAt, durationMinutes, checks }) {
  const statusCodes = checks
    .map((c) => c.status_code ?? 'no response')
    .join(', ');

  const prompt = `Summarize this server outage in 2-3 sentences for a non-technical manager.
Monitor name: ${monitorName}
Started: ${startedAt.toISOString()}
Duration: ${durationMinutes} minutes
Status codes observed during outage: ${statusCodes}

Keep it plain, factual, and free of jargon.`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
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