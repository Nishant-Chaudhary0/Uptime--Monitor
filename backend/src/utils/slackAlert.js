import dotenv from'dotenv'
dotenv.config();

async function sendSlackAlert(monitorName, url) {
  if (!process.env.SLACK_WEBHOOK_URL) return;

  try {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🔴 *${monitorName}* is DOWN\n${url}\n${new Date().toLocaleString()}`,
      }),
    });
  } catch (err) {
    console.error('Failed to send Slack alert:', err.message);
  }
}

async function sendResolvedAlert(monitorName, durationMinutes) {
  if (!process.env.SLACK_WEBHOOK_URL) return;

  try {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `✅ *${monitorName}* is back UP (was down for ${durationMinutes} min)`,
      }),
    });
  } catch (err) {
    console.error('Failed to send resolved alert:', err.message);
  }
}

export {sendSlackAlert, sendResolvedAlert};