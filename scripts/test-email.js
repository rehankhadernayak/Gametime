/**
 * SMTP connectivity test.
 * Usage: node scripts/test-email.js <recipient@example.com>
 *
 * Reads SMTP settings from backend/.env and sends a test email.
 * Exits 0 on success, 1 on failure.
 */

import { createTransport } from 'nodemailer';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse backend/.env manually (no dotenv dep in scripts/)
const envPath = resolve(__dirname, '../backend/.env');
let envVars = {};
try {
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    envVars[key] = val;
  }
} catch {
  console.error(`Could not read ${envPath} — make sure you're running from the Gametime root.`);
  process.exit(1);
}

const host = envVars.SMTP_HOST;
const port = Number(envVars.SMTP_PORT || 0);
const user = envVars.SMTP_USER;
const pass = envVars.SMTP_PASS;
const from = envVars.SMTP_FROM || 'Gametime <no-reply@gametime.local>';
const to   = process.argv[2];

if (!to) {
  console.error('Usage: node scripts/test-email.js <recipient@example.com>');
  process.exit(1);
}

if (!host || !port || !user || !pass) {
  console.error('SMTP not fully configured in backend/.env');
  console.error(`  SMTP_HOST  = ${host || '(missing)'}`);
  console.error(`  SMTP_PORT  = ${port || '(missing)'}`);
  console.error(`  SMTP_USER  = ${user || '(missing)'}`);
  console.error(`  SMTP_PASS  = ${pass ? '***' : '(missing)'}`);
  process.exit(1);
}

console.log(`Connecting to ${host}:${port} as ${user} …`);

const transporter = createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user, pass }
});

try {
  await transporter.verify();
  console.log('✓ SMTP connection verified');
} catch (err) {
  console.error(`✗ Connection failed: ${err.message}`);
  process.exit(1);
}

try {
  const info = await transporter.sendMail({
    from,
    to,
    subject: 'Gametime — SMTP test',
    text: 'This is a test email from your Gametime backend. If you received this, SMTP is configured correctly.',
    html: '<p>This is a test email from your <strong>Gametime</strong> backend.</p><p>If you received this, SMTP is configured correctly. ✓</p>'
  });
  console.log(`✓ Email sent  →  Message-ID: ${info.messageId}`);
  console.log(`  To: ${to}`);
  console.log(`  From: ${from}`);
} catch (err) {
  console.error(`✗ Send failed: ${err.message}`);
  process.exit(1);
}
