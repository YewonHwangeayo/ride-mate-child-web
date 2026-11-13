import type { LatLng } from './types';

/** 두 좌표 사이 대략적 거리(m). 마커 겹침·근접 판단용 — 길찾기 거리로 쓰지 않는다. */
export function roughMeters(a: LatLng, b: LatLng) {
  const dy = (a.lat - b.lat) * 111_000;
  const dx = (a.lng - b.lng) * 111_000 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dx, dy);
}

/** 학원에 있다고 보는 반경(m) */
export const AT_ACADEMY_METERS = 40;

/**
 * 연두 선: 내 위치(휴대폰 GPS) → 픽업 장소.
 * - 아이가 학원 근처이고 서버 walkPath(학원→픽업)가 있으면 그 경로를 쓴다.
 * - 그 밖에는 내 위치에서 픽업 장소까지 직선으로 잇는다(실제 도보 경로 아님).
 * - 내 위치를 모르면 walkPath만 있으면 그것을, 없으면 그리지 않는다.
 */
export function childLine(
  child: LatLng | null,
  pickup: LatLng | null,
  academy: LatLng | null,
  walkPath: LatLng[] | null,
): LatLng[] | null {
  const hasWalk = !!walkPath && walkPath.length > 1;
  if (!pickup) return null;
  if (!child) return hasWalk ? walkPath : null;
  if (hasWalk && academy && roughMeters(child, academy) <= AT_ACADEMY_METERS) return walkPath;
  return [child, pickup];
}

/** 흰 선: 차 현재 위치 → 픽업 장소 (차 위치가 최신일 때만) */
export function vehicleLine(vehicle: LatLng | null, pickup: LatLng | null): LatLng[] | null {
  return vehicle && pickup ? [vehicle, pickup] : null;
}
