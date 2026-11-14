import { useEffect, useRef, useState } from 'react';
import { appendTrail, shouldRefetchRoute } from './walk';
import type { LatLng } from './types';

/** 휴대폰 GPS 이동 동선 (메모리에만 보관) */
export function useWalkTrail(position: LatLng | null, accuracy: number | null, active: boolean) {
  const [trail, setTrail] = useState<LatLng[]>([]);
  useEffect(() => {
    if (!active) setTrail([]);
  }, [active]);
  useEffect(() => {
    if (active && position) setTrail((t) => appendTrail(t, position, accuracy));
  }, [active, position, accuracy]);
  return trail;
}

export type WalkRouteState = {
  path: LatLng[] | null;
  distance: number | null;
  time: number | null;
  /** 'tmap' = 실제 보행 경로, 'unavailable' = 키 없음/오류 → 직선 표시 */
  status: 'idle' | 'loading' | 'tmap' | 'unavailable';
};

/** 내 위치 → 픽업 장소 보행자 경로 (T map, /api/walk-route 경유) */
export function useWalkRoute(child: LatLng | null, dest: LatLng | null, enabled: boolean): WalkRouteState {
  const [state, setState] = useState<WalkRouteState>({ path: null, distance: null, time: null, status: 'idle' });
  const last = useRef<{ origin: LatLng; dest: LatLng; at: number } | null>(null);
  const disabledUntil = useRef(0);
  const inflight = useRef<AbortController | null>(null);

  useEffect(() => () => inflight.current?.abort(), []);

  useEffect(() => {
    if (!enabled || !child || !dest) return;
    const now = Date.now();
    if (now < disabledUntil.current) return;
    if (!shouldRefetchRoute(last.current, child, dest, now)) return;
    // 목적지가 바뀌었으면 옛 경로를 먼저 지운다
    if (last.current && (last.current.dest.lat !== dest.lat || last.current.dest.lng !== dest.lng)) {
      setState({ path: null, distance: null, time: null, status: 'loading' });
    }
    last.current = { origin: child, dest, at: now };
    inflight.current?.abort();
    const ac = new AbortController();
    inflight.current = ac;
    setState((s) => ({ ...s, status: s.path ? s.status : 'loading' }));
    fetch('/api/walk-route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start: child, end: dest }),
      signal: ac.signal,
      cache: 'no-store',
    })
      .then(async (res) => {
        if (!res.ok) {
          // 키 없음(503)·범위 밖(422)은 1분 동안 재시도하지 않는다
          if (res.status === 503 || res.status === 422 || res.status === 429)
            disabledUntil.current = Date.now() + 60_000;
          throw new Error(String(res.status));
        }
        const data = (await res.json()) as { path: LatLng[]; distance: number | null; time: number | null };
        if (!data.path?.length) throw new Error('empty');
        setState({ path: data.path, distance: data.distance, time: data.time, status: 'tmap' });
      })
      .catch((e) => {
        if (ac.signal.aborted) return;
        void e;
        // 일시 오류(502·네트워크)는 15초 뒤 같은 위치에서도 다시 시도. 503/422/429 는 위에서 1분으로 설정됨
        if (disabledUntil.current < Date.now()) disabledUntil.current = Date.now() + 15_000;
        last.current = null;
        // 이미 받은 경로가 있으면 유지하고, 처음부터 실패하면 점선 직선으로 표시
        setState((s) => (s.path ? s : { path: null, distance: null, time: null, status: 'unavailable' }));
      });
  }, [enabled, child, dest]);

  useEffect(() => {
    if (!enabled) {
      last.current = null;
      setState({ path: null, distance: null, time: null, status: 'idle' });
    }
  }, [enabled]);

  return state;
}
