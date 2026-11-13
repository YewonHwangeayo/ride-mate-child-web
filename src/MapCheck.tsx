import { useState } from 'react';
import { PickupMap } from './Map';
import { useGeolocation } from './useGeolocation';
import { Shell } from './components/Shell';
import type { Pickup } from './types';

const SAMPLE: Pickup = {
  linkStatus: 'ACTIVE',
  serverDt: '2026-11-13T12:00:00',
  driverName: null,
  car: null,
  academy: { lat: 37.4979, lng: 127.0276 },
  pickup: {
    lat: 37.4985,
    lng: 127.0288,
    locationType: 'SPOT',
    pickupSpotSeq: null,
    name: '지도 진단용 핀',
    walkMin: null,
    guideText: null,
    photoUrl: null,
  },
  walkPath: [
    { lat: 37.4979, lng: 127.0276 },
    { lat: 37.4982, lng: 127.0282 },
    { lat: 37.4985, lng: 127.0288 },
  ],
  planStatus: null,
  stopAtSpot: null,
  slotDt: null,
  arrivalDt: null,
  arrivalSource: null,
  vehicle: { lat: 37.4981, lng: 127.0289, reportedDt: '2026-11-13T12:00:00' },
  leave: null,
};

export function MapCheck() {
  const { position, error } = useGeolocation();
  const [showPrevious, setShowPrevious] = useState(true);
  return (
    <Shell label="지도 진단">
      <div className="status-card">
        <span className="status-badge">Kakao Maps</span>
        <h1>지도 SDK · 마커 · GPS 점검</h1>
        <p>픽업 API를 호출하지 않는 개발용 화면입니다.</p>
      </div>
      <div className="map-panel">
        <PickupMap
          pickup={SAMPLE}
          child={position}
          previous={showPrevious ? { lat: 37.4976, lng: 127.027 } : null}
          showLabels={showPrevious}
        />
      </div>
      {error && <div className="hint">{error} · 내 위치 없이도 지도를 볼 수 있어요.</div>}
      <div className="map-check-note">
        <p>초록 핀: 픽업 장소 · 회색 핀: 이전 장소 · 차: 진단용 좌표 · 삼각형: 브라우저 GPS</p>
        <p>연두 선: 내 위치→픽업(학원 근처면 서버 walkPath) · 흰 선: 차→픽업. 둘 다 실제 도보 길찾기가 아닙니다.</p>
        <button onClick={() => setShowPrevious((v) => !v)}>{showPrevious ? '이전 핀 숨기기' : '이전 핀 보기'}</button>
      </div>
    </Shell>
  );
}
