import { useEffect, useMemo, useState } from 'react';
import { clock, defaultLeaveClock, fromKstClock, isLeaveInRange, kstParts, parseKst, toKstLocal } from '../time';
import { WheelColumn } from './TimeWheel';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

/** C05 — 출발시간설정.png 바텀시트 */
export function TimeSheet({
  now,
  driver,
  arrivalDt,
  plannedLeaveDt,
  pending,
  canCancel,
  error,
  onClose,
  onSubmit,
  onCancelLeave,
}: {
  now: number;
  driver: string;
  arrivalDt: string | null;
  plannedLeaveDt: string | null;
  pending: boolean;
  canCancel: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (leaveDt: string) => void;
  onCancelLeave: () => void;
}) {
  // 시트를 연 시점의 값으로 초기화한다(매초 갱신되는 now로 휠이 움직이지 않게).
  const initial = useMemo(() => {
    const planned = parseKst(plannedLeaveDt);
    if (planned !== null) {
      const p = kstParts(planned);
      const m = Math.min(55, Math.round(Number(p.minute) / 5) * 5);
      return { hour: p.hour, minute: String(m).padStart(2, '0') };
    }
    return defaultLeaveClock(now);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = () => {
    const ms = fromKstClock(now, hour, minute);
    if (ms === null || !isLeaveInRange(ms, now)) {
      setLocalError('지금부터 60분 안의 시간을 골라 주세요.');
      return;
    }
    setLocalError('');
    onSubmit(toKstLocal(ms));
  };

  const message = localError || error;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="time-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="time-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" aria-hidden="true" />
        <h3 id="time-sheet-title">출발 시간 설정</h3>
        <p className="sheet-sub">
          {arrivalDt ? `${driver} 차는 ${clock(arrivalDt)}에 도착해요` : `${driver} 차의 도착 시간을 확인하고 있어요`}
        </p>
        <div className="wheel">
          <div className="wheel-band" aria-hidden="true" />
          <WheelColumn label="시" values={HOURS} value={hour} onChange={setHour} />
          <span className="wheel-colon" aria-hidden="true">
            :
          </span>
          <WheelColumn label="분" values={MINUTES} value={minute} onChange={setMinute} />
        </div>
        {message && (
          <p className="sheet-error" role="alert">
            {message}
          </p>
        )}
        <div className="sheet-actions">
          <button type="button" onClick={onClose}>
            취소
          </button>
          <button type="button" className="primary" disabled={pending} onClick={submit}>
            {pending ? '알리는 중…' : '이 시간으로 설정'}
          </button>
        </div>
        {canCancel && (
          <button type="button" className="sheet-text" disabled={pending} onClick={onCancelLeave}>
            출발 시간 취소
          </button>
        )}
      </div>
    </div>
  );
}
