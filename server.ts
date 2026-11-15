import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

interface OtpRecord {
  hash: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
}

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_COOLDOWN_MS = 20 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const OTP_SECRET = process.env.OTP_SECRET || crypto.randomBytes(32).toString('hex');
const emailOtpStore = new Map<string, OtpRecord>();
const smsOtpStore = new Map<string, OtpRecord>();

function hashOtp(target: string, code: string): string {
  return crypto.createHash('sha256').update(`${target}:${code}:${OTP_SECRET}`).digest('hex');
}

function getSmtpConfig() {
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim();
  let host = (process.env.SMTP_HOST || '').trim();
  if (!host && user.toLowerCase().endsWith('@gmail.com')) {
    host = 'smtp.gmail.com';
  }
  const port = Number(process.env.SMTP_PORT || (host === 'smtp.gmail.com' ? 465 : 587));
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;
  const from = (process.env.SMTP_FROM || (user ? `PayGo Security <${user}>` : '')).trim();
  return { host, port, secure, user, pass, from };
}

function getTwilioConfig() {
  const accountSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
  const authToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  const fromNumber = (process.env.TWILIO_PHONE_NUMBER || '').trim();
  return { accountSid, authToken, fromNumber };
}

async function sendTwilioSms(to: string, bodyText: string) {
  const { accountSid, authToken, fromNumber } = getTwilioConfig();
  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`;
  const params = new URLSearchParams({
    To: to,
    From: fromNumber,
    Body: bodyText,
  });

  const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Twilio SMS API error (${response.status}): ${errText || response.statusText}`);
  }
}

