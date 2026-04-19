import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/* ── Resend client (used when RESEND_API_KEY is set) ──────────────── */
let resendClient = null;
function getResendClient() {
  if (!resendClient) resendClient = new Resend(env.resendApiKey);
  return resendClient;
}

/* ── Nodemailer fallback (Ethereal test account) ──────────────────── */
let cachedTransporter = null;
let cachedFrom        = env.smtpFrom;
let warnedAboutTestMode = false;

async function getEtherealTransporter() {
  if (cachedTransporter) return cachedTransporter;

  if (env.smtpHost && env.smtpPort && env.smtpUser && env.smtpPass) {
    cachedTransporter = nodemailer.createTransport({
      host:   env.smtpHost,
      port:   env.smtpPort,
      secure: env.smtpPort === 465,
      auth:   { user: env.smtpUser, pass: env.smtpPass }
    });
    await cachedTransporter.verify();
    return cachedTransporter;
  }

  const testAccount = await nodemailer.createTestAccount();
  cachedTransporter = nodemailer.createTransport({
    host:   testAccount.smtp.host,
    port:   testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth:   { user: testAccount.user, pass: testAccount.pass }
  });
  cachedFrom = `Gametime <${testAccount.user}>`;
  if (!warnedAboutTestMode) {
    warnedAboutTestMode = true;
    logger.warn('[email] No RESEND_API_KEY or SMTP configured - using Ethereal test inbox (no real email delivery). Add RESEND_API_KEY to backend/.env to enable real delivery.');
  }
  return cachedTransporter;
}

/* ── Unified send helper ──────────────────────────────────────────── */
async function send({ to, subject, html, text }) {
  if (process.env.NODE_ENV === 'test') {
    return { previewUrl: null, deliveryMode: 'test' };
  }

  // Resend path
  if (env.resendApiKey) {
    const client = getResendClient();
    const from   = env.smtpFrom || 'Gametime <onboarding@resend.dev>';
    await client.emails.send({ from, to, subject, html, text });
    return { previewUrl: null, deliveryMode: 'resend' };
  }

  // Nodemailer / Ethereal fallback
  const transporter = await getEtherealTransporter();
  const result = await transporter.sendMail({
    from: cachedFrom,
    to,
    subject,
    text,
    html
  });
  const previewUrl = nodemailer.getTestMessageUrl(result) || null;
  if (previewUrl) logger.info({ previewUrl }, '[email] Ethereal preview');
  const deliveryMode = (env.smtpHost && env.smtpPort) ? 'smtp' : 'test';
  return { previewUrl, deliveryMode };
}

/* ── Public email functions ───────────────────────────────────────── */

export async function sendPasswordResetEmail(to, name, resetUrl) {
  return send({
    to,
    subject: 'Reset your Gametime password',
    text: `Hi ${name},\n\nWe received a request to reset your Gametime password. Click the link below to set a new one (valid for 1 hour):\n\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.\n\nThe Gametime Team`,
    html: `<p>Hi ${name},</p><p>We received a request to reset your Gametime password. Click the button below to set a new one (valid for 1 hour).</p><p><a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#3B5BDB;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Reset Password</a></p><p>Or copy this link:<br><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, you can safely ignore this email.</p><p>The Gametime Team</p>`
  });
}

