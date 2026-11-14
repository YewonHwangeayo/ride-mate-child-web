import type { WebQrLogin } from './authApi';

/** DetailQrLogin·AddWebSession 등 404/409 의 qrState → 안내 문구 */
export function qrErrorText(info: WebQrLogin | undefined, status: number) {
  const state = info?.qrState;
  if (status === 404 || state === 'NOT_FOUND') return 'QR 정보를 찾을 수 없어요.';
  if (state === 'EXPIRED') return 'QR 유효 시간이 지났어요.';
  if (state === 'CANCELED') {
    if (info?.cancelReason === 'PHONE') return '휴대폰에서 로그인을 취소했어요.';
    if (info?.cancelReason === 'DRIVING') return '차가 출발해서 로그인이 취소됐어요.';
    return '차 화면에서 로그인을 취소했어요.';
  }
  if (state === 'APPROVED' || state === 'USED') return '이미 로그인에 사용된 QR이에요.';
  return 'QR 로그인을 이어갈 수 없어요.';
}

/** AddWebSession 400 응답의 data.error → 안내 문구 */
export function otpErrorText(data: WebQrLogin | undefined): string {
  switch (data?.error) {
    case 'otp_mismatch':
      return `인증번호가 맞지 않아요.${data.remainingAttempts != null ? ` (남은 횟수 ${data.remainingAttempts}번)` : ''}`;
    case 'otp_expired':
      return '인증번호 유효 시간이 지났어요. 다시 받아 주세요.';
    case 'otp_locked':
      return `인증번호를 여러 번 틀려 잠겼어요.${data.retryAfter ? ` ${Math.ceil(data.retryAfter / 60)}분 뒤 다시 시도해 주세요.` : ''}`;
    case 'otp_not_requested':
      return '인증번호를 다시 받아 주세요.';
    case 'terms_required':
      return '필수 약관에 모두 동의해 주세요.';
    default:
      return '입력한 정보를 다시 확인해 주세요.';
  }
}
