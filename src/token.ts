const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function isPickupToken(value: string | null | undefined): boolean {
  return !!value && TOKEN_PATTERN.test(value);
}

export function extractToken(pathname: string, search: string): string {
  const query = new URLSearchParams(search).get('token');
  if (isPickupToken(query)) return query as string;
  const last = pathname.split('/').filter(Boolean).at(-1) || '';
  return isPickupToken(last) ? last : '';
}

export function pickupPath(token: string) {
  return `/pickup?token=${encodeURIComponent(token)}`;
}

export function leavePath(token: string) {
  return `/leave?token=${encodeURIComponent(token)}`;
}
