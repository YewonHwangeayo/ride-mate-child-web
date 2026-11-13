/** 숫자만 남긴 휴대폰 번호 (최대 11자리) */
export function digitsOnly(value: string) {
  return value.replace(/\D/g, '').slice(0, 11);
}

/** 010-1234-5678 형식으로 표시 */
export function formatPhone(value: string) {
  const d = digitsOnly(value);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

/** 서버 검증 규칙과 동일: ^01[016789][0-9]{7,8}$ */
export function isValidPhone(value: string) {
  return /^01[016789][0-9]{7,8}$/.test(digitsOnly(value));
}

/** 010-****-5678 */
export function maskPhone(value: string) {
  const d = digitsOnly(value);
  if (d.length < 10) return formatPhone(d);
  return `${d.slice(0, 3)}-****-${d.slice(-4)}`;
}

/** 남은 초 → m:ss */
export function mmss(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
