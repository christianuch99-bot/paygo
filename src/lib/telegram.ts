import { auth } from './firebase';

export type TelegramClientEventPayload =
  | {
      eventType: 'signup';
      name: string;
      email: string;
      time?: string;
    }
  | {
      eventType: 'gift_card_submitted';
      userName: string;
      cardType: string;
      amount: number;
    }
  | {
      eventType: 'user_returning_login';
      name: string;
      email?: string;
    };

export async function notifyTelegramEvent(payload: TelegramClientEventPayload): Promise<void> {
  try {
    await fetch('/api/telegram/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Non-blocking notification
  }
}

export async function notifyTelegramAdminVerdict(payload: {
  status: 'verified' | 'redeemed' | 'rejected';
  userName: string;
  userEmail: string;
  cardBrand: string;
  type: string;
  amount: number;
  reason?: string;
}): Promise<void> {
  try {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) return;
    await fetch('/api/telegram/admin-verdict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Non-blocking notification
  }
}

export async function sendTestTelegramAlert(): Promise<{ ok: boolean; error?: string; message?: string }> {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) {
    return { ok: false, error: 'Please sign in as Admin before testing Telegram notifications.' };
  }

  const res = await fetch('/api/telegram/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    return {
      ok: false,
      error: data?.error || 'Failed to send test Telegram alert.',
    };
  }
  return {
    ok: true,
    message: data?.message || 'Test Telegram notification sent successfully!',
  };
}
