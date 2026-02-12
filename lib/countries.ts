export const countries = [
  { code: 'US', dialCode: '+1', name: 'United States', flag: '🇺🇸', phoneDigits: 10 },
  { code: 'IN', dialCode: '+91', name: 'India', flag: '🇮🇳', phoneDigits: 10 },
  { code: 'GB', dialCode: '+44', name: 'United Kingdom', flag: '🇬🇧', phoneDigits: 10 },
  { code: 'CA', dialCode: '+1', name: 'Canada', flag: '🇨🇦', phoneDigits: 10 },
  { code: 'AU', dialCode: '+61', name: 'Australia', flag: '🇦🇺', phoneDigits: 9 },
  { code: 'DE', dialCode: '+49', name: 'Germany', flag: '🇩🇪', phoneDigits: 11 },
  { code: 'FR', dialCode: '+33', name: 'France', flag: '🇫🇷', phoneDigits: 9 },
  { code: 'JP', dialCode: '+81', name: 'Japan', flag: '🇯🇵', phoneDigits: 10 },
  { code: 'CN', dialCode: '+86', name: 'China', flag: '🇨🇳', phoneDigits: 11 },
  { code: 'BR', dialCode: '+55', name: 'Brazil', flag: '🇧🇷', phoneDigits: 11 },
  { code: 'MX', dialCode: '+52', name: 'Mexico', flag: '🇲🇽', phoneDigits: 10 },
  { code: 'ES', dialCode: '+34', name: 'Spain', flag: '🇪🇸', phoneDigits: 9 },
  { code: 'IT', dialCode: '+39', name: 'Italy', flag: '🇮🇹', phoneDigits: 10 },
  { code: 'NL', dialCode: '+31', name: 'Netherlands', flag: '🇳🇱', phoneDigits: 9 },
  { code: 'SE', dialCode: '+46', name: 'Sweden', flag: '🇸🇪', phoneDigits: 9 },
  { code: 'NO', dialCode: '+47', name: 'Norway', flag: '🇳🇴', phoneDigits: 8 },
  { code: 'DK', dialCode: '+45', name: 'Denmark', flag: '🇩🇰', phoneDigits: 8 },
  { code: 'FI', dialCode: '+358', name: 'Finland', flag: '🇫🇮', phoneDigits: 10 },
  { code: 'PL', dialCode: '+48', name: 'Poland', flag: '🇵🇱', phoneDigits: 9 },
  { code: 'BE', dialCode: '+32', name: 'Belgium', flag: '🇧🇪', phoneDigits: 9 },
  { code: 'CH', dialCode: '+41', name: 'Switzerland', flag: '🇨🇭', phoneDigits: 9 },
  { code: 'AT', dialCode: '+43', name: 'Austria', flag: '🇦🇹', phoneDigits: 13 },
  { code: 'SG', dialCode: '+65', name: 'Singapore', flag: '🇸🇬', phoneDigits: 8 },
  { code: 'NZ', dialCode: '+64', name: 'New Zealand', flag: '🇳🇿', phoneDigits: 9 },
  { code: 'ZA', dialCode: '+27', name: 'South Africa', flag: '🇿🇦', phoneDigits: 9 },
  { code: 'AE', dialCode: '+971', name: 'United Arab Emirates', flag: '🇦🇪', phoneDigits: 9 },
  { code: 'SA', dialCode: '+966', name: 'Saudi Arabia', flag: '🇸🇦', phoneDigits: 9 },
  { code: 'IL', dialCode: '+972', name: 'Israel', flag: '🇮🇱', phoneDigits: 9 },
  { code: 'KR', dialCode: '+82', name: 'South Korea', flag: '🇰🇷', phoneDigits: 10 },
  { code: 'RU', dialCode: '+7', name: 'Russia', flag: '🇷🇺', phoneDigits: 10 },
];

export type Country = typeof countries[0];

export const DEFAULT_PHONE_DIGITS = 10;

export function getPhoneDigitsForCountry(countryCode: string): number {
  const c = countries.find((x) => x.code === countryCode);
  return (c as { phoneDigits?: number } | undefined)?.phoneDigits ?? DEFAULT_PHONE_DIGITS;
}
