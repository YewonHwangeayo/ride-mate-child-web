import { useEffect, useRef, useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { loadKakao } from './kakao';
import { AT_ACADEMY_METERS, childLine, roughMeters, vehicleLine } from './mapLines';
import type { LatLng, Pickup } from './types';

type MarkerKey = 'vehicle' | 'child' | 'pickup' | 'previous' | 'academy';

// 디자인(도착예정.png 등)의 핀을 SVG로 재현. 이미지 파일은 사용하지 않는다.
const PIN_PATH = 'M20 2C10.6 2 3 9.4 3 18.6 3 30.4 20 46 20 46s17-15.6 17-27.4C37 9.4 29.4 2 20 2z';
const SVG = {
  pickup: `<svg width="40" height="48" viewBox="0 0 40 48" aria-hidden="true"><path d="${PIN_PATH}" fill="#d4f53c" stroke="#fff" stroke-width="3"/><circle cx="20" cy="18.5" r="5.5" fill="#fff"/></svg>`,
  previous: `<svg width="40" height="48" viewBox="0 0 40 48" aria-hidden="true"><path d="${PIN_PATH}" fill="#76787d" stroke="#a4a6ab" stroke-width="3"/><circle cx="20" cy="18.5" r="5.5" fill="#3a3b40"/></svg>`,
  vehicle: `<span class="pin-car"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1b1d20" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 17h14v-5l-2-5H7l-2 5z" fill="#1b1d20"/><path d="M3 12h18"/><circle cx="7.5" cy="17.5" r="1.6" fill="#1b1d20"/><circle cx="16.5" cy="17.5" r="1.6" fill="#1b1d20"/><path d="M8 10h8" stroke="#fff" stroke-width="1.6"/></svg></span>`,
  child: `<span class="pin-me"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4.5 20.3l.7.7L12 18l6.8 3 .7-.7z" fill="#17191a"/></svg></span>`,
};

const ANCHOR: Record<MarkerKey, { x: number; y: number; z: number }> = {
  pickup: { x: 0.5, y: 1, z: 6 },
  previous: { x: 0.5, y: 1, z: 4 },
  vehicle: { x: 0.5, y: 0.5, z: 5 },
  child: { x: 0.5, y: 0.5, z: 7 },
  academy: { x: 0.5, y: 0.5, z: 2 },
};

const ARIA: Record<MarkerKey, string> = {
  pickup: '픽업 장소',
  previous: '이전 픽업 장소',
  vehicle: '차 위치',
  child: '내 위치',
  academy: '학원',
};

function markerNode(key: MarkerKey) {
  const wrap = document.createElement('div');
  wrap.className = `pin pin-${key}`;
  wrap.setAttribute('role', 'img');
  wrap.setAttribute('aria-label', ARIA[key]);
  if (key === 'academy') wrap.innerHTML = '<span class="pin-academy">학원</span>';
  else wrap.innerHTML = SVG[key];
  return wrap;
}

function labelNode(text: string, kind: 'old' | 'new') {
  const el = document.createElement('div');
  el.className = kind === 'old' ? 'map-label old-label' : 'map-label new-label';
  el.textContent = text;
  return el;
}

export function PickupMap({
  pickup,
  child,
  previous,
  showLabels = false,
}: {
  pickup: Pickup;
  child: LatLng | null;
  previous: LatLng | null;
  showLabels?: boolean;
}) {
  const node = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const overlays = useRef<Record<string, any>>({});
  const lines = useRef<{ child?: any; vehicle?: any }>({});
  const dragging = useRef(false);
  const fitted = useRef(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadKakao()
      .then((k) => {
        if (cancelled || !node.current) return;
        const origin = pickup.pickup || pickup.academy || { lat: 37.498, lng: 127.061 };
        map.current = new k.maps.Map(node.current, {
          center: new k.maps.LatLng(origin.lat, origin.lng),
          level: 3,
        });
        k.maps.event.addListener(map.current, 'dragstart', () => {
          dragging.current = true;
        });
        k.maps.event.addListener(map.current, 'dragend', () => {
          dragging.current = false;
        });
        setReady(true);
      })
      .catch((e: Error) => setError(e.message));
    return () => {
      cancelled = true;
      Object.values(overlays.current).forEach((o) => o.setMap(null));
      overlays.current = {};
      lines.current.child?.setMap(null);
      lines.current.vehicle?.setMap(null);
      lines.current = {};
      map.current = null;
    };
    // 지도 인스턴스는 한 번만 만든다. 이후에는 마커 위치만 바꾼다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const points = (): LatLng[] =>
    [pickup.pickup, pickup.vehicle, child, previous, ...(pickup.walkPath ?? [])].filter(
      (p): p is NonNullable<typeof p> => !!p,
    );

  const fitAll = () => {
    const k = (window as any).kakao;
    if (!map.current || !k) return;
    const pts = points();
    if (pts.length === 0) return;
    if (pts.length === 1) {
      map.current.setCenter(new k.maps.LatLng(pts[0].lat, pts[0].lng));
      return;
    }
    const bounds = new k.maps.LatLngBounds();
    pts.forEach((p) => bounds.extend(new k.maps.LatLng(p.lat, p.lng)));
    map.current.setBounds(bounds, 60, 64, 96, 48);
  };

  useEffect(() => {
    if (!ready || !map.current) return;
    const k = (window as any).kakao;
    const coords: Record<MarkerKey, LatLng | null> = {
      vehicle: pickup.vehicle,
      child,
      pickup: pickup.pickup,
      previous,
      // 아이가 학원에 있으면 학원 핀이 내 위치 핀과 겹치므로 숨긴다.
      academy: pickup.academy && child && roughMeters(pickup.academy, child) < AT_ACADEMY_METERS ? null : pickup.academy,
    };
    (Object.keys(coords) as MarkerKey[]).forEach((key) => {
      const coord = coords[key];
      if (!coord) {
        overlays.current[key]?.setMap(null);
        delete overlays.current[key];
        return;
      }
      const pos = new k.maps.LatLng(coord.lat, coord.lng);
      if (!overlays.current[key]) {
        overlays.current[key] = new k.maps.CustomOverlay({
          position: pos,
          content: markerNode(key),
          xAnchor: ANCHOR[key].x,
          yAnchor: ANCHOR[key].y,
          zIndex: ANCHOR[key].z,
          map: map.current,
        });
      } else overlays.current[key].setPosition(pos);
    });

    const setLabel = (id: string, coord: LatLng | null, text: string, kind: 'old' | 'new') => {
      if (!showLabels || !coord) {
        overlays.current[id]?.setMap(null);
        delete overlays.current[id];
        return;
      }
      const pos = new k.maps.LatLng(coord.lat, coord.lng);
      if (!overlays.current[id]) {
        overlays.current[id] = new k.maps.CustomOverlay({
          position: pos,
          content: labelNode(text, kind),
          // 기존 위치: 회색 핀 오른쪽 / 변경된 위치: 초록 핀 위
          xAnchor: kind === 'old' ? -0.22 : 0.5,
          yAnchor: kind === 'old' ? 1.55 : 2.7,
          zIndex: 8,
          map: map.current,
        });
      } else overlays.current[id].setPosition(pos);
    };
    setLabel('oldLabel', previous, '기존 위치', 'old');
    setLabel('newLabel', pickup.pickup, '변경된 위치', 'new');

    // 선은 지우고 다시 만들지 않고 setPath로 위치만 갱신한다 (실시간 이동 반영).
    const setLine = (id: 'child' | 'vehicle', path: LatLng[] | null, style: Record<string, unknown>) => {
      if (!path) {
        lines.current[id]?.setMap(null);
        delete lines.current[id];
        return;
      }
      const kpath = path.map((p) => new k.maps.LatLng(p.lat, p.lng));
      if (lines.current[id]) lines.current[id].setPath(kpath);
      else lines.current[id] = new k.maps.Polyline({ map: map.current, path: kpath, ...style });
    };
    // 흰 선: 차 → 픽업 장소
    setLine('vehicle', vehicleLine(pickup.vehicle, pickup.pickup), {
      strokeWeight: 4,
      strokeColor: '#ffffff',
      strokeOpacity: 0.95,
      strokeStyle: 'solid',
      zIndex: 1,
    });
    // 연두 선: 내 위치(휴대폰) → 픽업 장소
    setLine('child', childLine(child, pickup.pickup, pickup.academy, pickup.walkPath), {
      strokeWeight: 6,
      strokeColor: '#d4f53c',
      strokeOpacity: 1,
      strokeStyle: 'solid',
      zIndex: 2,
    });

    if (!fitted.current && !dragging.current && points().length > 0) {
      fitAll();
      fitted.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pickup.vehicle, pickup.pickup, pickup.academy, pickup.walkPath, child, previous, showLabels]);

  return (
    <div className="map-container">
      <div ref={node} className="map" />
      {ready && (
        <button type="button" className="map-fit" aria-label="전체 위치 보기" onClick={fitAll}>
          <LayoutGrid size={18} fill="currentColor" strokeWidth={1.5} />
        </button>
      )}
      {error && (
        <div className="map-fallback">
          {error}
          <p>카카오디벨로퍼스에서 JavaScript SDK 도메인과 지도 사용 설정을 확인해 주세요.</p>
        </div>
      )}
    </div>
  );
}
