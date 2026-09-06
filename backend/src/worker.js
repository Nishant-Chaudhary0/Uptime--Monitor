
import cron from 'node-cron';
import { prisma } from './config/db.js';
import { sendSlackAlert, sendResolvedAlert } from './utils/slackAlert.js';
import generateIncidentSummary from './utils/aiSummary.js';

const CHECK_TIMEOUT_MS = 10000;
const CRON_SCHEDULE = '* * * * *';
     
async function checkUrl(url) {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    return {
      status_code: res.status,
      response_time_ms: Date.now() - start,
      is_up: res.status >= 200 && res.status < 400,
    };
  } catch (err) {
    clearTimeout(timeout);
    return { status_code: null, response_time_ms: null, is_up: false };
  }
}

async function saveCheckAndDetectIncident(monitor, result) {
  await prisma.check.create({
    data: {
      monitor_id: monitor.id,
      status_code: result.status_code,
      response_time_ms: result.response_time_ms,
      is_up: result.is_up,
    },
  });

  const previousCheck = await prisma.check.findFirst({
    where: { monitor_id: monitor.id },
    orderBy: { checked_at: 'desc' },
    skip: 1,
  });

  const wasUp = previousCheck ? previousCheck.is_up : true;
  const isUpNow = result.is_up;

  if (wasUp && !isUpNow) {
    await prisma.incident.create({
      data: { monitor_id: monitor.id, started_at: new Date() },
    });
    await sendSlackAlert(monitor.name, monitor.url);
  }

  if (!wasUp && isUpNow) {
    const openIncident = await prisma.incident.findFirst({
      where: { monitor_id: monitor.id, resolved_at: null },
      orderBy: { started_at: 'desc' },
    });

    if (openIncident) {
      const resolvedAt = new Date();
      const durationMinutes = Math.round(
        (resolvedAt - openIncident.started_at) / 60000
      );

      const checksDuringIncident = await prisma.check.findMany({
        where: {
          monitor_id: monitor.id,
          checked_at: { gte: openIncident.started_at, lte: resolvedAt },
        },
      });

      const aiSummary = await generateIncidentSummary({
        monitorName: monitor.name,
        startedAt: openIncident.started_at,
        durationMinutes,
        checks: checksDuringIncident,
      });

      await prisma.incident.update({
        where: { id: openIncident.id },
        data: {
          resolved_at: resolvedAt,
          duration_minutes: durationMinutes,
          ai_summary: aiSummary,
        },
      });

      await sendResolvedAlert(monitor.name, durationMinutes);
    }
  }
}

async function processMonitor(monitor) {
  try {
    const result = await checkUrl(monitor.url);
    await saveCheckAndDetectIncident(monitor, result);
  } catch (err) {
    console.error(`Error processing monitor ${monitor.name}:`, err.message);
  }
}

async function runCheckCycle() {
  console.log(`[${new Date().toISOString()}] Starting check cycle...`);
  const monitors = await prisma.monitor.findMany();
  await Promise.all(monitors.map((monitor) => processMonitor(monitor)));
  console.log(`[${new Date().toISOString()}] Check cycle complete. Checked ${monitors.length} monitors.`);
}

cron.schedule(CRON_SCHEDULE, runCheckCycle);

console.log('Worker started. Checking every minutes.');
runCheckCycle();