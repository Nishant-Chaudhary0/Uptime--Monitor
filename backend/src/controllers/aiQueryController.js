import { prisma } from '../config/db.js';
import { askQuestionSchema } from '../utils/schemaValidation.js';
import { callGemini } from '../utils/geminiClient.js';


const SCHEMA_CONTEXT = `
You can query these PostgreSQL tables:

"Monitor" (id, name, url, check_interval_minutes, created_at)
"Check" (id, monitor_id, status_code, response_time_ms, is_up, checked_at)
"Incident" (id, monitor_id, started_at, resolved_at, duration_minutes, ai_summary)

Relationships: "Check".monitor_id and "Incident".monitor_id both reference "Monitor".id

Rules:
- Only generate a single SELECT statement.
- Never generate INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, or any statement that modifies data.
- Always quote table names exactly as shown above, e.g. "Monitor", "Check", "Incident".
- Always add a LIMIT clause (max 100 rows) unless the question asks for a single aggregate value.
- Return ONLY the raw SQL query. No explanation, no markdown code fences, no preamble.
`;


const FORBIDDEN_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER',
  'TRUNCATE', 'GRANT', 'REVOKE', 'CREATE', 'EXEC',
];

function isSafeSelectQuery(sql) {
  const trimmed = sql.trim().toUpperCase();

  if (!trimmed.startsWith('SELECT')) {
    return false;
  }

  if (FORBIDDEN_KEYWORDS.some((keyword) => trimmed.includes(keyword))) {
    return false;
  }

  const statementCount = sql.split(';').filter((s) => s.trim().length > 0).length;
  if (statementCount > 1) {
    return false;
  }

  return true;
}


function sanitizeBigInts(value) {
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeBigInts);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, sanitizeBigInts(val)])
    );
  }
  return value;
}

function stripMarkdownFences(text) {
  return text.replace(/```sql/gi, '').replace(/```/g, '').trim();
}

export const askQuestion = async (req, res) => {
  const result = askQuestionSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }

  const { question } = result.data;

  try {
    const sqlPrompt = `${SCHEMA_CONTEXT}\n\nQuestion: "${question}"\n\nSQL query:`;
    const rawSql = await callGemini(sqlPrompt, { temperature: 0.1 });
    const sql = stripMarkdownFences(rawSql);

    if (!isSafeSelectQuery(sql)) {
      return res.status(400).json({
        error: 'Generated query failed safety validation',
        generated_sql: sql,
      });
    }

    let rows;
    try {
      const rawRows = await prisma.$queryRawUnsafe(sql);
      rows = sanitizeBigInts(rawRows);
    } catch (dbErr) {
      console.error('Generated SQL failed to execute:', dbErr.message);
      return res.status(400).json({
        error: 'Could not execute the generated query',
        generated_sql: sql,
      });
    }

    const explainPrompt = `Question: "${question}"
Data returned: ${JSON.stringify(rows, null, 2)}

Answer the question in 1-2 clear sentences using only this data. If the data is empty, say so plainly instead of guessing.`;

    const answer = await callGemini(explainPrompt, { temperature: 0.3 });

    res.json({
      question,
      answer,
      generated_sql: sql,
      data: rows,
    });
  } catch (err) {
    console.error('Error in askQuestion:', err.message);
    res.status(500).json({ error: 'Failed to process your question' });
  }
};