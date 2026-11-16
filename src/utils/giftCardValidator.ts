export interface GiftCardBrandRule {
  id: string;
  name: string;
  icon: string;
  formatHint: string;
  example: string;
  requiresPin: boolean;
  validateCode: (cleanAlnum: string, rawCode: string) => string | null;
}

const luhnCheck = (digits: string): boolean => {
  if (!/^\d{16}$/.test(digits)) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
};

const DUMMY_WORDS = [
  'TEST',
  'FAKE',
  'DEMO',
  'USED',
  'SAMPLE',
  'INVALID',
  'DUMMY',
  'QWERTY',
  'ASDF',
  'NONE',
  'NULL',
  'VOID',
  'FREE',
  'GIFT',
  'CARD',
  'PAYGO',
  'XXXX',
  'AAAA',
  '0000',
  '1111',
  '9999',
];

const SEQUENTIAL_PATTERNS = [
  '0123456789',
  '9876543210',
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'ZYXWVUTSRQPONMLKJIHGFEDCBA',
];

export const normalizeGiftCardCode = (rawCode: string): string => {
  return rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
};

export const hashGiftCardCode = async (rawCode: string): Promise<string> => {
  const normalized = normalizeGiftCardCode(rawCode);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoded = new TextEncoder().encode(`paygo-gc:${normalized}`);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Deterministic 64-hex fallback if SubtleCrypto is unavailable
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (ch + i), 0x85ebca6b) >>> 0;
  }
  return (
    h1.toString(16).padStart(8, '0') +
    h2.toString(16).padStart(8, '0')
  ).repeat(4);
};

export const GIFT_CARD_BRAND_RULES: GiftCardBrandRule[] = [
  {
    id: 'apple',
    name: 'Apple / iTunes Gift Card',
    icon: '🍏',
    formatHint: 'Real 16-character Apple code starting with X (e.g. X7KM-99P2-44BB-912A)',
    example: 'X7KM99P244BB912A',
    requiresPin: false,
    validateCode: (clean) => {
      if (!/^X[A-Z0-9]{15}$/.test(clean)) {
        return 'Real Apple / iTunes Gift Cards must be exactly 16 alphanumeric characters starting with "X".';
      }
      return null;
    },
  },
  {
    id: 'steam',
    name: 'Steam Wallet Card',
    icon: '🎮',
    formatHint: 'Real 15-character Steam Wallet code (XXXXX-XXXXX-XXXXX)',
    example: 'A9B2C-D4E5F-G6H7J',
    requiresPin: false,
    validateCode: (clean) => {
      if (!/^[A-Z0-9]{15}$/.test(clean)) {
        return 'Real Steam Wallet Gift Cards must be exactly 15 alphanumeric characters (XXXXX-XXXXX-XXXXX).';
      }
      return null;
    },
  },
  {
    id: 'razer',
    name: 'Razer Gold',
    icon: '🪙',
    formatHint: 'Real 14 to 20 character Razer Gold PIN / Code',
    example: '8924-1104-5529-8831',
    requiresPin: true,
    validateCode: (clean) => {
      if (!/^[A-Z0-9]{14,20}$/.test(clean)) {
        return 'Real Razer Gold codes must be 14 to 20 characters long.';
      }
      return null;
    },
  },
  {
    id: 'amazon',
    name: 'Amazon Gift Card',
    icon: '📦',
    formatHint: 'Real 14 or 15 character Amazon Claim Code (XXXX-XXXXXX-XXXX)',
    example: 'AQ28-7K9M3P-4B8R',
    requiresPin: false,
    validateCode: (clean) => {
      if (!/^[A-Z0-9]{14,15}$/.test(clean)) {
        return 'Real Amazon Gift Cards must be 14 or 15 alphanumeric characters (e.g. XXXX-XXXXXX-XXXX).';
      }
      return null;
    },
  },
  {
    id: 'sephora',
    name: 'Sephora',
    icon: '💄',
    formatHint: 'Real 16-digit Sephora card number + PIN',
    example: '6011-8421-9034-5521',
    requiresPin: true,
    validateCode: (clean) => {
      if (!/^\d{16}$/.test(clean)) {
        return 'Real Sephora Gift Cards must be a 16-digit card number with PIN.';
      }
      return null;
    },
  },
  {
    id: 'nordstrom',
    name: 'Nordstrom Card',
    icon: '💳',
    formatHint: 'Real 16-digit Nordstrom card number + PIN',
    example: '5412-7500-1234-5678',
    requiresPin: true,
    validateCode: (clean) => {
      if (!/^\d{16}$/.test(clean)) {
        return 'Real Nordstrom Cards must be a 16-digit card number with PIN.';
      }
      return null;
    },
  },
  {
    id: 'xbox-playstation',
    name: 'Xbox / PlayStation Store Card',
    icon: '🕹️',
    formatHint: 'Real 12-char PlayStation code or 25-char Xbox code',
    example: 'K9M2-P4X8-R7Q1',
    requiresPin: false,
    validateCode: (clean) => {
      if (!/^[A-Z0-9]{12}$/.test(clean) && !/^[A-Z0-9]{25}$/.test(clean)) {
        return 'Real PlayStation cards must be 12 characters and Xbox cards must be 25 characters.';
      }
      return null;
    },
  },
];

