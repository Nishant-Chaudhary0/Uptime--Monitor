import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { userEmail } from '../controllers/authController.js';
dotenv.config();

// Create the transporter once, reused across all send calls
// (creating a new connection per email would be slow and wasteful)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: userEmail,
    pass: process.env.EMAIL_PASS,
  },
});

// ALERT_EMAIL_TO is optional now - if set, it's bcc'd on every alert so an
// admin/ops inbox can keep visibility across all users' monitors.
const adminBcc = process.env.ALERT_EMAIL_TO || undefined;

async function sendDownEmail(monitorName, url, recipientEmail) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !recipientEmail) return;

  try {
    await transporter.sendMail({
      from: `"Uptime Monitor" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      bcc: adminBcc,
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

async function sendResolvedEmail(monitorName, durationMinutes, aiSummary, recipientEmail) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !recipientEmail) return;

  try {
    await transporter.sendMail({
      from: `"Uptime Monitor" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      bcc: adminBcc,
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

export { sendDownEmail, sendResolvedEmail };