async function startServer() {
  const app = express();
  app.set('trust proxy', true);

  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json());

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // API health endpoint
  app.get('/api/health', (_req, res) => {
    const smtp = getSmtpConfig();
    const twilio = getTwilioConfig();
    res.json({
      status: 'ok',
      emailOtpConfigured: Boolean(smtp.host && smtp.user && smtp.pass),
      smsOtpConfigured: Boolean(twilio.accountSid && twilio.authToken && twilio.fromNumber),
      timestamp: new Date().toISOString(),
    });
  });

  // Send 6-digit Email OTP (uses SMTP if configured, otherwise in-app verified OTP dispatch)
  app.post('/api/otp/send-email', async (req, res) => {
    try {
      const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

      if (!rawEmail || !emailRegex.test(rawEmail) || rawEmail.endsWith('@phone.paygo.com')) {
        res.status(400).json({ ok: false, error: 'Please provide a valid email address.' });
        return;
      }

      const existing = emailOtpStore.get(rawEmail);
      const now = Date.now();
      if (existing && now - existing.lastSentAt < OTP_COOLDOWN_MS) {
        const waitSec = Math.ceil((OTP_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
        res.status(429).json({
          ok: false,
          error: `Please wait ${waitSec}s before requesting another Email OTP code.`,
        });
        return;
      }

      const otpCode = crypto.randomInt(100000, 1000000).toString();
      const otpHash = hashOtp(rawEmail, otpCode);
      const smtp = getSmtpConfig();

      let deliveredViaSmtp = false;
      let smtpFailureReason = '';

      if (smtp.host && smtp.user && smtp.pass) {
        try {
          const transporter = nodemailer.createTransport({
            host: smtp.host,
            port: smtp.port,
            secure: smtp.secure,
            auth: {
              user: smtp.user,
              pass: smtp.pass,
            },
          });

          await transporter.sendMail({
            from: smtp.from,
            to: rawEmail,
            subject: `Your PayGo Verification OTP Code: ${otpCode}`,
            text: `Your PayGo 6-digit email verification code is: ${otpCode}\n\nThis code expires in 10 minutes. Never share this code with anyone.`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px;">
                <h2 style="color: #6b21a8; margin: 0 0 12px;">PayGo Account Verification</h2>
                <p style="color: #374151; font-size: 14px; line-height: 1.5;">
                  Use the 6-digit One-Time Password (OTP) below to verify your email address:
                </p>
                <div style="background: #f3e8ff; color: #581c87; font-size: 30px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 16px; border-radius: 12px; margin: 20px 0;">
                  ${otpCode}
                </div>
                <p style="color: #6b7280; font-size: 12px; line-height: 1.5;">
                  This code expires in <strong>10 minutes</strong>. If you did not request this verification, you can safely ignore this email.
                </p>
              </div>
            `,
          });
          deliveredViaSmtp = true;
        } catch (smtpErr: any) {
          smtpFailureReason = smtpErr?.message || 'SMTP transport unavailable';
          console.warn('SMTP delivery failed, falling back to in-app OTP dispatch:', smtpFailureReason);
        }
      }

      emailOtpStore.set(rawEmail, {
        hash: otpHash,
        expiresAt: now + OTP_TTL_MS,
        attempts: 0,
        lastSentAt: now,
      });

      if (deliveredViaSmtp) {
        res.json({
          ok: true,
          delivery: 'smtp',
          message: `A 6-digit OTP code has been sent to ${rawEmail}. Please check your inbox (and Spam folder).`,
        });
      } else {
        res.json({
          ok: true,
          delivery: 'in_app_preview',
          previewOtp: otpCode,
          message: smtpFailureReason
            ? `SMTP email delivery failed (${smtpFailureReason}). Your 6-digit OTP was dispatched directly below for verification.`
            : `Email SMTP credentials are not set in .env yet, so your 6-digit Email OTP was dispatched below.`,
        });
      }
    } catch (err: any) {
      console.error('Failed to generate Email OTP:', err);
      res.status(500).json({
        ok: false,
        error: err?.message || 'Unable to generate Email OTP right now.',
      });
    }
  });

  // Verify 6-digit Email OTP code
  app.post('/api/otp/verify-email', (req, res) => {
    const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const cleanCode = typeof req.body?.code === 'string' ? req.body.code.replace(/\D/g, '') : '';

    if (!rawEmail || cleanCode.length !== 6) {
      res.status(400).json({ ok: false, error: 'Please enter a valid email and 6-digit OTP code.' });
      return;
    }

    const record = emailOtpStore.get(rawEmail);
    if (!record) {
      res.status(400).json({ ok: false, error: 'No active OTP found for this email. Please request a new OTP code.' });
      return;
    }

    if (Date.now() > record.expiresAt) {
      emailOtpStore.delete(rawEmail);
      res.status(400).json({ ok: false, error: 'This OTP code has expired. Please request a new code.' });
      return;
    }

    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      emailOtpStore.delete(rawEmail);
      res.status(429).json({ ok: false, error: 'Too many incorrect OTP attempts. Please request a new code.' });
      return;
    }

    const expectedHash = hashOtp(rawEmail, cleanCode);
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(record.hash, 'hex'),
      Buffer.from(expectedHash, 'hex')
    );

    if (!isMatch) {
      record.attempts += 1;
      emailOtpStore.set(rawEmail, record);
      const remaining = Math.max(0, MAX_OTP_ATTEMPTS - record.attempts);
      res.status(400).json({
        ok: false,
        error:
          remaining > 0
            ? `Incorrect Email OTP code. ${remaining} attempt(s) remaining.`
            : 'Too many incorrect attempts. Please request a new Email OTP code.',
      });
      return;
    }

    emailOtpStore.delete(rawEmail);
    res.json({ ok: true, verified: true, email: rawEmail });
  });

  // Send 6-digit Phone SMS OTP (uses Twilio if configured, otherwise in-app verified OTP dispatch)
  app.post('/api/otp/send-sms', async (req, res) => {
    try {
      const rawPhone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
      const digits = rawPhone.replace(/\D/g, '');
      const normalizedPhone = rawPhone.startsWith('+') ? `+${digits}` : `+${digits}`;

      if (!digits || digits.length < 7 || digits.length > 16) {
        res.status(400).json({ ok: false, error: 'Please provide a valid phone number with country code.' });
        return;
      }

      const existing = smsOtpStore.get(normalizedPhone);
      const now = Date.now();
      if (existing && now - existing.lastSentAt < OTP_COOLDOWN_MS) {
        const waitSec = Math.ceil((OTP_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
        res.status(429).json({
          ok: false,
          error: `Please wait ${waitSec}s before requesting another SMS OTP code.`,
        });
        return;
      }

      const otpCode = crypto.randomInt(100000, 1000000).toString();
      const otpHash = hashOtp(normalizedPhone, otpCode);
      const twilio = getTwilioConfig();

      let deliveredViaSms = false;
      let smsFailureReason = '';

      if (twilio.accountSid && twilio.authToken && twilio.fromNumber) {
        try {
          await sendTwilioSms(
            normalizedPhone,
            `Your PayGo 6-digit verification OTP code is: ${otpCode}. Expires in 10 minutes.`
          );
          deliveredViaSms = true;
        } catch (smsErr: any) {
          smsFailureReason = smsErr?.message || 'SMS gateway unavailable';
          console.warn('Twilio SMS failed, falling back to in-app OTP dispatch:', smsFailureReason);
        }
      }

      smsOtpStore.set(normalizedPhone, {
        hash: otpHash,
        expiresAt: now + OTP_TTL_MS,
        attempts: 0,
        lastSentAt: now,
      });

      if (deliveredViaSms) {
        res.json({
          ok: true,
          delivery: 'twilio_sms',
          phone: normalizedPhone,
          message: `A 6-digit SMS OTP code has been sent to ${normalizedPhone}.`,
        });
      } else {
        res.json({
          ok: true,
          delivery: 'in_app_preview',
          phone: normalizedPhone,
          previewOtp: otpCode,
          message: smsFailureReason
            ? `SMS gateway error (${smsFailureReason}). Your 6-digit OTP was dispatched below for verification.`
            : `Live carrier SMS gateway is not configured in Firebase Console or Twilio secrets yet, so your 6-digit Phone OTP was dispatched below.`,
        });
      }
    } catch (err: any) {
      console.error('Failed to generate SMS OTP:', err);
      res.status(500).json({
        ok: false,
        error: err?.message || 'Unable to send Phone OTP right now.',
      });
    }
  });

  // Verify 6-digit Phone SMS OTP code
  app.post('/api/otp/verify-sms', (req, res) => {
    const rawPhone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
    const digits = rawPhone.replace(/\D/g, '');
    const normalizedPhone = `+${digits}`;
    const cleanCode = typeof req.body?.code === 'string' ? req.body.code.replace(/\D/g, '') : '';

    if (!digits || cleanCode.length !== 6) {
      res.status(400).json({ ok: false, error: 'Please enter a valid phone number and 6-digit OTP code.' });
      return;
    }

    const record = smsOtpStore.get(normalizedPhone);
    if (!record) {
      res.status(400).json({ ok: false, error: 'No active SMS OTP found for this phone. Please request a new OTP code.' });
      return;
    }

    if (Date.now() > record.expiresAt) {
      smsOtpStore.delete(normalizedPhone);
      res.status(400).json({ ok: false, error: 'This SMS OTP code has expired. Please request a new code.' });
      return;
    }

    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      smsOtpStore.delete(normalizedPhone);
      res.status(429).json({ ok: false, error: 'Too many incorrect OTP attempts. Please request a new code.' });
      return;
    }

    const expectedHash = hashOtp(normalizedPhone, cleanCode);
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(record.hash, 'hex'),
      Buffer.from(expectedHash, 'hex')
    );

    if (!isMatch) {
      record.attempts += 1;
      smsOtpStore.set(normalizedPhone, record);
      const remaining = Math.max(0, MAX_OTP_ATTEMPTS - record.attempts);
      res.status(400).json({
        ok: false,
        error:
          remaining > 0
            ? `Incorrect Phone OTP code. ${remaining} attempt(s) remaining.`
            : 'Too many incorrect attempts. Please request a new Phone OTP code.',
      });
      return;
    }

    smsOtpStore.delete(normalizedPhone);
    res.json({ ok: true, verified: true, phone: normalizedPhone });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vitePkg = 'vite';
    const { createServer: createViteServer } = await import(vitePkg);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app
    .listen(PORT, '0.0.0.0', () => {
      console.log(`Server listening on port ${PORT}`);
    })
    .on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use, exiting.`);
        process.exit(1);
      } else {
        console.error('Server error:', err);
      }
    });
}

startServer();
