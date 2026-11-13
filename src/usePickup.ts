import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, pickupApi } from './api';
import { consumeSse } from './sse';
import { parseKst } from './time';
import type { LatLng, Pickup, Snapshot } from './types';

const openedTokens = new Set<string>();
const openingTokens = new Set<string>();

export function pickupQueryKey(token: string) {
  return ['child-pickup', token] as const;
}

export function useServerNow(serverDt: string | undefined) {
  const [now, setNow] = useState(Date.now());
  const [origin, setOrigin] = useState(() => ({ server: Date.now(), perf: performance.now() }));
  useEffect(() => {
    const parsed = parseKst(serverDt);
    if (parsed !== null) setOrigin({ server: parsed, perf: performance.now() });
  }, [serverDt]);
  useEffect(() => {
    const tick = () => setNow(origin.server + performance.now() - origin.perf);
    tick();
    const id = setInterval(tick, 1000);
    const onVisible = () => tick();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [origin]);
  return now;
}

function coordsOf(pickup: Pickup['pickup']): LatLng | null {
  return pickup ? { lat: pickup.lat, lng: pickup.lng } : null;
}

function moved(a: LatLng | null, b: Pickup['pickup']) {
  return !!a && !!b && (a.lat !== b.lat || a.lng !== b.lng);
}

function withoutChange(snapshot: Snapshot): Pickup {
  const { change: _change, ...next } = snapshot;
  return next;
}

export function usePickup(token: string) {
  const qc = useQueryClient();
  const key = useMemo(() => pickupQueryKey(token), [token]);
  const query = useQuery({
    queryKey: key,
    queryFn: async () => (await pickupApi.detail(token)).data,
    enabled: !!token,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    retry: 1,
  });
  const [previous, setPrevious] = useState<LatLng | null>(null);
  const [placeChanged, setPlaceChanged] = useState(false);
  const [connected, setConnected] = useState(false);
  const [unstable, setUnstable] = useState(false);
  const lastPickup = useRef<LatLng | null>(null);

  useEffect(() => {
    lastPickup.current = null;
    setPrevious(null);
    setPlaceChanged(false);
  }, [token]);

  useEffect(() => {
    if (query.data?.pickup && !lastPickup.current) lastPickup.current = coordsOf(query.data.pickup);
  }, [query.data?.pickup]);

  useEffect(() => {
    if (!token || query.data?.linkStatus !== 'ACTIVE') return;
    if (openedTokens.has(token) || openingTokens.has(token)) return;
    openingTokens.add(token);
    pickupApi
      .open(token)
      .then(() => openedTokens.add(token))
      .catch(() => {
        openingTokens.delete(token);
      });
  }, [query.data?.linkStatus, token]);

  useEffect(() => {
    if (!token) return;
    let stopped = false;
    let controller: AbortController | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let poll: ReturnType<typeof setInterval> | undefined;
    let failures = 0;

    const clearPoll = () => {
      if (poll) clearInterval(poll);
      poll = undefined;
    };

    const apply = (snapshot: Snapshot) => {
      const next = withoutChange(snapshot);
      const old = lastPickup.current;
      const placeMoved = moved(old, next.pickup);
      if (snapshot.change !== null && snapshot.change !== undefined && placeMoved && old) {
        setPrevious(old);
        setPlaceChanged(true);
      }
      if (next.pickup) lastPickup.current = coordsOf(next.pickup);
      qc.setQueryData(key, next);
      if (next.linkStatus !== 'ACTIVE') {
        stopped = true;
        controller?.abort();
      }
    };

    const run = async () => {
      if (stopped || document.visibilityState === 'hidden') return;
      controller = new AbortController();
      try {
        await consumeSse(token, controller.signal, (event) => {
          failures = 0;
          setConnected(true);
          setUnstable(false);
          clearPoll();
          if (event.type === 'snapshot') apply(event.data);
          else {
            qc.setQueryData<Pickup>(key, (old) => {
              if (!old) return old;
              const vehicle =
                event.data.lat === null || event.data.lng === null || !event.data.reportedDt
                  ? null
                  : { lat: event.data.lat, lng: event.data.lng, reportedDt: event.data.reportedDt };
              return {
                ...old,
                serverDt: event.data.serverDt,
                arrivalDt: event.data.arrivalDt,
                arrivalSource: event.data.arrivalSource,
                vehicle,
              };
            });
          }
        });
        if (!stopped) throw new Error('SSE 연결 종료');
      } catch (error) {
        if (stopped || controller.signal.aborted) return;
        failures += 1;
        setConnected(false);
        if (error instanceof ApiError && [404, 409].includes(error.status)) {
          stopped = true;
          qc.invalidateQueries({ queryKey: key });
          return;
        }
        if (failures >= 3) {
          setUnstable(true);
          if (!poll) poll = setInterval(() => qc.invalidateQueries({ queryKey: key }), 15_000);
        }
        const wait =
          error instanceof ApiError && error.retryAfter
            ? Math.max(error.retryAfter * 1000, 3000)
            : Math.max(1000, Math.min(3000, failures * 1000));
        timer = setTimeout(run, wait);
      }
    };

    const onVisibility = () => {
      controller?.abort();
      if (timer) clearTimeout(timer);
      if (document.visibilityState === 'visible') {
        failures = 0;
        qc.invalidateQueries({ queryKey: key });
        timer = setTimeout(run, 250);
      } else setConnected(false);
    };

    document.addEventListener('visibilitychange', onVisibility);
    run();
    return () => {
      stopped = true;
      controller?.abort();
      if (timer) clearTimeout(timer);
      clearPoll();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [token, qc, key]);

  return {
    ...query,
    connected,
    unstable,
    previous,
    placeChanged,
    acknowledgePlaceChange: () => setPlaceChanged(false),
  };
}
