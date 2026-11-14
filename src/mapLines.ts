import type { LatLng } from './types';

/** 두 좌표 사이 대략적 거리(m). 마커 겹침·근접 판단용 — 길찾기 거리로 쓰지 않는다. */
export function roughMeters(a: LatLng, b: LatLng) {
  const dy = (a.lat - b.lat) * 111_000;
  const dx = (a.lng - b.lng) * 111_000 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dx, dy);
}

/** 학원에 있다고 보는 반경(m) */
export const AT_ACADEMY_METERS = 40;

export type ChildLine = { path: LatLng[]; kind: 'walkPath' | 'route' | 'direct' };

/**
 * 연두 선: 내 위치(휴대폰 GPS) → 픽업 장소.
 * 1) 보행자 경로 API(T map) 결과가 있으면 그 경로 (kind: route)
 * 2) 아이가 학원 근처이고 서버 walkPath(학원→픽업)가 있으면 그 경로 (kind: walkPath)
 * 3) 그 밖에는 직선 (kind: direct) — 지도에서 점선으로 그려 실제 경로가 아님을 구분
 * 내 위치를 모르면 walkPath만 있으면 그것을, 없으면 그리지 않는다.
 */
export function childLine(
  child: LatLng | null,
  pickup: LatLng | null,
  academy: LatLng | null,
  walkPath: LatLng[] | null,
  route: LatLng[] | null = null,
): ChildLine | null {
  const hasWalk = !!walkPath && walkPath.length > 1;
  if (!pickup) return null;
  if (!child) return hasWalk ? { path: walkPath, kind: 'walkPath' } : null;
  if (route && route.length > 1) return { path: route, kind: 'route' };
  if (hasWalk && academy && roughMeters(child, academy) <= AT_ACADEMY_METERS)
    return { path: walkPath, kind: 'walkPath' };
  return { path: [child, pickup], kind: 'direct' };
}

/** 흰 선: 차 현재 위치 → 픽업 장소 (차 위치가 최신일 때만) */
export function vehicleLine(vehicle: LatLng | null, pickup: LatLng | null): LatLng[] | null {
  return vehicle && pickup ? [vehicle, pickup] : null;
}
