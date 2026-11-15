import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

interface EmailOtpRecord {
  hash: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
}

const EMAIL_OTP_TTL_MS = 10 * 60 * 1000;
const EMAIL_OTP_COOLDOWN_MS = 45 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const OTP_SECRET = process.env.OTP_SECRET || crypto.randomBytes(32).toString('hex');
const emailOtpStore = new Map<string, EmailOtpRecord>();

function hashEmailOtp(email: string, code: string): string {
  return crypto.createHash('sha256').update(`${email}:${code}:${OTP_SECRET}`).digest('hex');
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
    res.json({
      status: 'ok',
      emailOtpConfigured: Boolean(smtp.host && smtp.user && smtp.pass),
      timestamp: new Date().toISOString(),
    });
  });

  // Send real 6-digit OTP to user's email inbox via SMTP
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
      if (existing && now - existing.lastSentAt < EMAIL_OTP_COOLDOWN_MS) {
        const waitSec = Math.ceil((EMAIL_OTP_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
        res.status(429).json({
          ok: false,
          error: `Please wait ${waitSec}s before requesting another Email OTP code.`,
        });
        return;
      }

      const smtp = getSmtpConfig();
      if (!smtp.host || !smtp.user || !smtp.pass) {
        res.status(503).json({
          ok: false,
          code: 'SMTP_NOT_CONFIGURED',
          error:
            'Email OTP delivery requires SMTP_USER and SMTP_PASS (and SMTP_HOST for non-Gmail) configured in server secrets. You can also use "Verify Instantly with Google Sign-In" below.',
        });
        return;
      }

      const otpCode = crypto.randomInt(100000, 1000000).toString();
      const otpHash = hashEmailOtp(rawEmail, otpCode);

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

      emailOtpStore.set(rawEmail, {
        hash: otpHash,
        expiresAt: now + EMAIL_OTP_TTL_MS,
        attempts: 0,
        lastSentAt: now,
      });

      res.json({
        ok: true,
        message: `A 6-digit OTP code has been sent to ${rawEmail}. Please check your inbox (and Spam folder).`,
      });
    } catch (err: any) {
      console.error('Failed to send Email OTP:', err);
      res.status(500).json({
        ok: false,
        error: err?.message || 'Unable to send Email OTP right now. Check SMTP configuration.',
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

    const expectedHash = hashEmailOtp(rawEmail, cleanCode);
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
