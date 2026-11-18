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
      payoutProviders: {
        flutterwave: Boolean((process.env.FLW_SECRET_KEY || '').trim()),
        korapay: Boolean((process.env.KORAPAY_SECRET_KEY || '').trim()),
        monnify: Boolean(
          (process.env.MONNIFY_API_KEY || '').trim() &&
            (process.env.MONNIFY_SECRET_KEY || '').trim()
        ),
        kuda: Boolean(
          (process.env.KUDA_EMAIL || '').trim() &&
            (process.env.KUDA_API_KEY || '').trim()
        ),
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Helper: Get Monnify Bearer Access Token
  const getMonnifyAccessToken = async () => {
    const apiKey = (process.env.MONNIFY_API_KEY || '').trim();
    const secretKey = (process.env.MONNIFY_SECRET_KEY || '').trim();
    const baseUrl = (process.env.MONNIFY_BASE_URL || 'https://api.monnify.com').replace(/\/+$/, '');
    if (!apiKey || !secretKey) {
      return { ok: false as const, error: 'MONNIFY_API_KEY and MONNIFY_SECRET_KEY are not configured.' };
    }
    const basicAuth = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { Authorization: `Basic ${basicAuth}` },
    });
    const loginData: any = await loginRes.json();
    const token = loginData?.responseBody?.accessToken;
    if (!loginRes.ok || !loginData?.requestSuccessful || !token) {
      return {
        ok: false as const,
        error: loginData?.responseMessage || 'Monnify authentication failed. Check MONNIFY_API_KEY & MONNIFY_SECRET_KEY.',
      };
    }
    return {
      ok: true as const,
      token,
      baseUrl,
      mode: baseUrl.includes('sandbox') ? ('test' as const) : ('live' as const),
    };
  };

  // Helper: Get Kuda Access Token
  const getKudaAccessToken = async () => {
    const email = (process.env.KUDA_EMAIL || '').trim();
    const apiKey = (process.env.KUDA_API_KEY || '').trim();
    if (!email || !apiKey) {
      return { ok: false as const, error: 'KUDA_EMAIL and KUDA_API_KEY are not configured.' };
    }
    try {
      const r = await fetch('https://kuda-openapi.kudabank.com/v2.1/Account/GetToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, apiKey }),
      });
      const d: any = await r.json();
      const token = d?.data?.token || d?.token || (typeof d === 'string' ? d : '');
      if (!r.ok || !token) {
        return { ok: false as const, error: d?.message || 'Kuda authentication failed. Check KUDA_EMAIL & KUDA_API_KEY.' };
      }
      return { ok: true as const, token };
    } catch (err: any) {
      return { ok: false as const, error: err?.message || 'Could not reach Kuda API.' };
    }
  };

  // Check Live Payout Gateways (Flutterwave, Korapay, Monnify) & Merchant Wallet Balances
  app.get('/api/payout/status', async (req, res) => {
    const authCheck = await verifyAdminRequest(req);
    if (!authCheck.ok) {
      res.status(401).json({ ok: false, error: authCheck.error });
      return;
    }

    const defaultRate = Number(process.env.USD_TO_NGN_RATE || 1600) || 1600;
    const flwSecret = (process.env.FLW_SECRET_KEY || '').trim();
    const koraSecret = (process.env.KORAPAY_SECRET_KEY || '').trim();
    const monnifyKey = (process.env.MONNIFY_API_KEY || '').trim();
    const monnifySecret = (process.env.MONNIFY_SECRET_KEY || '').trim();
    const monnifyWallet = (process.env.MONNIFY_WALLET_ACCOUNT || '').trim();
    const kudaEmail = (process.env.KUDA_EMAIL || '').trim();
    const kudaApiKey = (process.env.KUDA_API_KEY || '').trim();
    const kudaSender = (process.env.KUDA_SENDER_ACCOUNT || '').trim();

    const providers: Record<string, any> = {
      flutterwave: { configured: Boolean(flwSecret), keyValid: false, mode: 'unconfigured', balances: [] },
      korapay: { configured: Boolean(koraSecret), keyValid: false, mode: 'unconfigured', balances: [] },
      monnify: {
        configured: Boolean(monnifyKey && monnifySecret),
        keyValid: false,
        mode: 'unconfigured',
        walletAccountConfigured: Boolean(monnifyWallet),
        balances: [],
      },
      kuda: {
        configured: Boolean(kudaEmail && kudaApiKey),
        keyValid: false,
        mode: 'unconfigured',
        senderAccountConfigured: Boolean(kudaSender),
        balances: [],
      },
    };

    // 1. Check Flutterwave v3
    if (flwSecret) {
      const flwMode = flwSecret.includes('_TEST') || flwSecret.toLowerCase().includes('test') ? 'test' : 'live';
      try {
        const balRes = await fetch('https://api.flutterwave.com/v3/balances', {
          headers: { Authorization: `Bearer ${flwSecret}` },
        });
        const balData: any = await balRes.json();
        if (balRes.ok && balData?.status === 'success') {
          providers.flutterwave = {
            configured: true,
            keyValid: true,
            mode: flwMode,
            balances: Array.isArray(balData.data)
              ? balData.data.map((b: any) => ({
                  currency: String(b.currency || 'NGN'),
                  available: Number(b.available_balance || 0),
                  ledger: Number(b.ledger_balance || 0),
                }))
              : [],
          };
        } else {
          providers.flutterwave = {
            configured: true,
            keyValid: false,
            mode: flwMode,
            balances: [],
            error: balData?.message || 'Flutterwave rejected FLW_SECRET_KEY.',
          };
        }
      } catch (err: any) {
        providers.flutterwave = {
          configured: true,
          keyValid: false,
          mode: flwMode,
          balances: [],
          error: err?.message || 'Could not reach Flutterwave API.',
        };
      }
    }

    // 2. Check Korapay
    if (koraSecret) {
      const koraMode = koraSecret.startsWith('sk_live_') ? 'live' : 'test';
      try {
        const koraRes = await fetch('https://api.korapay.com/merchant/api/v1/balances', {
          headers: { Authorization: `Bearer ${koraSecret}` },
        });
        const koraData: any = await koraRes.json();
        if (koraRes.ok && koraData?.status) {
          const dataObj = koraData.data || {};
          const balances = Object.entries(dataObj).map(([cur, vals]: [string, any]) => ({
            currency: cur,
            available: Number(vals?.available_balance || 0),
            ledger: Number(vals?.pending_balance || 0),
          }));
          providers.korapay = {
            configured: true,
            keyValid: true,
            mode: koraMode,
            balances,
          };
        } else {
          providers.korapay = {
            configured: true,
            keyValid: false,
            mode: koraMode,
            balances: [],
            error: koraData?.message || 'Korapay rejected KORAPAY_SECRET_KEY.',
          };
        }
      } catch (err: any) {
        providers.korapay = {
          configured: true,
          keyValid: false,
          mode: koraMode,
          balances: [],
          error: err?.message || 'Could not reach Korapay API.',
        };
      }
    }

    // 3. Check Monnify
    if (monnifyKey && monnifySecret) {
      try {
        const authResult = await getMonnifyAccessToken();
        if (!authResult.ok) {
          providers.monnify = {
            configured: true,
            keyValid: false,
            mode: 'unconfigured',
            walletAccountConfigured: Boolean(monnifyWallet),
            balances: [],
            error: authResult.error,
          };
        } else {
          let balances: Array<{ currency: string; available: number; ledger: number }> = [];
          let walletErr: string | undefined;
          if (monnifyWallet) {
            const walRes = await fetch(
              `${authResult.baseUrl}/api/v2/disbursements/wallet-balance?accountNumber=${encodeURIComponent(monnifyWallet)}`,
              { headers: { Authorization: `Bearer ${authResult.token}` } }
            );
            const walData: any = await walRes.json();
            if (walRes.ok && walData?.requestSuccessful) {
              balances = [
                {
                  currency: 'NGN',
                  available: Number(walData.responseBody?.availableBalance || 0),
                  ledger: Number(walData.responseBody?.ledgerBalance || 0),
                },
              ];
            } else {
              walletErr = walData?.responseMessage || 'Could not fetch Monnify wallet balance.';
            }
          } else {
            walletErr = 'MONNIFY_WALLET_ACCOUNT is required in Secrets to check wallet balance & disburse.';
          }
          providers.monnify = {
            configured: true,
            keyValid: true,
            mode: authResult.mode,
            walletAccountConfigured: Boolean(monnifyWallet),
            balances,
            ...(walletErr ? { error: walletErr } : {}),
          };
        }
      } catch (err: any) {
        providers.monnify = {
          configured: true,
          keyValid: false,
          mode: 'unconfigured',
          walletAccountConfigured: Boolean(monnifyWallet),
          balances: [],
          error: err?.message || 'Could not reach Monnify API.',
        };
      }
    }

    // 4. Check Kuda
    if (kudaEmail && kudaApiKey) {
      try {
        const kudaAuth = await getKudaAccessToken();
        if (kudaAuth.ok) {
          providers.kuda = {
            configured: true,
            keyValid: true,
            mode: 'live',
            senderAccountConfigured: Boolean(kudaSender),
            balances: [{ currency: 'NGN', available: 0, ledger: 0 }],
          };
        } else {
          providers.kuda = {
            configured: true,
            keyValid: false,
            mode: 'live',
            senderAccountConfigured: Boolean(kudaSender),
            balances: [],
            error: kudaAuth.error,
          };
        }
      } catch (err: any) {
        providers.kuda = {
          configured: true,
          keyValid: false,
          mode: 'unconfigured',
          senderAccountConfigured: Boolean(kudaSender),
          balances: [],
          error: err?.message || 'Could not reach Kuda API.',
        };
      }
    }

    const activeProvider = providers.flutterwave.keyValid
      ? 'flutterwave'
      : providers.korapay.keyValid
      ? 'korapay'
      : providers.monnify.keyValid
      ? 'monnify'
      : providers.kuda.keyValid
      ? 'kuda'
      : providers.flutterwave.configured
      ? 'flutterwave'
      : providers.korapay.configured
      ? 'korapay'
      : providers.monnify.configured
      ? 'monnify'
      : providers.kuda.configured
      ? 'kuda'
      : null;

    res.json({
      ok: true,
      activeProvider,
      defaultRate,
      providers,
    });
  });

  // Fetch Nigerian Bank List from Active Payout Provider
  app.get('/api/payout/banks', async (req, res) => {
    const authCheck = await verifyAdminRequest(req);
    if (!authCheck.ok) {
      res.status(401).json({ ok: false, error: authCheck.error });
      return;
    }

    const requested = String(req.query.provider || '').toLowerCase();
    const flwSecret = (process.env.FLW_SECRET_KEY || '').trim();
    const koraSecret = (process.env.KORAPAY_SECRET_KEY || '').trim();
    const monnifyKey = (process.env.MONNIFY_API_KEY || '').trim();
    const monnifySecret = (process.env.MONNIFY_SECRET_KEY || '').trim();
    const kudaEmail = (process.env.KUDA_EMAIL || '').trim();
    const kudaApiKey = (process.env.KUDA_API_KEY || '').trim();
    const provider =
      requested || (flwSecret ? 'flutterwave' : koraSecret ? 'korapay' : monnifyKey && monnifySecret ? 'monnify' : kudaEmail && kudaApiKey ? 'kuda' : '');

    try {
      if (provider === 'flutterwave' && flwSecret) {
        const r = await fetch('https://api.flutterwave.com/v3/banks/NG', {
          headers: { Authorization: `Bearer ${flwSecret}` },
        });
        const d: any = await r.json();
        if (!r.ok || d?.status !== 'success') {
          res.status(400).json({ ok: false, error: d?.message || 'Failed to fetch Flutterwave banks.' });
          return;
        }
        res.json({ ok: true, provider: 'flutterwave', banks: d.data || [] });
        return;
      }

      if (provider === 'korapay' && koraSecret) {
        const r = await fetch('https://api.korapay.com/merchant/api/v1/misc/banks?countryCode=NG', {
          headers: { Authorization: `Bearer ${koraSecret}` },
        });
        const d: any = await r.json();
        if (!r.ok || !d?.status) {
          res.status(400).json({ ok: false, error: d?.message || 'Failed to fetch Korapay banks.' });
          return;
        }
        res.json({ ok: true, provider: 'korapay', banks: d.data || [] });
        return;
      }

      if (provider === 'monnify') {
        const authResult = await getMonnifyAccessToken();
        if (!authResult.ok) {
          res.status(400).json({ ok: false, error: authResult.error });
          return;
        }
        const r = await fetch(`${authResult.baseUrl}/api/v1/banks`, {
          headers: { Authorization: `Bearer ${authResult.token}` },
        });
        const d: any = await r.json();
        if (!r.ok || !d?.requestSuccessful) {
          res.status(400).json({ ok: false, error: d?.responseMessage || 'Failed to fetch Monnify banks.' });
          return;
        }
        res.json({ ok: true, provider: 'monnify', banks: d.responseBody || [] });
        return;
      }

      if (provider === 'kuda') {
        const authRes = await getKudaAccessToken();
        if (!authRes.ok) {
          res.status(400).json({ ok: false, error: authRes.error });
          return;
        }
        const r = await fetch('https://kuda-openapi.kudabank.com/v2.1', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authRes.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            serviceType: 'BANK_LIST',
            requestRef: `PG-KUD-BANKS-${Date.now()}`,
          }),
        });
        const d: any = await r.json();
        const banks = d?.data || d?.responseObject || [];
        if (!r.ok || (!Array.isArray(banks) && !d?.status)) {
          res.status(400).json({ ok: false, error: d?.message || 'Failed to fetch Kuda bank list.' });
          return;
        }
        res.json({ ok: true, provider: 'kuda', banks });
        return;
      }

      res.status(400).json({
        ok: false,
        error: 'No payout provider API key is configured in AI Studio Secrets yet.',
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Failed to load bank list.' });
    }
  });

  // Verify Destination Bank Account Name (e.g. SmartCash 120004 / 8081756524)
  app.get('/api/payout/resolve-account', async (req, res) => {
    const authCheck = await verifyAdminRequest(req);
    if (!authCheck.ok) {
      res.status(401).json({ ok: false, error: authCheck.error });
      return;
    }

    const accountNumber = String(req.query.account_number || '').trim();
    const bankCode = String(req.query.bank_code || '').trim();
    const requested = String(req.query.provider || '').toLowerCase();
    const flwSecret = (process.env.FLW_SECRET_KEY || '').trim();
    const koraSecret = (process.env.KORAPAY_SECRET_KEY || '').trim();
    const monnifyKey = (process.env.MONNIFY_API_KEY || '').trim();
    const monnifySecret = (process.env.MONNIFY_SECRET_KEY || '').trim();
    const kudaEmail = (process.env.KUDA_EMAIL || '').trim();
    const kudaApiKey = (process.env.KUDA_API_KEY || '').trim();
    const provider =
      requested || (flwSecret ? 'flutterwave' : koraSecret ? 'korapay' : monnifyKey && monnifySecret ? 'monnify' : kudaEmail && kudaApiKey ? 'kuda' : '');

    if (!accountNumber || !bankCode) {
      res.status(400).json({ ok: false, error: 'Account number and bank code are required.' });
      return;
    }

    try {
      if (provider === 'flutterwave') {
        if (!flwSecret) {
          res.status(400).json({ ok: false, error: 'FLW_SECRET_KEY is not configured.' });
          return;
        }
        const r = await fetch('https://api.flutterwave.com/v3/accounts/resolve', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${flwSecret}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            account_number: accountNumber,
            account_bank: bankCode,
          }),
        });
        const d: any = await r.json();
        if (!r.ok || d?.status !== 'success' || !d?.data?.account_name) {
          res.status(400).json({ ok: false, error: d?.message || 'Flutterwave could not verify this bank account.' });
          return;
        }
        res.json({
          ok: true,
          provider: 'flutterwave',
          account_name: d.data.account_name,
          account_number: d.data.account_number || accountNumber,
        });
        return;
      }

      if (provider === 'korapay') {
        if (!koraSecret) {
          res.status(400).json({ ok: false, error: 'KORAPAY_SECRET_KEY is not configured.' });
          return;
        }
        const r = await fetch('https://api.korapay.com/merchant/api/v1/misc/banks/resolve', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${koraSecret}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bank: bankCode,
            account: accountNumber,
          }),
        });
        const d: any = await r.json();
        if (!r.ok || !d?.status || !d?.data?.account_name) {
          res.status(400).json({ ok: false, error: d?.message || 'Korapay could not verify this bank account.' });
          return;
        }
        res.json({
          ok: true,
          provider: 'korapay',
          account_name: d.data.account_name,
          account_number: d.data.account_number || accountNumber,
        });
        return;
      }

      if (provider === 'monnify') {
        const authResult = await getMonnifyAccessToken();
        if (!authResult.ok) {
          res.status(400).json({ ok: false, error: authResult.error });
          return;
        }
        const r = await fetch(
          `${authResult.baseUrl}/api/v1/disbursements/account/validate?accountNumber=${encodeURIComponent(accountNumber)}&bankCode=${encodeURIComponent(bankCode)}`,
          { headers: { Authorization: `Bearer ${authResult.token}` } }
        );
        const d: any = await r.json();
        if (!r.ok || !d?.requestSuccessful || !d?.responseBody?.accountName) {
          res.status(400).json({ ok: false, error: d?.responseMessage || 'Monnify could not verify this bank account.' });
          return;
        }
        res.json({
          ok: true,
          provider: 'monnify',
          account_name: d.responseBody.accountName,
          account_number: d.responseBody.accountNumber || accountNumber,
        });
        return;
      }

      if (provider === 'kuda') {
        const authRes = await getKudaAccessToken();
        if (!authRes.ok) {
          res.status(400).json({ ok: false, error: authRes.error });
          return;
        }
        const r = await fetch('https://kuda-openapi.kudabank.com/v2.1', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authRes.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            serviceType: 'NAME_ENQUIRY',
            requestRef: `PG-KUD-NAME-${Date.now()}`,
            data: {
              bankCode: bankCode,
              accountNumber: accountNumber,
            },
          }),
        });
        const d: any = await r.json();
        const nameObj = d?.data || d?.responseObject;
        const accountName = nameObj?.beneficiaryName || nameObj?.accountName;
        if (!r.ok || !accountName) {
          res.status(400).json({ ok: false, error: d?.message || 'Kuda could not verify this bank account.' });
          return;
        }
        res.json({
          ok: true,
          provider: 'kuda',
          account_name: accountName,
          account_number: nameObj?.beneficiaryAccount || accountNumber,
        });
        return;
      }

      res.status(400).json({ ok: false, error: 'Unsupported payout provider.' });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Account verification error.' });
    }
  });

  // Execute Real Direct Bank Transfer (Flutterwave, Korapay, or Monnify -> SmartCash PSB 120004 / 8081756524)
  app.post('/api/payout/transfer', async (req, res) => {
    const authCheck = await verifyAdminRequest(req);
    if (!authCheck.ok) {
      res.status(401).json({ ok: false, error: authCheck.error });
      return;
    }

    const {
      provider: reqProvider,
      bankCode,
      bankName,
      accountNumber,
      accountName,
      amount,
      ngnAmount,
      exchangeRate,
      debitCurrency,
      reason,
    } = req.body || {};

    const numAmount = Number(amount);
    if (!bankCode || !accountNumber || isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({
        ok: false,
        error: 'Destination bank code, account number, and valid USD amount are required.',
      });
      return;
    }

    const flwSecret = (process.env.FLW_SECRET_KEY || '').trim();
    const koraSecret = (process.env.KORAPAY_SECRET_KEY || '').trim();
    const monnifyKey = (process.env.MONNIFY_API_KEY || '').trim();
    const monnifySecret = (process.env.MONNIFY_SECRET_KEY || '').trim();
    const monnifyWallet = (process.env.MONNIFY_WALLET_ACCOUNT || '').trim();
    const kudaEmail = (process.env.KUDA_EMAIL || '').trim();
    const kudaApiKey = (process.env.KUDA_API_KEY || '').trim();

    const chosenProvider = String(reqProvider || '').toLowerCase() ||
      (flwSecret ? 'flutterwave' : koraSecret ? 'korapay' : monnifyKey && monnifySecret ? 'monnify' : kudaEmail && kudaApiKey ? 'kuda' : '');

    if (!chosenProvider) {
      res.status(400).json({
        ok: false,
        code: 'PAYOUT_KEY_MISSING',
        error:
          'No live payout gateway key configured yet. Add FLW_SECRET_KEY (Flutterwave), KORAPAY_SECRET_KEY (Korapay), MONNIFY_* keys, or KUDA_* keys in AI Studio Secrets with a funded merchant balance.',
      });
      return;
    }

    const effectiveRate =
      Number(exchangeRate) > 0
        ? Number(exchangeRate)
        : Number(process.env.USD_TO_NGN_RATE || 1600) || 1600;
    const majorNgnAmount =
      Number(ngnAmount) > 0 ? Math.round(Number(ngnAmount)) : Math.round(numAmount * effectiveRate);

    if (majorNgnAmount < 100) {
      res.status(400).json({
        ok: false,
        error: 'Minimum Nigerian Naira bank transfer is ₦100.',
      });
      return;
    }

    const cleanAcctNum = String(accountNumber).trim();
    const cleanBankCode = String(bankCode).trim();
    const cleanName = String(accountName || 'SMARTCASH ACCOUNT HOLDER').trim();
    const narration = reason || `PayGo Settlement to ${bankName || cleanBankCode} (${cleanAcctNum})`;

    try {
      if (chosenProvider === 'flutterwave') {
        if (!flwSecret) {
          res.status(400).json({ ok: false, error: 'FLW_SECRET_KEY is not configured in Secrets.' });
          return;
        }
        const reference = `PG-FLW-${Date.now()}`;
        const chosenDebit = String(debitCurrency || 'NGN').toUpperCase() === 'USD' ? 'USD' : 'NGN';
        const transferRes = await fetch('https://api.flutterwave.com/v3/transfers', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${flwSecret}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            account_bank: cleanBankCode,
            account_number: cleanAcctNum,
            amount: chosenDebit === 'USD' ? numAmount : majorNgnAmount,
            currency: 'NGN',
            debit_currency: chosenDebit,
            narration,
            reference,
          }),
        });
        const transferData: any = await transferRes.json();
        if (!transferRes.ok || transferData?.status !== 'success') {
          res.status(400).json({
            ok: false,
            error:
              transferData?.message ||
              'Flutterwave transfer failed. Ensure your Flutterwave NGN/USD balance is funded and Transfers are enabled.',
          });
          return;
        }
        res.json({
          ok: true,
          provider: 'flutterwave',
          transferCode: String(transferData.data?.id || ''),
          reference: transferData.data?.reference || reference,
          status: transferData.data?.status || 'NEW',
          ngnAmount: majorNgnAmount,
          debitCurrency: chosenDebit,
          message: transferData.message || 'Transfer queued via Flutterwave.',
        });
        return;
      }

      if (chosenProvider === 'korapay') {
        if (!koraSecret) {
          res.status(400).json({ ok: false, error: 'KORAPAY_SECRET_KEY is not configured in Secrets.' });
          return;
        }
        const reference = `PG-KORA-${Date.now()}`;
        const transferRes = await fetch('https://api.korapay.com/merchant/api/v1/transactions/disburse', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${koraSecret}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reference,
            destination: {
              type: 'bank_account',
              amount: majorNgnAmount,
              currency: 'NGN',
              narration,
              bank_account: {
                bank: cleanBankCode,
                account: cleanAcctNum,
              },
              customer: {
                name: cleanName,
                email: authCheck.email || 'ibro88977@gmail.com',
              },
            },
          }),
        });
        const transferData: any = await transferRes.json();
        if (!transferRes.ok || !transferData?.status) {
          res.status(400).json({
            ok: false,
            error:
              transferData?.message ||
              'Korapay disbursement failed. Ensure your Korapay NGN wallet has sufficient funded balance.',
          });
          return;
        }
        res.json({
          ok: true,
          provider: 'korapay',
          transferCode: transferData.data?.reference || '',
          reference: transferData.data?.reference || reference,
          status: transferData.data?.status || 'processing',
          ngnAmount: majorNgnAmount,
          message: transferData.message || 'Disbursement initiated via Korapay.',
        });
        return;
      }

      if (chosenProvider === 'monnify') {
        if (!monnifyWallet) {
          res.status(400).json({
            ok: false,
            error: 'MONNIFY_WALLET_ACCOUNT is not configured in Secrets. Set your Monnify source wallet account number.',
          });
          return;
        }
        if (!cleanName || cleanName === 'SMARTCASH ACCOUNT HOLDER') {
          res.status(400).json({
            ok: false,
            error: 'Monnify requires the verified recipient Account Holder Name. Tap Verify Name first.',
          });
          return;
        }
        const authResult = await getMonnifyAccessToken();
        if (!authResult.ok) {
          res.status(400).json({ ok: false, error: authResult.error });
          return;
        }
        const reference = `PG-MON-${Date.now()}`;
        const transferRes = await fetch(`${authResult.baseUrl}/api/v2/disbursements/single`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authResult.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: majorNgnAmount,
            reference,
            narration,
            destinationBankCode: cleanBankCode,
            destinationAccountNumber: cleanAcctNum,
            destinationAccountName: cleanName,
            currency: 'NGN',
            sourceAccountNumber: monnifyWallet,
          }),
        });
        const transferData: any = await transferRes.json();
        if (!transferRes.ok || !transferData?.requestSuccessful) {
          res.status(400).json({
            ok: false,
            error:
              transferData?.responseMessage ||
              'Monnify disbursement failed (note: live Monnify requires IP whitelisting & funded wallet balance).',
          });
          return;
        }
        res.json({
          ok: true,
          provider: 'monnify',
          transferCode: transferData.responseBody?.transactionReference || '',
          reference: transferData.responseBody?.reference || reference,
          status: transferData.responseBody?.status || 'SUCCESS',
          ngnAmount: majorNgnAmount,
          message: transferData.responseMessage || 'Disbursement submitted via Monnify.',
        });
        return;
      }

      if (chosenProvider === 'kuda') {
        const kudaEmail = (process.env.KUDA_EMAIL || '').trim();
        const kudaApiKey = (process.env.KUDA_API_KEY || '').trim();
        const kudaSender = (process.env.KUDA_SENDER_ACCOUNT || '').trim();
        if (!kudaEmail || !kudaApiKey) {
          res.status(400).json({ ok: false, error: 'KUDA_EMAIL and KUDA_API_KEY are not configured in Secrets.' });
          return;
        }
        if (!kudaSender) {
          res.status(400).json({
            ok: false,
            error: 'KUDA_SENDER_ACCOUNT is required in Secrets (your Kuda business account number acting as sender).',
          });
          return;
        }
        const authRes = await getKudaAccessToken();
        if (!authRes.ok) {
          res.status(400).json({ ok: false, error: authRes.error });
          return;
        }
        const reference = `PG-KUD-${Date.now()}`;
        const amountInKobo = Math.round(majorNgnAmount * 100);
        const r = await fetch('https://kuda-openapi.kudabank.com/v2.1', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authRes.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            serviceType: 'SINGLE_FUND_TRANSFER',
            requestRef: reference,
            data: {
              beneficiaryAccount: cleanAcctNum,
              beneficiaryBankCode: cleanBankCode,
              beneficiaryName: cleanName,
              clientAccountNumber: kudaSender,
              amount: amountInKobo,
              narration,
              requestRef: reference,
            },
          }),
        });
        const d: any = await r.json();
        if (!r.ok || (d?.status === false && d?.status !== 'success')) {
          res.status(400).json({
            ok: false,
            error: d?.message || 'Kuda transfer failed. Ensure your Kuda business account has sufficient balance.',
          });
          return;
        }
        res.json({
          ok: true,
          provider: 'kuda',
          transferCode: reference,
          reference,
          status: 'SUCCESS',
          ngnAmount: majorNgnAmount,
          message: d?.message || 'Transfer submitted via Kuda.',
        });
        return;
      }

      res.status(400).json({ ok: false, error: `Unsupported payout provider: ${chosenProvider}` });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Bank payout request failed.' });
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
