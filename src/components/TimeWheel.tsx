import { useEffect, useLayoutEffect, useRef } from 'react';

export const WHEEL_ROW = 46;
const VISIBLE_ROWS = 5;

/** 스크롤 스냅 휠 한 열. 가운데 줄에 놓인 값이 선택값이다. */
export function WheelColumn({
  values,
  value,
  onChange,
  label,
}: {
  values: string[];
  value: string;
  onChange: (next: string) => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const selectedIndex = Math.max(0, values.indexOf(value));

  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollTop = selectedIndex * WHEEL_ROW;
    // 최초 위치만 맞춘다. 이후에는 사용자의 스크롤이 값을 결정한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const onScroll = () => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      const i = Math.min(values.length - 1, Math.max(0, Math.round(el.scrollTop / WHEEL_ROW)));
      if (values[i] !== value) onChange(values[i]);
    });
  };

  const scrollToIndex = (i: number) => {
    const clamped = Math.min(values.length - 1, Math.max(0, i));
    ref.current?.scrollTo({ top: clamped * WHEEL_ROW, behavior: 'smooth' });
    onChange(values[clamped]);
  };

  return (
    <div
      ref={ref}
      className="wheel-column"
      role="listbox"
      aria-label={label}
      tabIndex={0}
      style={{ height: WHEEL_ROW * VISIBLE_ROWS, paddingBlock: WHEEL_ROW * 2 }}
      onScroll={onScroll}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          scrollToIndex(selectedIndex + 1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          scrollToIndex(selectedIndex - 1);
        }
      }}
    >
      {values.map((v, i) => {
        const distance = Math.abs(i - selectedIndex);
        return (
          <button
            key={v}
            type="button"
            role="option"
            aria-selected={distance === 0}
            tabIndex={-1}
            className={`wheel-item d${Math.min(distance, 3)}`}
            style={{ height: WHEEL_ROW }}
            onClick={() => scrollToIndex(i)}
          >
            {v}
          </button>
        );
      })}
    </div>
  );
}
