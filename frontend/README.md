# Pulseboard

A React frontend for your uptime-monitoring API — sign in, add monitors,
and watch an overview dashboard plus a per-monitor detail view with
heartbeats, uptime %, response-time trends, and incidents.

## Setup

```bash
npm install
cp .env.example .env
# edit .env and point VITE_API_URL at your backend, e.g.
# VITE_API_URL=http://localhost:4000/api/v1
npm run dev
```

The app expects your backend's existing routes exactly as they are:
`/auth/register`, `/auth/login`, `/auth/me`, `/monitor/*`, `/check/*`,
`/incident/*`, `/ai/ask` — all under the `VITE_API_URL` base. No backend
changes are required.

## Notes on quota / cost

- The "Ask your data" panel only calls `/ai/ask` (your Gemini-backed
  endpoint) when you explicitly press **Ask** or tap a suggestion — never
  on keystroke, page load, or a timer. Each question costs two Gemini
  calls server-side (SQL generation + summarizing), so this keeps you
  well inside a free-tier quota.
- Monitor and check data refresh from your own database every 45s (cheap
  reads, no external API involved) so the dashboard feels live without
  hammering anything paid.

## Structure

```
src/
  api/client.js        axios instance + one function per endpoint
  context/AuthContext   token/session handling, verifies via /auth/me
  components/           AppShell, AuthLayout, HeartbeatBar, StatCard,
                         StatusPill, AddMonitorModal, AskAi
  pages/                Login, Register, Dashboard, MonitorDetail
```

## Build

```bash
npm run build
```

Outputs a static `dist/` you can deploy anywhere (Vercel, Netlify, etc).
