/** QR 주소에서 userCode 추출: ?code= / ?userCode= / ?user_code= / /qr/<code> 모두 허용 */
export function readUserCode(pathname: string, search: string) {
  const q = new URLSearchParams(search);
  const raw = q.get('code') ?? q.get('userCode') ?? q.get('user_code') ?? pathname.match(/^\/qr\/([^/]+)/)?.[1] ?? '';
  return decodeURIComponent(raw).trim().replace(/^<|>$/g, '');
}
