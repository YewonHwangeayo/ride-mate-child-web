import { Check, Clock3, MapPin } from 'lucide-react';
import { clock, minutesLeft } from '../time';
import { pickupPhase } from '../pickupStatus';
import type { Pickup } from '../types';

export function driverLabel(data: Pickup) {
  return data.driverName?.trim() || '보호자';
}

/** 상단 상태 카드 — 도착예정 / 곧도착 / 도착 / 픽업장소 변경 디자인 */
export function StatusCard({
  data,
  now,
  placeChanged,
  onAcknowledge,
}: {
  data: Pickup;
  now: number;
  placeChanged: boolean;
  onAcknowledge?: () => void;
}) {
  const phase = pickupPhase(data, now, placeChanged);
  const left = minutesLeft(data.arrivalDt, now);
  const arrivalClock = clock(data.arrivalDt);

  const badge =
    phase === 'arrived' ? (
      <span className="status-badge arrived">
        <Check size={15} strokeWidth={2.6} /> 도착
      </span>
    ) : phase === 'placeChanged' ? (
      <span className="status-badge changed">
        <MapPin size={15} strokeWidth={2.4} fill="currentColor" stroke="#2a2220" /> 픽업 위치 변경
      </span>
    ) : (
      <span className="status-badge">
        <Clock3 size={15} strokeWidth={2.2} /> {phase === 'soon' ? '곧 도착' : '도착 예정'}
      </span>
    );

  // 새 디자인: 큰 도착 시각 + 상태 문구 (도착예정.png 수정본)
  const bigTime = data.arrivalDt ? arrivalClock : '--:--';
  const timeLabel = phase === 'arrived' ? '도착 완료' : '도착 예정';
  const message =
    phase === 'arrived'
      ? '픽업 장소에 차가 도착했어요'
      : phase === 'placeChanged'
        ? '만나는 위치가 변경됐어요'
        : phase === 'soon'
          ? '잠시 후 도착해요'
          : phase === 'etaUnknown'
            ? '도착 시간을 확인하고 있어요'
            : `${left}분 뒤 도착해요`;

  return (
    <section className="status-card" aria-live="polite">
      <div className="status-head">
        {badge}
        {phase === 'placeChanged' && onAcknowledge && (
          <button type="button" className="ack-btn" onClick={onAcknowledge}>
            확인
          </button>
        )}
      </div>
      <div className="status-time">
        <strong>{bigTime}</strong>
        <span>{timeLabel}</span>
      </div>
      <h1 className="status-msg">{message}</h1>
      {placeChanged && phase !== 'placeChanged' && (
        <div className="status-extra">
          <span>
            <MapPin size={13} strokeWidth={2.4} /> 만나는 위치가 변경됐어요
          </span>
          {onAcknowledge && (
            <button type="button" className="ack-btn" onClick={onAcknowledge}>
              확인
            </button>
          )}
        </div>
      )}
    </section>
  );
}
