import { useEffect, useState } from 'react';
import type { LatLng } from './types';

export function useGeolocation(enabled = true) {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setPosition(null);
      return;
    }
    if (!('geolocation' in navigator)) {
      setError('위치 정보를 지원하지 않는 브라우저입니다.');
      return;
    }
    let watch: number | undefined;
    const start = () => {
      if (document.visibilityState === 'hidden' || watch !== undefined) return;
      watch = navigator.geolocation.watchPosition(
        (p) => {
          setPosition({ lat: p.coords.latitude, lng: p.coords.longitude });
          setAccuracy(Number.isFinite(p.coords.accuracy) ? p.coords.accuracy : null);
          setError(null);
        },
        (e) => setError(e.code === 1 ? '위치 권한이 꺼져 있어요.' : '현재 위치를 확인하지 못했어요.'),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 },
      );
    };
    const stop = () => {
      if (watch !== undefined) {
        navigator.geolocation.clearWatch(watch);
        watch = undefined;
      }
    };
    const onVisibility = () => {
      stop();
      start();
    };
    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled]);

  return { position, accuracy, error };
}
