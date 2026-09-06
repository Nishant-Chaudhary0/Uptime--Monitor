import dotenv from 'dotenv'
import nodemailer from 'nodemailer';

// Create the transporter once, reused across all send calls
// (creating a new connection per email would be slow and wasteful)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendDownEmail(monitorName, url) {
  if (!process.env.EMAIL_USER || !process.env.ALERT_EMAIL_TO) return;

  try {
    await transporter.sendMail({
      from: `"apiHealth Monitor" <${process.env.EMAIL_USER}>`,
      to: process.env.ALERT_EMAIL_TO,
      subject: `🔴 ${monitorName} is DOWN`,
      html: `
        <h2 style="color:#d92d20;">${monitorName} is currently DOWN</h2>
        <p><strong>URL:</strong> ${url}</p>
        <p><strong>Detected at:</strong> ${new Date().toLocaleString()}</p>
        <p>Check your dashboard for more details.</p>
      `,
    });
  } catch (err) {
    console.error('Failed to send down email:', err.message);
  }
}

async function sendResolvedEmail(monitorName, durationMinutes, aiSummary) {
  if (!process.env.EMAIL_USER || !process.env.ALERT_EMAIL_TO) return;

  try {
    await transporter.sendMail({
      from: `"Uptime Monitor" <${process.env.EMAIL_USER}>`,
      to: process.env.ALERT_EMAIL_TO,
      subject: `✅ ${monitorName} is back UP`,
      html: `
        <h2 style="color:#12b76a;">${monitorName} has recovered</h2>
        <p><strong>Downtime duration:</strong> ${durationMinutes} minutes</p>
        ${aiSummary ? `<p><strong>Summary:</strong> ${aiSummary}</p>` : ''}
        <p><strong>Resolved at:</strong> ${new Date().toLocaleString()}</p>
      `,
    });
  } catch (err) {
    console.error('Failed to send resolved email:', err.message);
  }
}

module.exports = { sendDownEmail, sendResolvedEmail };