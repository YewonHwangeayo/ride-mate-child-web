import { clock } from '../time';
import { useSheetDrag } from './useSheetDrag';
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
  onCollapse,
}: Handlers & { data: Pickup; driver: string; onCollapse?: () => void }) {
  // 손잡이를 아래로 끌면 접히고, 탭해도 접힌다 (다시 펼치기: 지도 시계 버튼 또는 아래 손잡이를 위로)
  const drag = useSheetDrag({ direction: 'down', onRelease: () => onCollapse?.(), onTap: () => onCollapse?.() });
  const status = data.leave?.leaveStatus ?? 'NONE';
  const planned = data.leave?.plannedLeaveDt;
  const leaving = status === 'LEAVING';
  const disabled = locked || pending;
  return (
    <div
      className={`departure-sheet ${drag.dragging ? 'dragging' : ''}`}
      style={drag.offset ? { transform: `translateY(${drag.offset}px)` } : undefined}
    >
      <button
        type="button"
        className="sheet-handle-btn"
        aria-label="내 출발 시간 접기"
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onCollapse?.()}
        {...drag.handleProps}
      >
        <span className="sheet-handle" aria-hidden="true" />
      </button>
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

/** 접힌 상태의 아래 손잡이: 위로 끌거나 탭하면 내 출발 시간 시트가 펼쳐진다 */
export function DeparturePeek({ onExpand }: { onExpand: () => void }) {
  const drag = useSheetDrag({ direction: 'up', onRelease: onExpand, onTap: onExpand, threshold: 36 });
  return (
    <button
      type="button"
      className={`departure-peek ${drag.dragging ? 'dragging' : ''}`}
      aria-label="내 출발 시간 펼치기"
      style={drag.offset ? { transform: `translateY(${drag.offset}px)` } : undefined}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onExpand()}
      {...drag.handleProps}
    >
      <span className="sheet-handle" aria-hidden="true" />
    </button>
  );
}
