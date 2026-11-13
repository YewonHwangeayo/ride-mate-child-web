import { ApiError } from '../api';

const BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const TIMEOUT_MS = 15_000;

/** DetailQrLogin / AddWebSession 응답 (WebQrLoginDto) */
export type WebQrLogin = {
  qrState: 'SCANNED' | 'VERIFIED' | 'APPROVED' | 'CANCELED' | 'EXPIRED' | 'USED' | 'NOT_FOUND' | string | null;
  signedIn: boolean;
  signupRequired: boolean;
  userName?: string | null;
  maskedPhone?: string | null;
  matchCode?: string | null;
  expiresIn?: number | null;
  remainingAttempts?: number | null;
  retryAfter?: number | null;
  cancelReason?: string | null;
  error?: string | null;
  // webSessionToken 은 쿠키로 대체되므로 읽거나 저장하지 않는다.
};
export type PhoneVerification = { expiresIn: number; retryAfter: number };
export type Envelope<T> = { message: string; code: number; data: T };

/** 인증 API는 웹 세션 쿠키(__Host-rm_web_session)를 쓰므로 credentials: 'include' */
async function call<T>(path: string, init: RequestInit = {}): Promise<Envelope<T>> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body) headers.set('Content-Type', 'application/json');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(BASE + path, {
      ...init,
      headers,
      credentials: 'include',
      cache: 'no-store',
      signal: controller.signal,
    });
    if (res.status === 429) {
      const ra = Number(res.headers.get('Retry-After'));
      throw new ApiError(
        429,
        undefined,
        '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.',
        Number.isFinite(ra) ? ra : null,
      );
    }
    const body = (await res.json().catch(() => null)) as Envelope<T> | null;
    if (!res.ok) {
      const err = new ApiError(res.status, body?.code, body?.message || `요청 실패 (${res.status})`);
      (err as ApiError & { data?: unknown }).data = body?.data;
      throw err;
    }
    return body as Envelope<T>;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new ApiError(0, 'TIMEOUT', '요청 시간이 초과됐어요. 다시 시도해 주세요.');
    }
    throw new ApiError(0, 'NETWORK', '연결 상태를 확인하고 다시 시도해 주세요.');
  } finally {
    clearTimeout(timer);
  }
}

export function errorData<T = WebQrLogin>(e: unknown): T | undefined {
  return (e as { data?: T } | null)?.data;
}

export const authApi = {
  detail: (userCode: string) =>
    call<WebQrLogin>(`/api/v1/Auth/W/DetailQrLogin?userCode=${encodeURIComponent(userCode)}`),
  sendCode: (phone: string) =>
    call<PhoneVerification>('/api/v1/Auth/W/AddPhoneVerification', { method: 'POST', body: JSON.stringify({ phone }) }),
  signIn: (body: {
    phone: string;
    code: string;
    userCode: string;
    userName?: string;
    agreeTerms?: boolean;
    agreePrivacy?: boolean;
  }) => call<WebQrLogin>('/api/v1/Auth/W/AddWebSession', { method: 'POST', body: JSON.stringify(body) }),
  approve: (userCode: string) =>
    call<WebQrLogin>('/api/v1/Auth/W/sign/AddQrApproval', { method: 'POST', body: JSON.stringify({ userCode }) }),
  cancel: (userCode: string) =>
    call<WebQrLogin>('/api/v1/Auth/W/sign/DeleteQrLogin', { method: 'DELETE', body: JSON.stringify({ userCode }) }),
  switchAccount: (userCode: string) =>
    call<WebQrLogin>('/api/v1/Auth/W/sign/DeleteWebSession', { method: 'DELETE', body: JSON.stringify({ userCode }) }),
};
