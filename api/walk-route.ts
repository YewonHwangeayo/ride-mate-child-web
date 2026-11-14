/**
 * 보행자 경로 프록시 (T map 보행자 경로 API)
 *  - Vercel 서버리스 함수: POST /api/walk-route
 *  - 개발 서버(vite.config.ts)도 같은 handleWalkRoute 를 미들웨어로 사용
 *
 * T map appKey 는 서버 환경 변수 TMAP_APP_KEY 에만 둔다 (브라우저 번들에 넣지 않음).
 * 아이 좌표는 경로 계산에만 쓰고 저장·로그하지 않는다.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

type Pt = { lat: number; lng: number };
export type WalkRoute = { path: Pt[]; distance: number | null; time: number | null };

const TMAP_URL = 'https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1';
const MAX_METERS = 10_000;

function isPt(v: unknown): v is Pt {
  const p = v as Pt;
  return (
    !!p &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    p.lat > 32 &&
    p.lat < 39.5 && // 대한민국 범위
    p.lng > 124 &&
    p.lng < 132.5
  );
}

function meters(a: Pt, b: Pt) {
  const dy = (a.lat - b.lat) * 111_000;
  const dx = (a.lng - b.lng) * 111_000 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dx, dy);
}

/** T map GeoJSON 응답 → 좌표 배열 */
export function parseTmap(json: any): WalkRoute {
  const features: any[] = Array.isArray(json?.features) ? json.features : [];
  const path: Pt[] = [];
  for (const f of features) {
    if (f?.geometry?.type !== 'LineString') continue;
    for (const [lng, lat] of f.geometry.coordinates as [number, number][]) {
      const last = path[path.length - 1];
      if (!last || last.lat !== lat || last.lng !== lng) path.push({ lat, lng });
    }
  }
  const props = features[0]?.properties ?? {};
  return {
    path,
    distance: Number.isFinite(props.totalDistance) ? props.totalDistance : null,
    time: Number.isFinite(props.totalTime) ? props.totalTime : null,
  };
}

export async function fetchPedestrianRoute(appKey: string, start: Pt, end: Pt): Promise<WalkRoute> {
  const res = await fetch(TMAP_URL, {
    method: 'POST',
    headers: { appKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      startX: start.lng,
      startY: start.lat,
      endX: end.lng,
      endY: end.lat,
      startName: 'start',
      endName: 'pickup',
      reqCoordType: 'WGS84GEO',
      resCoordType: 'WGS84GEO',
      searchOption: '0',
    }),
  });
  if (!res.ok) throw Object.assign(new Error(`tmap ${res.status}`), { status: res.status });
  return parseTmap(await res.json());
}

async function readJson(req: IncomingMessage & { body?: unknown }) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export async function handleWalkRoute(req: IncomingMessage, res: ServerResponse, appKey: string | undefined) {
  if (req.method !== 'POST') return send(res, 405, { error: 'METHOD' });
  if (!appKey) return send(res, 503, { error: 'NO_KEY' });
  let body: any;
  try {
    body = await readJson(req);
  } catch {
    return send(res, 400, { error: 'BAD_JSON' });
  }
  const { start, end } = body ?? {};
  if (!isPt(start) || !isPt(end)) return send(res, 400, { error: 'BAD_POINT' });
  if (meters(start, end) > MAX_METERS) return send(res, 422, { error: 'TOO_FAR' });
  try {
    return send(res, 200, await fetchPedestrianRoute(appKey, start, end));
  } catch (e) {
    const status = (e as { status?: number }).status;
    return send(res, status === 429 ? 429 : 502, { error: 'UPSTREAM' });
  }
}

/** Vercel Node 함수 엔트리 */
export default function handler(req: IncomingMessage, res: ServerResponse) {
  return handleWalkRoute(req, res, process.env.TMAP_APP_KEY);
}
