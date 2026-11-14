import { describe, expect, it } from 'vitest';
import { otpErrorText, qrErrorText } from './authErrors';

describe('auth error messages (API 명세 기준)', () => {
  it('maps QR states and cancel reasons', () => {
    expect(qrErrorText({ qrState: 'NOT_FOUND', signedIn: false, signupRequired: false }, 404)).toBe(
      'QR 정보를 찾을 수 없어요.',
    );
    expect(qrErrorText({ qrState: 'USED', signedIn: false, signupRequired: false }, 409)).toBe(
      '이미 로그인에 사용된 QR이에요.',
    );
    expect(qrErrorText({ qrState: 'EXPIRED', signedIn: false, signupRequired: false }, 409)).toBe(
      'QR 유효 시간이 지났어요.',
    );
    expect(
      qrErrorText({ qrState: 'CANCELED', cancelReason: 'DRIVING', signedIn: false, signupRequired: false }, 409),
    ).toBe('차가 출발해서 로그인이 취소됐어요.');
  });
  it('maps AddWebSession 400 error codes', () => {
    const base = { signedIn: false, signupRequired: false, qrState: null };
    expect(otpErrorText({ ...base, error: 'otp_mismatch', remainingAttempts: 4 })).toBe(
      '인증번호가 맞지 않아요. (남은 횟수 4번)',
    );
    expect(otpErrorText({ ...base, error: 'otp_expired' })).toBe('인증번호 유효 시간이 지났어요. 다시 받아 주세요.');
    expect(otpErrorText({ ...base, error: 'otp_locked', retryAfter: 540 })).toBe(
      '인증번호를 여러 번 틀려 잠겼어요. 9분 뒤 다시 시도해 주세요.',
    );
    expect(otpErrorText({ ...base, error: 'terms_required' })).toBe('필수 약관에 모두 동의해 주세요.');
  });
});
