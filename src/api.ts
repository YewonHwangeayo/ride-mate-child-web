import type { Envelope, Leave, Pickup } from './types';

const BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: number | string | undefined,
    message: string,
    public retryAfter: number | null = null,
  ) {
    super(message);
  }
}

function retryAfterOf(res: Response) {
  const raw = res.headers.get('Retry-After');
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) ? value : null;
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('X-Pickup-Token', token);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onAbort);
  try {
    const res = await fetch(BASE + path, { ...options, headers, cache: 'no-store', signal: controller.signal });
    if (res.status === 429) {
      throw new ApiError(429, undefined, '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.', retryAfterOf(res));
    }
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new ApiError(
        res.status,
        body?.data?.reason ?? body?.code,
        body?.message || body?.title || `요청 실패 (${res.status})`,
        retryAfterOf(res),
      );
    }
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(0, 'TIMEOUT', '요청 시간이 초과됐어요. 다시 시도해 주세요.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onAbort);
  }
}

export const pickupApi = {
  detail: (token: string) => request<Envelope<Pickup>>('/api/v1/Pickup/W/DetailChildPickup', {}, token),
  open: (token: string) => request<Envelope<{ reason: null; openedDt: string }>>('/api/v1/Pickup/W/AddPickupLinkOpen', { method: 'POST' }, token),
  leave: (token: string, body: { leaveNow: true } | { leaveDt: string }) =>
    request<Envelope<Leave>>('/api/v1/Pickup/W/AddChildLeave', { method: 'POST', body: JSON.stringify(body) }, token),
  cancel: (token: string) => request<Envelope<Leave>>('/api/v1/Pickup/W/DeleteChildLeave', { method: 'DELETE' }, token),
};

export const API_BASE = BASE;
