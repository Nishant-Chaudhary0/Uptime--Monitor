import { prisma } from '../config/db.js';
import { askQuestionSchema } from '../utils/schemaValidation.js';
import { callGemini } from '../utils/geminiClient.js';


// The model is only ever told about these three user-scoped view names -
// never the real "Monitor" / "Check" / "Incident" tables - so it has no
// reason to (and is blocked from, see isSafeSelectQuery) reference tables
// that could contain another user's data.
const SCHEMA_CONTEXT = `
You can query these tables (they already only contain data belonging to the current user - do not attempt to filter by user yourself):

"user_monitors" (id, name, url, check_intervel_minutes, createdAt)
"user_checks" (id, monitor_id, status_code, response_time_ms, is_up, checked_at)
"user_incidents" (id, monitor_id, started_at, resolved_at, duration_minutes, ai_summary)

Relationships: "user_checks".monitor_id and "user_incidents".monitor_id both reference "user_monitors".id

Rules:
- Only generate a single SELECT statement.
- Only reference the tables "user_monitors", "user_checks", and "user_incidents" listed above. Never reference "Monitor", "Check", "Incident", or "User" directly, and never reference any other table.
- Never generate INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, or any statement that modifies data.
- Always quote table names exactly as shown above, e.g. "user_monitors", "user_checks", "user_incidents".
- Always add a LIMIT clause (max 100 rows) unless the question asks for a single aggregate value.
- Return ONLY the raw SQL query. No explanation, no markdown code fences, no preamble.
`;


const FORBIDDEN_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER',
  'TRUNCATE', 'GRANT', 'REVOKE', 'CREATE', 'EXEC',
];

// The model must only ever touch the user_* views defined in buildScopedQuery.
// These patterns catch any attempt (accidental or otherwise) to reference the
// real underlying tables or Postgres system catalogs directly, which would
// bypass the per-user scoping entirely.
const FORBIDDEN_TABLE_PATTERN = /\b(monitor|check|incident|user)\b/i;
const FORBIDDEN_SYSTEM_PATTERN = /\b(pg_\w*|information_schema)\b/i;

function isSafeSelectQuery(sql) {
  const trimmed = sql.trim().toUpperCase();

  if (!trimmed.startsWith('SELECT') && !trimmed.startsWith('WITH')) {
    return false;
  }

  if (FORBIDDEN_KEYWORDS.some((keyword) => trimmed.includes(keyword))) {
    return false;
  }

  if (FORBIDDEN_TABLE_PATTERN.test(sql) || FORBIDDEN_SYSTEM_PATTERN.test(sql)) {
    return false;
  }

  const statementCount = sql.split(';').filter((s) => s.trim().length > 0).length;
  if (statementCount > 1) {
    return false;
  }

  return true;
}

// Wraps the model-generated query in CTEs that scope the "user_monitors" /
// "user_checks" / "user_incidents" views down to rows owned by the
// requesting user. This is what actually enforces per-user access control -
// it does not depend on the model "behaving", only on it being unable to
// reference anything other than these three view names (enforced above).
function buildScopedQuery(generatedSql, userId) {
  const trimmed = generatedSql.trim().replace(/;\s*$/, '');

  const cteDefs = `user_monitors AS (
  SELECT * FROM "Monitor" WHERE user_id = ${Number(userId)}
),
user_checks AS (
  SELECT c.* FROM "Check" c INNER JOIN user_monitors m ON c.monitor_id = m.id
),
user_incidents AS (
  SELECT i.* FROM "Incident" i INNER JOIN user_monitors m ON i.monitor_id = m.id
)`;

  if (/^WITH\s/i.test(trimmed)) {
    // The model already produced its own WITH clause - merge ours in front of it.
    return `WITH ${cteDefs},\n${trimmed.replace(/^WITH\s+/i, '')}`;
  }

  return `WITH ${cteDefs}\n${trimmed}`;
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
  const userId = req.user.id;

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

    const scopedSql = buildScopedQuery(sql, userId);

    let rows;
    try {
      const rawRows = await prisma.$queryRawUnsafe(scopedSql);
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