export async function sendWeeklyDigestEmail(to, parentName, data) {
  const { children = [], totalTasksApproved = 0, totalRpEarned = 0, weekOf } = data;

  const childRows = children.map((c) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-weight:600">${c.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:center">${c.tasksApproved}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:center;color:#3B5BDB;font-weight:700">+${c.rpEarned} RP</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:center">${c.streak > 0 ? `${c.streak}d streak` : '-'}</td>
    </tr>`).join('');

  const html = `
    <div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#111827">
      <div style="background:linear-gradient(135deg,#3B5BDB,#7C3AED);padding:24px 28px;border-radius:16px 16px 0 0">
        <h1 style="color:#fff;margin:0;font-size:22px">Your Gametime Weekly Digest</h1>
        <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px">Week of ${weekOf}</p>
      </div>
      <div style="background:#fff;padding:24px 28px;border:1px solid #e5e7eb;border-top:none">
        <p>Hi ${parentName},</p>
        <p>Here's how your family did this week:</p>

        <div style="display:flex;gap:12px;margin:20px 0">
          <div style="flex:1;background:#eff6ff;border-radius:12px;padding:16px;text-align:center">
            <div style="font-size:28px;font-weight:800;color:#3B5BDB">${totalTasksApproved}</div>
            <div style="font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Tasks completed</div>
          </div>
          <div style="flex:1;background:#f5f3ff;border-radius:12px;padding:16px;text-align:center">
            <div style="font-size:28px;font-weight:800;color:#7C3AED">${totalRpEarned}</div>
            <div style="font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.5px">RP earned</div>
          </div>
        </div>

        ${children.length > 0 ? `
        <h3 style="font-size:14px;font-weight:700;color:#374151;margin:20px 0 8px">Child breakdown</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead>
            <tr style="background:#f9fafb">
              <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.4px">Child</th>
              <th style="padding:8px 12px;text-align:center;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.4px">Tasks</th>
              <th style="padding:8px 12px;text-align:center;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.4px">RP</th>
              <th style="padding:8px 12px;text-align:center;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.4px">Streak</th>
            </tr>
          </thead>
          <tbody>${childRows}</tbody>
        </table>` : '<p style="color:#6b7280">No activity this week. Set some tasks to get started!</p>'}

        <p style="margin-top:24px"><a href="${env.frontendOrigins[0] || 'http://localhost:5173'}/parent/ai"
          style="display:inline-block;padding:10px 24px;background:#3B5BDB;color:#fff;text-decoration:none;border-radius:999px;font-weight:700;font-size:14px">
          Open Gametime
        </a></p>
      </div>
      <div style="padding:16px 28px;text-align:center">
        <p style="font-size:12px;color:#9ca3af;margin:0">
          You're receiving this because you enabled weekly reports in Gametime Settings.<br>
          &copy; Gametime &middot; Singapore
        </p>
      </div>
    </div>`;

  return send({
    to,
    subject: `Gametime Weekly Digest - week of ${weekOf}`,
    text:    `Hi ${parentName},\n\nHere's your weekly family summary:\n- Tasks completed: ${totalTasksApproved}\n- RP earned: ${totalRpEarned}\n\nOpen Gametime to see more details.\n\nThe Gametime Team`,
    html
  });
}

export async function sendWelcomeEmail(to, name) {
  return send({
    to,
    subject: 'Welcome to Gametime!',
    text: `Hi ${name},\n\nWelcome to Gametime! You're all set to start managing your family's gaming time fairly.\n\nHere's how to get started:\n1. Add your children in the Children tab\n2. Create tasks for them to complete\n3. Approve their evidence and watch them earn Reward Points\n\nIf you have any questions, just reply to this email.\n\nThe Gametime Team`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111827">
        <div style="background:linear-gradient(135deg,#3B5BDB,#7C3AED);padding:24px 28px;border-radius:16px 16px 0 0">
          <h1 style="color:#fff;margin:0;font-size:22px">Welcome to Gametime, ${name}!</h1>
        </div>
        <div style="background:#fff;padding:24px 28px;border:1px solid #e5e7eb;border-top:none">
          <p>You're all set to start managing your family's gaming time fairly.</p>
          <h3 style="font-size:16px">Get started in 3 steps:</h3>
          <ol>
            <li style="margin-bottom:8px"><strong>Add your children</strong> - set up their profiles and login method</li>
            <li style="margin-bottom:8px"><strong>Create tasks</strong> - chores, homework, anything you want them to earn points for</li>
            <li style="margin-bottom:8px"><strong>Approve evidence</strong> - review their photo/video proof and award points</li>
          </ol>
          <p style="margin-top:24px">If you have any questions, just reply to this email.</p>
          <p style="color:#6b7280;font-size:14px">The Gametime Team</p>
        </div>
      </div>
    `
  });
}
