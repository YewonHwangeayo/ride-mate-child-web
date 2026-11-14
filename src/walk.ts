import { roughMeters } from './mapLines';
import type { LatLng } from './types';

/** 이동 동선(브레드크럼) 기록 규칙 — 휴대폰 메모리에만 보관, 서버로 보내지 않는다 */
export const TRAIL_MIN_STEP_M = 5;
export const TRAIL_MAX_ACCURACY_M = 50;
export const TRAIL_MAX_POINTS = 300;

export function appendTrail(trail: LatLng[], next: LatLng, accuracy: number | null): LatLng[] {
  if (accuracy !== null && accuracy > TRAIL_MAX_ACCURACY_M) return trail;
  const last = trail[trail.length - 1];
  if (last && roughMeters(last, next) < TRAIL_MIN_STEP_M) return trail;
  const out = [...trail, { lat: next.lat, lng: next.lng }];
  return out.length > TRAIL_MAX_POINTS ? out.slice(out.length - TRAIL_MAX_POINTS) : out;
}

/** 보행 경로 재요청 규칙: 처음, 픽업 장소 변경, 30m 이상 이동 — 단 10초에 한 번까지 */
export const ROUTE_MOVE_M = 30;
export const ROUTE_MIN_INTERVAL_MS = 10_000;

export function shouldRefetchRoute(
  last: { origin: LatLng; dest: LatLng; at: number } | null,
  child: LatLng,
  dest: LatLng,
  now: number,
): boolean {
  if (!last) return true;
  // 픽업 장소가 바뀌면 간격 제한 없이 바로 다시 계산 (옛 장소로 가는 경로를 남기지 않음)
  if (roughMeters(last.dest, dest) > 10) return true;
  if (now - last.at < ROUTE_MIN_INTERVAL_MS) return false;
  return roughMeters(last.origin, child) >= ROUTE_MOVE_M;
}

/** 경로 앞부분을 현재 위치로 이어 붙여 선이 내 핀에서 시작하게 한다 */
export function routeFromHere(child: LatLng, route: LatLng[]): LatLng[] {
  return route.length ? [child, ...route] : [];
}

export function formatWalk(distance: number | null, time: number | null) {
  if (distance === null && time === null) return '';
  const parts: string[] = [];
  if (time !== null) parts.push(`도보 ${Math.max(1, Math.round(time / 60))}분`);
  if (distance !== null)
    parts.push(distance >= 1000 ? `${(distance / 1000).toFixed(1)}km` : `${Math.round(distance)}m`);
  return parts.join(' · ');
}
