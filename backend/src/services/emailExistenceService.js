import dns from 'dns/promises';
import net from 'net';
import { env } from '../config/env.js';

const EMAIL_CACHE_TTL_MS = 10 * 60 * 1000;
const emailCache = new Map();

const RESERVED_TEST_DOMAINS = new Set([
  'example.com',
  'example.org',
  'example.net',
  'invalid',
  'localhost',
  'test',
  'local'
]);

function parseEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  const atIndex = normalized.lastIndexOf('@');
  if (atIndex <= 0 || atIndex === normalized.length - 1) return null;
  return {
    normalized,
    localPart: normalized.slice(0, atIndex),
    domain: normalized.slice(atIndex + 1)
  };
}

function getCached(email) {
  const key = email.toLowerCase();
  const cached = emailCache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    emailCache.delete(key);
    return null;
  }
  return cached.value;
}

function setCached(email, value) {
  emailCache.set(email.toLowerCase(), {
    value,
    expiresAt: Date.now() + EMAIL_CACHE_TTL_MS
  });
}

async function resolveMailHosts(domain) {
  try {
    const mx = await dns.resolveMx(domain);
    if (!mx.length) return [];
    return mx
      .filter((item) => item?.exchange)
      .sort((a, b) => a.priority - b.priority)
      .map((item) => item.exchange);
  } catch {
    return [];
  }
}

function createSocket(host) {
  return net.createConnection({
    host,
    port: 25,
    timeout: env.emailSmtpProbeTimeoutMs
  });
}

function waitForResponse(socket) {
  return new Promise((resolve, reject) => {
    let buffer = '';

    const cleanup = () => {
      socket.off('data', onData);
      socket.off('error', onError);
      socket.off('timeout', onTimeout);
      socket.off('close', onClose);
    };

    const onError = (error) => {
      cleanup();
      reject(error);
    };

    const onTimeout = () => {
      cleanup();
      reject(new Error('SMTP timeout'));
    };

    const onClose = () => {
      cleanup();
      reject(new Error('SMTP socket closed'));
    };

    const onData = (chunk) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';

      for (const line of lines) {
        const match = line.match(/^(\d{3})([ -])(.*)$/);
        if (!match) continue;
        const code = Number(match[1]);
        const isFinal = match[2] === ' ';
        if (isFinal) {
          cleanup();
          resolve({ code, line });
          return;
        }
      }
    };

    socket.on('data', onData);
    socket.on('error', onError);
    socket.on('timeout', onTimeout);
    socket.on('close', onClose);
  });
}

async function sendCommand(socket, command) {
  socket.write(`${command}\r\n`);
  return waitForResponse(socket);
}

async function smtpProbeMailbox(host, email) {
  const socket = createSocket(host);
  let greetingRead = false;
  try {
    const greeting = await waitForResponse(socket);
    greetingRead = true;
    if (greeting.code >= 400) {
      return { status: 'unknown', code: greeting.code, reason: 'smtp-greeting-failed' };
    }

    const helo = await sendCommand(socket, `EHLO ${env.emailHeloDomain}`);
    if (helo.code >= 400) {
      return { status: 'unknown', code: helo.code, reason: 'smtp-ehlo-failed' };
    }

    const mailFrom = await sendCommand(socket, `MAIL FROM:<${env.emailProbeFrom}>`);
    if (mailFrom.code >= 400) {
      return { status: 'unknown', code: mailFrom.code, reason: 'smtp-mail-from-failed' };
    }

    const rcpt = await sendCommand(socket, `RCPT TO:<${email}>`);
    if (rcpt.code === 250 || rcpt.code === 251) {
      return { status: 'valid', code: rcpt.code, reason: 'smtp-accepted' };
    }

    if ([550, 551, 553].includes(rcpt.code)) {
      return { status: 'invalid', code: rcpt.code, reason: 'smtp-recipient-rejected' };
    }

    return { status: 'unknown', code: rcpt.code, reason: 'smtp-indeterminate' };
  } catch {
    return { status: 'unknown', reason: greetingRead ? 'smtp-command-error' : 'smtp-connect-error' };
  } finally {
    try {
      socket.write('QUIT\r\n');
    } catch {
      // no-op
    }
    socket.destroy();
  }
}

export async function verifyEmailExists(email) {
  const parsed = parseEmail(email);
  if (!parsed) {
    return { ok: false, reason: 'invalid-format', message: 'Enter a valid email address.' };
  }

  if (process.env.NODE_ENV === 'test') {
    return { ok: true, reason: 'test-bypass', message: null };
  }

  if (env.emailCheckMode === 'off') {
    return { ok: true, reason: 'check-disabled', message: null };
  }

  if (!env.skipMxValidation && RESERVED_TEST_DOMAINS.has(parsed.domain)) {
    return { ok: false, reason: 'reserved-domain', message: 'Please use a real email address.' };
  }

  const cached = getCached(parsed.normalized);
  if (cached) return cached;

  const mailHosts = await resolveMailHosts(parsed.domain);
  if (!mailHosts.length) {
    if (env.skipMxValidation) {
      const result = { ok: true, reason: 'mx-skipped', message: null };
      setCached(parsed.normalized, result);
      return result;
    } else {
      const result = {
        ok: false,
        reason: 'missing-mx',
        message: 'This email domain cannot receive mail. Please use a real email address.'
      };
      setCached(parsed.normalized, result);
      return result;
    }
  }

  if (env.emailCheckMode === 'mx') {
    const result = { ok: true, reason: 'mx-ok', message: null };
    setCached(parsed.normalized, result);
    return result;
  }

  const hostsToTry = mailHosts.slice(0, env.emailSmtpProbeMaxHosts);
  let sawUnknown = false;

  for (const host of hostsToTry) {
    const probe = await smtpProbeMailbox(host, parsed.normalized);
    if (probe.status === 'valid') {
      const result = { ok: true, reason: 'smtp-ok', message: null };
      setCached(parsed.normalized, result);
      return result;
    }
    if (probe.status === 'invalid') {
      const result = {
        ok: false,
        reason: 'smtp-rejected',
        message: 'This inbox could not be verified. Check the email and try again.'
      };
      setCached(parsed.normalized, result);
      return result;
    }
    sawUnknown = true;
  }

  const result = env.emailAllowUnknownSmtp
    ? { ok: true, reason: 'smtp-unknown-allowed', message: null }
    : {
        ok: false,
        reason: sawUnknown ? 'smtp-unknown' : 'smtp-failed',
        message: 'We could not verify this inbox right now. Please use another email or try again later.'
      };
  setCached(parsed.normalized, result);
  return result;
}
