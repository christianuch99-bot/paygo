export interface CountryDialCode {
  code: string;
  iso: string;
  name: string;
  flag: string;
  minDigits: number;
  maxDigits: number;
}

// +1 (United States / Canada) is intentionally listed FIRST so it is shown and selected by default,
// while all countries worldwide have full access to register and sign in.
export const COUNTRY_DIAL_CODES: CountryDialCode[] = [
  { code: '+1', iso: 'US', name: 'United States / Canada', flag: '🇺🇸', minDigits: 10, maxDigits: 10 },
  { code: '+44', iso: 'GB', name: 'United Kingdom', flag: '🇬🇧', minDigits: 9, maxDigits: 11 },
  { code: '+234', iso: 'NG', name: 'Nigeria', flag: '🇳🇬', minDigits: 10, maxDigits: 11 },
  { code: '+233', iso: 'GH', name: 'Ghana', flag: '🇬🇭', minDigits: 9, maxDigits: 10 },
  { code: '+254', iso: 'KE', name: 'Kenya', flag: '🇰🇪', minDigits: 9, maxDigits: 10 },
  { code: '+27', iso: 'ZA', name: 'South Africa', flag: '🇿🇦', minDigits: 9, maxDigits: 10 },
  { code: '+91', iso: 'IN', name: 'India', flag: '🇮🇳', minDigits: 10, maxDigits: 10 },
  { code: '+61', iso: 'AU', name: 'Australia', flag: '🇦🇺', minDigits: 9, maxDigits: 10 },
  { code: '+49', iso: 'DE', name: 'Germany', flag: '🇩🇪', minDigits: 7, maxDigits: 12 },
  { code: '+33', iso: 'FR', name: 'France', flag: '🇫🇷', minDigits: 9, maxDigits: 10 },
  { code: '+39', iso: 'IT', name: 'Italy', flag: '🇮🇹', minDigits: 8, maxDigits: 11 },
  { code: '+34', iso: 'ES', name: 'Spain', flag: '🇪🇸', minDigits: 9, maxDigits: 9 },
  { code: '+31', iso: 'NL', name: 'Netherlands', flag: '🇳🇱', minDigits: 9, maxDigits: 9 },
  { code: '+55', iso: 'BR', name: 'Brazil', flag: '🇧🇷', minDigits: 10, maxDigits: 11 },
  { code: '+52', iso: 'MX', name: 'Mexico', flag: '🇲🇽', minDigits: 10, maxDigits: 10 },
  { code: '+971', iso: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', minDigits: 8, maxDigits: 9 },
  { code: '+966', iso: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', minDigits: 9, maxDigits: 9 },
  { code: '+93', iso: 'AF', name: 'Afghanistan', flag: '🇦🇫', minDigits: 9, maxDigits: 9 },
  { code: '+355', iso: 'AL', name: 'Albania', flag: '🇦🇱', minDigits: 8, maxDigits: 9 },
  { code: '+213', iso: 'DZ', name: 'Algeria', flag: '🇩🇿', minDigits: 9, maxDigits: 9 },
  { code: '+244', iso: 'AO', name: 'Angola', flag: '🇦🇴', minDigits: 9, maxDigits: 9 },
  { code: '+54', iso: 'AR', name: 'Argentina', flag: '🇦🇷', minDigits: 10, maxDigits: 11 },
  { code: '+374', iso: 'AM', name: 'Armenia', flag: '🇦🇲', minDigits: 8, maxDigits: 8 },
  { code: '+43', iso: 'AT', name: 'Austria', flag: '🇦🇹', minDigits: 7, maxDigits: 13 },
  { code: '+994', iso: 'AZ', name: 'Azerbaijan', flag: '🇦🇿', minDigits: 9, maxDigits: 9 },
  { code: '+973', iso: 'BH', name: 'Bahrain', flag: '🇧🇭', minDigits: 8, maxDigits: 8 },
  { code: '+880', iso: 'BD', name: 'Bangladesh', flag: '🇧🇩', minDigits: 10, maxDigits: 10 },
  { code: '+32', iso: 'BE', name: 'Belgium', flag: '🇧🇪', minDigits: 8, maxDigits: 9 },
  { code: '+229', iso: 'BJ', name: 'Benin', flag: '🇧🇯', minDigits: 8, maxDigits: 8 },
  { code: '+591', iso: 'BO', name: 'Bolivia', flag: '🇧🇴', minDigits: 8, maxDigits: 8 },
  { code: '+267', iso: 'BW', name: 'Botswana', flag: '🇧🇼', minDigits: 7, maxDigits: 8 },
  { code: '+359', iso: 'BG', name: 'Bulgaria', flag: '🇧🇬', minDigits: 8, maxDigits: 9 },
  { code: '+226', iso: 'BF', name: 'Burkina Faso', flag: '🇧🇫', minDigits: 8, maxDigits: 8 },
  { code: '+855', iso: 'KH', name: 'Cambodia', flag: '🇰🇭', minDigits: 8, maxDigits: 9 },
  { code: '+237', iso: 'CM', name: 'Cameroon', flag: '🇨🇲', minDigits: 9, maxDigits: 9 },
  { code: '+56', iso: 'CL', name: 'Chile', flag: '🇨🇱', minDigits: 9, maxDigits: 9 },
  { code: '+86', iso: 'CN', name: 'China', flag: '🇨🇳', minDigits: 11, maxDigits: 11 },
  { code: '+57', iso: 'CO', name: 'Colombia', flag: '🇨🇴', minDigits: 10, maxDigits: 10 },
  { code: '+506', iso: 'CR', name: 'Costa Rica', flag: '🇨🇷', minDigits: 8, maxDigits: 8 },
  { code: '+385', iso: 'HR', name: 'Croatia', flag: '🇭🇷', minDigits: 8, maxDigits: 9 },
  { code: '+357', iso: 'CY', name: 'Cyprus', flag: '🇨🇾', minDigits: 8, maxDigits: 8 },
  { code: '+420', iso: 'CZ', name: 'Czech Republic', flag: '🇨🇿', minDigits: 9, maxDigits: 9 },
  { code: '+243', iso: 'CD', name: 'DR Congo', flag: '🇨🇩', minDigits: 9, maxDigits: 9 },
  { code: '+45', iso: 'DK', name: 'Denmark', flag: '🇩🇰', minDigits: 8, maxDigits: 8 },
  { code: '+593', iso: 'EC', name: 'Ecuador', flag: '🇪🇨', minDigits: 9, maxDigits: 9 },
  { code: '+20', iso: 'EG', name: 'Egypt', flag: '🇪🇬', minDigits: 10, maxDigits: 10 },
  { code: '+503', iso: 'SV', name: 'El Salvador', flag: '🇸🇻', minDigits: 8, maxDigits: 8 },
  { code: '+372', iso: 'EE', name: 'Estonia', flag: '🇪🇪', minDigits: 7, maxDigits: 8 },
  { code: '+251', iso: 'ET', name: 'Ethiopia', flag: '🇪🇹', minDigits: 9, maxDigits: 9 },
  { code: '+358', iso: 'FI', name: 'Finland', flag: '🇫🇮', minDigits: 7, maxDigits: 11 },
  { code: '+220', iso: 'GM', name: 'Gambia', flag: '🇬🇲', minDigits: 7, maxDigits: 7 },
  { code: '+995', iso: 'GE', name: 'Georgia', flag: '🇬🇪', minDigits: 9, maxDigits: 9 },
  { code: '+30', iso: 'GR', name: 'Greece', flag: '🇬🇷', minDigits: 10, maxDigits: 10 },
  { code: '+502', iso: 'GT', name: 'Guatemala', flag: '🇬🇹', minDigits: 8, maxDigits: 8 },
  { code: '+224', iso: 'GN', name: 'Guinea', flag: '🇬🇳', minDigits: 8, maxDigits: 9 },
  { code: '+509', iso: 'HT', name: 'Haiti', flag: '🇭🇹', minDigits: 8, maxDigits: 8 },
  { code: '+504', iso: 'HN', name: 'Honduras', flag: '🇭🇳', minDigits: 8, maxDigits: 8 },
  { code: '+852', iso: 'HK', name: 'Hong Kong', flag: '🇭🇰', minDigits: 8, maxDigits: 8 },
  { code: '+36', iso: 'HU', name: 'Hungary', flag: '🇭🇺', minDigits: 9, maxDigits: 9 },
  { code: '+354', iso: 'IS', name: 'Iceland', flag: '🇮🇸', minDigits: 7, maxDigits: 7 },
  { code: '+62', iso: 'ID', name: 'Indonesia', flag: '🇮🇩', minDigits: 9, maxDigits: 12 },
  { code: '+98', iso: 'IR', name: 'Iran', flag: '🇮🇷', minDigits: 10, maxDigits: 10 },
  { code: '+964', iso: 'IQ', name: 'Iraq', flag: '🇮🇶', minDigits: 10, maxDigits: 10 },
  { code: '+353', iso: 'IE', name: 'Ireland', flag: '🇮🇪', minDigits: 9, maxDigits: 9 },
  { code: '+972', iso: 'IL', name: 'Israel', flag: '🇮🇱', minDigits: 9, maxDigits: 9 },
  { code: '+225', iso: 'CI', name: 'Ivory Coast', flag: '🇨🇮', minDigits: 10, maxDigits: 10 },
  { code: '+81', iso: 'JP', name: 'Japan', flag: '🇯🇵', minDigits: 10, maxDigits: 10 },
  { code: '+962', iso: 'JO', name: 'Jordan', flag: '🇯🇴', minDigits: 9, maxDigits: 9 },
  { code: '+7', iso: 'KZ', name: 'Kazakhstan / Russia', flag: '🇰🇿', minDigits: 10, maxDigits: 10 },
  { code: '+965', iso: 'KW', name: 'Kuwait', flag: '🇰🇼', minDigits: 8, maxDigits: 8 },
  { code: '+371', iso: 'LV', name: 'Latvia', flag: '🇱🇻', minDigits: 8, maxDigits: 8 },
  { code: '+961', iso: 'LB', name: 'Lebanon', flag: '🇱🇧', minDigits: 7, maxDigits: 8 },
  { code: '+231', iso: 'LR', name: 'Liberia', flag: '🇱🇷', minDigits: 7, maxDigits: 9 },
  { code: '+370', iso: 'LT', name: 'Lithuania', flag: '🇱🇹', minDigits: 8, maxDigits: 8 },
  { code: '+352', iso: 'LU', name: 'Luxembourg', flag: '🇱🇺', minDigits: 6, maxDigits: 9 },
  { code: '+261', iso: 'MG', name: 'Madagascar', flag: '🇲🇬', minDigits: 9, maxDigits: 9 },
  { code: '+265', iso: 'MW', name: 'Malawi', flag: '🇲🇼', minDigits: 9, maxDigits: 9 },
  { code: '+60', iso: 'MY', name: 'Malaysia', flag: '🇲🇾', minDigits: 9, maxDigits: 10 },
  { code: '+223', iso: 'ML', name: 'Mali', flag: '🇲🇱', minDigits: 8, maxDigits: 8 },
  { code: '+356', iso: 'MT', name: 'Malta', flag: '🇲🇹', minDigits: 8, maxDigits: 8 },
  { code: '+212', iso: 'MA', name: 'Morocco', flag: '🇲🇦', minDigits: 9, maxDigits: 9 },
  { code: '+258', iso: 'MZ', name: 'Mozambique', flag: '🇲🇿', minDigits: 9, maxDigits: 9 },
  { code: '+95', iso: 'MM', name: 'Myanmar', flag: '🇲🇲', minDigits: 8, maxDigits: 10 },
  { code: '+264', iso: 'NA', name: 'Namibia', flag: '🇳🇦', minDigits: 8, maxDigits: 9 },
  { code: '+977', iso: 'NP', name: 'Nepal', flag: '🇳🇵', minDigits: 10, maxDigits: 10 },
  { code: '+64', iso: 'NZ', name: 'New Zealand', flag: '🇳🇿', minDigits: 8, maxDigits: 10 },
  { code: '+227', iso: 'NE', name: 'Niger', flag: '🇳🇪', minDigits: 8, maxDigits: 8 },
  { code: '+47', iso: 'NO', name: 'Norway', flag: '🇳🇴', minDigits: 8, maxDigits: 8 },
  { code: '+968', iso: 'OM', name: 'Oman', flag: '🇴🇲', minDigits: 8, maxDigits: 8 },
  { code: '+92', iso: 'PK', name: 'Pakistan', flag: '🇵🇰', minDigits: 10, maxDigits: 10 },
  { code: '+507', iso: 'PA', name: 'Panama', flag: '🇵🇦', minDigits: 8, maxDigits: 8 },
  { code: '+595', iso: 'PY', name: 'Paraguay', flag: '🇵🇾', minDigits: 9, maxDigits: 9 },
  { code: '+51', iso: 'PE', name: 'Peru', flag: '🇵🇪', minDigits: 9, maxDigits: 9 },
  { code: '+63', iso: 'PH', name: 'Philippines', flag: '🇵🇭', minDigits: 10, maxDigits: 10 },
  { code: '+48', iso: 'PL', name: 'Poland', flag: '🇵🇱', minDigits: 9, maxDigits: 9 },
  { code: '+351', iso: 'PT', name: 'Portugal', flag: '🇵🇹', minDigits: 9, maxDigits: 9 },
  { code: '+974', iso: 'QA', name: 'Qatar', flag: '🇶🇦', minDigits: 8, maxDigits: 8 },
  { code: '+40', iso: 'RO', name: 'Romania', flag: '🇷🇴', minDigits: 9, maxDigits: 9 },
  { code: '+250', iso: 'RW', name: 'Rwanda', flag: '🇷🇼', minDigits: 9, maxDigits: 9 },
  { code: '+221', iso: 'SN', name: 'Senegal', flag: '🇸🇳', minDigits: 9, maxDigits: 9 },
  { code: '+381', iso: 'RS', name: 'Serbia', flag: '🇷🇸', minDigits: 8, maxDigits: 9 },
  { code: '+232', iso: 'SL', name: 'Sierra Leone', flag: '🇸🇱', minDigits: 8, maxDigits: 8 },
  { code: '+65', iso: 'SG', name: 'Singapore', flag: '🇸🇬', minDigits: 8, maxDigits: 8 },
  { code: '+421', iso: 'SK', name: 'Slovakia', flag: '🇸🇰', minDigits: 9, maxDigits: 9 },
  { code: '+386', iso: 'SI', name: 'Slovenia', flag: '🇸🇮', minDigits: 8, maxDigits: 8 },
  { code: '+252', iso: 'SO', name: 'Somalia', flag: '🇸🇴', minDigits: 7, maxDigits: 9 },
  { code: '+82', iso: 'KR', name: 'South Korea', flag: '🇰🇷', minDigits: 9, maxDigits: 10 },
  { code: '+94', iso: 'LK', name: 'Sri Lanka', flag: '🇱🇰', minDigits: 9, maxDigits: 9 },
  { code: '+249', iso: 'SD', name: 'Sudan', flag: '🇸🇩', minDigits: 9, maxDigits: 9 },
  { code: '+46', iso: 'SE', name: 'Sweden', flag: '🇸🇪', minDigits: 7, maxDigits: 10 },
  { code: '+41', iso: 'CH', name: 'Switzerland', flag: '🇨🇭', minDigits: 9, maxDigits: 9 },
  { code: '+886', iso: 'TW', name: 'Taiwan', flag: '🇹🇼', minDigits: 9, maxDigits: 9 },
  { code: '+255', iso: 'TZ', name: 'Tanzania', flag: '🇹🇿', minDigits: 9, maxDigits: 9 },
  { code: '+66', iso: 'TH', name: 'Thailand', flag: '🇹🇭', minDigits: 9, maxDigits: 9 },
  { code: '+228', iso: 'TG', name: 'Togo', flag: '🇹🇬', minDigits: 8, maxDigits: 8 },
  { code: '+216', iso: 'TN', name: 'Tunisia', flag: '🇹🇳', minDigits: 8, maxDigits: 8 },
  { code: '+90', iso: 'TR', name: 'Turkey', flag: '🇹🇷', minDigits: 10, maxDigits: 10 },
  { code: '+256', iso: 'UG', name: 'Uganda', flag: '🇺🇬', minDigits: 9, maxDigits: 9 },
  { code: '+380', iso: 'UA', name: 'Ukraine', flag: '🇺🇦', minDigits: 9, maxDigits: 9 },
  { code: '+598', iso: 'UY', name: 'Uruguay', flag: '🇺🇾', minDigits: 8, maxDigits: 8 },
  { code: '+998', iso: 'UZ', name: 'Uzbekistan', flag: '🇺🇿', minDigits: 9, maxDigits: 9 },
  { code: '+58', iso: 'VE', name: 'Venezuela', flag: '🇻🇪', minDigits: 10, maxDigits: 10 },
  { code: '+84', iso: 'VN', name: 'Vietnam', flag: '🇻🇳', minDigits: 9, maxDigits: 10 },
  { code: '+260', iso: 'ZM', name: 'Zambia', flag: '🇿🇲', minDigits: 9, maxDigits: 9 },
  { code: '+263', iso: 'ZW', name: 'Zimbabwe', flag: '🇿🇼', minDigits: 9, maxDigits: 9 },
];

const TYPO_EMAIL_DOMAINS = new Set([
  'gmal.com',
  'gmial.com',
  'gmaill.com',
  'gmai.com',
  'gmail.co',
  'gmail.con',
  'gnail.com',
  'yaho.com',
  'yahoo.co',
  'hotmal.com',
  'outlok.com',
]);

export const validateEmailInput = (rawEmail: string): { valid: boolean; clean: string; error?: string } => {
  const clean = rawEmail.trim().toLowerCase();
  if (!clean) {
    return { valid: false, clean, error: 'Please enter your email / Gmail address' };
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(clean)) {
    return { valid: false, clean, error: 'Please enter a valid email address (e.g. name@gmail.com)' };
  }
  const domain = clean.split('@')[1];
  if (TYPO_EMAIL_DOMAINS.has(domain)) {
    return { valid: false, clean, error: `Invalid email domain "${domain}". Did you mean gmail.com?` };
  }
  return { valid: true, clean };
};

export const validatePhoneWithCountry = (
  dialCode: string,
  rawLocalDigits: string
): { valid: boolean; fullNumber: string; error?: string } => {
  const country = COUNTRY_DIAL_CODES.find((c) => c.code === dialCode) || COUNTRY_DIAL_CODES[0];
  let digits = rawLocalDigits.replace(/\D/g, '');

  const codeDigits = country.code.replace(/\D/g, '');
  if (country.code === '+1' && digits.startsWith('1') && digits.length === 11) {
    digits = digits.slice(1);
  } else if (country.code !== '+1' && digits.startsWith('0') && digits.length > country.minDigits) {
    digits = digits.slice(1);
  } else if (digits.startsWith(codeDigits) && digits.length > country.maxDigits) {
    digits = digits.slice(codeDigits.length);
  }

  if (digits.length < country.minDigits || digits.length > country.maxDigits) {
    const reqText =
      country.minDigits === country.maxDigits
        ? `${country.minDigits} digits`
        : `${country.minDigits}-${country.maxDigits} digits`;
    return {
      valid: false,
      fullNumber: `${country.code}${digits}`,
      error: `Please enter a valid ${country.name} (${country.code}) phone number (${reqText})`,
    };
  }

  const fullNumber = `${country.code}${digits}`;
  return { valid: true, fullNumber };
};