export const validateRealGiftCardInput = (params: {
  brand: string;
  format: 'ecode' | 'physical';
  code: string;
  pin: string;
  image: string | null;
  confirmedUnused: boolean;
}): { valid: boolean; error?: string; normalizedCode?: string } => {
  const { brand, format, code, pin, image, confirmedUnused } = params;
  const rawCode = code.trim();
  const cleanCode = normalizeGiftCardCode(rawCode);

  if (!confirmedUnused) {
    return {
      valid: false,
      error: 'You must confirm that this is a real, brand-new unused gift card. Used gift cards are not allowed.',
    };
  }

  if (!cleanCode || cleanCode.length < 12) {
    return {
      valid: false,
      error: 'Gift card code is incomplete or invalid. Please enter a complete real gift card claim code.',
    };
  }

  // Reject fake/dummy/used placeholder strings
  for (const word of DUMMY_WORDS) {
    if (cleanCode.includes(word)) {
      return {
        valid: false,
        error: `Rejected: "${word}" looks like a test, fake, or used gift card code. Only real unused gift cards are allowed.`,
      };
    }
  }

  // Reject low-entropy / repeating character codes (e.g. X111111111111111 or AABBCCAABBCC)
  const uniqueChars = new Set(cleanCode.split('')).size;
  if (uniqueChars < 5) {
    return {
      valid: false,
      error: 'Invalid or dummy gift card pattern detected. Please drop a real, unredeemed gift card.',
    };
  }

  if (/(.)\1{4,}/.test(cleanCode)) {
    return {
      valid: false,
      error: 'Gift card code contains repeating dummy characters. Please enter a real gift card code.',
    };
  }

  for (const seq of SEQUENTIAL_PATTERNS) {
    for (let i = 0; i <= seq.length - 6; i++) {
      if (cleanCode.includes(seq.slice(i, i + 6))) {
        return {
          valid: false,
          error: 'Sequential test numbers/letters are not allowed. Please drop a real gift card.',
        };
      }
    }
  }

  const rule = GIFT_CARD_BRAND_RULES.find((r) => r.name === brand);
  if (rule) {
    const brandErr = rule.validateCode(cleanCode, rawCode);
    if (brandErr) {
      return { valid: false, error: brandErr };
    }
    const cleanPin = pin.trim().replace(/\s/g, '');
    if (rule.requiresPin && (!cleanPin || cleanPin.length < 3)) {
      return {
        valid: false,
        error: `${rule.name} requires a valid Card PIN / CVV to verify it is real and unused.`,
      };
    }
  }

  if (!image) {
    return {
      valid: false,
      error:
        format === 'physical'
          ? 'A clear photo of the real physical gift card & purchase receipt is required. Used cards are not allowed.'
          : 'Please attach a clear screenshot or receipt proof of the real, unredeemed E-Code gift card.',
    };
  }

  return { valid: true, normalizedCode: cleanCode };
};

export const compressCardImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select a valid JPG or PNG image file.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => resolve(dataUrl);
      img.onload = () => {
        const MAX_DIM = 1280;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.78);
        resolve(compressed.length <= 900000 ? compressed : canvas.toDataURL('image/jpeg', 0.55));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
};
