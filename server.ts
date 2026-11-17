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
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Helper to verify Owner Admin Firebase ID Token
  async function verifyAdminRequest(req: express.Request): Promise<{ ok: boolean; email?: string; error?: string }> {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) {
      return { ok: false, error: 'Missing owner authorization token. Please sign in to the Owner Admin Portal.' };
    }
    try {
      const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
      const fbConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const lookupRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(fbConfig.apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: token }),
        }
      );
      if (!lookupRes.ok) {
        return { ok: false, error: 'Invalid or expired admin session. Please sign in again.' };
      }
      const lookupData: any = await lookupRes.json();
      const user = lookupData?.users?.[0];
      if (!user || user.email?.toLowerCase() !== 'ibro88977@gmail.com' || !user.emailVerified) {
        return { ok: false, error: 'Forbidden: Only verified owner account can execute treasury payouts.' };
      }
      return { ok: true, email: user.email };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Failed to verify admin token.' };
    }
  }

  // API health endpoint
  app.get('/api/health', (_req, res) => {
    const smtp = getSmtpConfig();
    const twilio = getTwilioConfig();
    res.json({
      status: 'ok',
      emailOtpConfigured: Boolean(smtp.host && smtp.user && smtp.pass),
      smsOtpConfigured: Boolean(twilio.accountSid && twilio.authToken && twilio.fromNumber),
      paystackConfigured: Boolean((process.env.PAYSTACK_SECRET_KEY || '').trim()),
      timestamp: new Date().toISOString(),
    });
  });

  // Check Paystack Gateway Configuration & Live Balance
  app.get('/api/paystack/status', async (req, res) => {
    const authCheck = await verifyAdminRequest(req);
    if (!authCheck.ok) {
      res.status(401).json({ ok: false, error: authCheck.error });
      return;
    }

    const secret = (process.env.PAYSTACK_SECRET_KEY || '').trim();
    if (!secret) {
      res.json({
        ok: true,
        configured: false,
        mode: 'unconfigured',
        message: 'PAYSTACK_SECRET_KEY is not configured in environment secrets yet.',
      });
      return;
    }

    try {
      const balRes = await fetch('https://api.paystack.co/balance', {
        headers: { Authorization: `Bearer ${secret}` },
      });
      const balData: any = await balRes.json();
      res.json({
        ok: true,
        configured: true,
        mode: secret.startsWith('sk_live_') ? 'live' : 'test',
        balances: balData?.status ? balData.data : [],
      });
    } catch (err: any) {
      res.json({
        ok: true,
        configured: true,
        mode: secret.startsWith('sk_live_') ? 'live' : 'test',
        error: err?.message,
      });
    }
  });

  // Fetch Paystack supported banks (including Paystack-Titan)
  app.get('/api/paystack/banks', async (req, res) => {
    const authCheck = await verifyAdminRequest(req);
    if (!authCheck.ok) {
      res.status(401).json({ ok: false, error: authCheck.error });
      return;
    }
    const secret = (process.env.PAYSTACK_SECRET_KEY || '').trim();
    if (!secret) {
      res.status(400).json({ ok: false, error: 'PAYSTACK_SECRET_KEY is not configured.' });
      return;
    }
    try {
      const bankRes = await fetch('https://api.paystack.co/bank?country=nigeria&perPage=500', {
        headers: { Authorization: `Bearer ${secret}` },
      });
      const bankData: any = await bankRes.json();
      if (!bankRes.ok || !bankData?.status) {
        res.status(400).json({ ok: false, error: bankData?.message || 'Failed to fetch banks from Paystack.' });
        return;
      }
      res.json({ ok: true, banks: bankData.data || [] });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Paystack bank lookup failed.' });
    }
  });

  // Resolve real bank account name via Paystack
  app.get('/api/paystack/resolve-account', async (req, res) => {
    const authCheck = await verifyAdminRequest(req);
    if (!authCheck.ok) {
      res.status(401).json({ ok: false, error: authCheck.error });
      return;
    }
    const secret = (process.env.PAYSTACK_SECRET_KEY || '').trim();
    if (!secret) {
      res.status(400).json({ ok: false, error: 'PAYSTACK_SECRET_KEY is not configured.' });
      return;
    }
    const accountNumber = String(req.query.account_number || '').trim();
    const bankCode = String(req.query.bank_code || '').trim();
    if (!accountNumber || !bankCode) {
      res.status(400).json({ ok: false, error: 'Account number and bank code are required.' });
      return;
    }
    try {
      const r = await fetch(
        `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
        { headers: { Authorization: `Bearer ${secret}` } }
      );
      const data: any = await r.json();
      if (!r.ok || !data?.status) {
        res.status(400).json({ ok: false, error: data?.message || 'Unable to verify bank account.' });
        return;
      }
      res.json({ ok: true, account_name: data.data?.account_name, account_number: data.data?.account_number });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Account verification error.' });
    }
  });

  // Execute Real Paystack Bank Transfer (Paystack-Titan or any bank)
  app.post('/api/paystack/transfer', async (req, res) => {
    const authCheck = await verifyAdminRequest(req);
    if (!authCheck.ok) {
      res.status(401).json({ ok: false, error: authCheck.error });
      return;
    }

    const secret = (process.env.PAYSTACK_SECRET_KEY || '').trim();
    if (!secret) {
      res.status(400).json({
        ok: false,
        code: 'PAYSTACK_KEY_MISSING',
        error:
          'Real bank transfers require PAYSTACK_SECRET_KEY in environment secrets. Add your Paystack Secret Key (sk_live_... or sk_test_...) in AI Studio Secrets to send real payouts to Paystack-Titan or any bank.',
      });
      return;
    }

    const { bankCode, bankName, accountNumber, accountName, amount, currency, reason } = req.body || {};
    const numAmount = Number(amount);
    if (!accountNumber || !accountName || !bankCode || isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({
        ok: false,
        error: 'Bank selection, bank code, account number, account name, and valid amount are required.',
      });
      return;
    }

    try {
      const txCurrency = (currency || process.env.PAYSTACK_CURRENCY || 'NGN').toUpperCase();
      // Step 1: Create Transfer Recipient on Paystack
      const recipRes = await fetch('https://api.paystack.co/transferrecipient', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'nuban',
          name: String(accountName).trim(),
          account_number: String(accountNumber).trim(),
          bank_code: String(bankCode).trim(),
          currency: txCurrency,
        }),
      });
      const recipData: any = await recipRes.json();
      if (!recipRes.ok || !recipData?.status || !recipData?.data?.recipient_code) {
        res.status(400).json({
          ok: false,
          error: recipData?.message || `Failed to create Paystack recipient for ${bankName || bankCode}.`,
        });
        return;
      }

      // Step 2: Initiate Real Transfer (amount in kobo/cents: * 100)
      const reference = `PG-LIVE-${Date.now()}`;
      const transferRes = await fetch('https://api.paystack.co/transfer', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'balance',
          amount: Math.round(numAmount * 100),
          recipient: recipData.data.recipient_code,
          reason: reason || `PayGo Admin Payout to ${bankName || bankCode}`,
          reference,
        }),
      });
      const transferData: any = await transferRes.json();
      if (!transferRes.ok || !transferData?.status) {
        res.status(400).json({
          ok: false,
          error: transferData?.message || 'Paystack transfer could not be completed.',
        });
        return;
      }

      res.json({
        ok: true,
        transferCode: transferData.data?.transfer_code,
        reference: transferData.data?.reference || reference,
        status: transferData.data?.status || 'success',
        currency: txCurrency,
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Paystack transfer request failed.' });
    }
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
