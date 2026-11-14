import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

/**
 * 바텀시트 손잡이를 손가락(포인터)으로 끌어 올리고 내리기.
 * - direction 'down': 아래로 threshold 이상 끌면 onRelease() (시트 닫기)
 * - direction 'up'  : 위로 threshold 이상 끌면 onRelease() (시트 열기)
 * 짧게 탭하면 onTap() (손잡이를 눌러 토글)
 */
export function useSheetDrag({
  direction,
  onRelease,
  onTap,
  threshold = 56,
}: {
  direction: 'down' | 'up';
  onRelease: () => void;
  onTap?: () => void;
  threshold?: number;
}) {
  const start = useRef<{ y: number; id: number } | null>(null);
  const [offset, setOffset] = useState(0);

  const clamp = (dy: number) => (direction === 'down' ? Math.max(0, dy) : Math.min(0, dy));

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    start.current = { y: e.clientY, id: e.pointerId };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    if (!start.current || start.current.id !== e.pointerId) return;
    setOffset(clamp(e.clientY - start.current.y));
  };
  const finish = (e: ReactPointerEvent<HTMLElement>) => {
    if (!start.current || start.current.id !== e.pointerId) return;
    const dy = clamp(e.clientY - start.current.y);
    start.current = null;
    setOffset(0);
    if (Math.abs(dy) >= threshold) onRelease();
    else if (Math.abs(dy) < 6) onTap?.();
  };

  return {
    dragging: offset !== 0,
    offset,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
    },
  };
}
