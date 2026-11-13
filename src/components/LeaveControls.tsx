import { clock } from '../time';
import type { Pickup } from '../types';

type Handlers = {
  locked: boolean;
  pending: boolean;
  onLeaveNow: () => void;
  onLeaveIn5: () => void;
  onPickTime: () => void;
};

/** 출발 미설정 — 도착예정.png 하단 버튼 3개 */
export function LeaveButtons({ locked, pending, onLeaveNow, onLeaveIn5, onPickTime }: Handlers) {
  const disabled = locked || pending;
  return (
    <div className="leave-stack">
      <button type="button" className="leave-now" disabled={disabled} onClick={onLeaveNow}>
        지금 나가요
      </button>
      <div className="leave-row">
        <button type="button" disabled={disabled} onClick={onLeaveIn5}>
          5분 뒤 나가요
        </button>
        <button type="button" disabled={disabled} onClick={onPickTime}>
          시간 직접 설정
        </button>
      </div>
    </div>
  );
}

/** 출발 설정됨 — 출발시간 설정완료.png 하단 시트 */
export function DeparturePanel({
  data,
  driver,
  locked,
  pending,
  onLeaveNow,
  onPickTime,
}: Handlers & { data: Pickup; driver: string }) {
  const status = data.leave?.leaveStatus ?? 'NONE';
  const planned = data.leave?.plannedLeaveDt;
  const leaving = status === 'LEAVING';
  const disabled = locked || pending;
  return (
    <div className="departure-sheet">
      <div className="sheet-handle" aria-hidden="true" />
      <div className="departure-card">
        <div className="departure-info">
          <span className="tiny-label">내 출발 시간</span>
          {leaving ? (
            <strong>
              지금 <small>나가요</small>
            </strong>
          ) : planned ? (
            <strong>
              {clock(planned)} <small>에 나가요</small>
            </strong>
          ) : (
            <strong>
              <small>출발 시간 확인 중</small>
            </strong>
          )}
          <span className="departure-sub">
            {leaving
              ? `${driver}에게 지금 나간다고 알렸어요`
              : status === 'SOON'
                ? '곧 나갈 시간이에요'
                : `${driver}에게 알렸어요`}
          </span>
        </div>
        {!leaving && (
          <div className="departure-actions">
            <button type="button" disabled={disabled} onClick={onPickTime}>
              변경
            </button>
            <button type="button" className="secondary-action" disabled={disabled} onClick={onLeaveNow}>
              지금 나가요
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
