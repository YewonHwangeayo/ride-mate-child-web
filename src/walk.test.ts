import { describe, expect, it } from 'vitest';
import { appendTrail, formatWalk, routeFromHere, shouldRefetchRoute } from './walk';

const a = { lat: 37.498, lng: 127.06 };
const near = { lat: 37.49801, lng: 127.06001 }; // ~1.4m
const far = { lat: 37.4984, lng: 127.06 }; // ~44m

describe('walk trail', () => {
  it('records movement but ignores jitter and inaccurate fixes', () => {
    let t = appendTrail([], a, 10);
    t = appendTrail(t, near, 10);
    expect(t).toHaveLength(1);
    t = appendTrail(t, far, 120);
    expect(t).toHaveLength(1);
    t = appendTrail(t, far, 15);
    expect(t).toHaveLength(2);
  });
});

describe('route refetch policy', () => {
  const dest = { lat: 37.499, lng: 127.062 };
  it('fetches first, then only after moving 30m and 10s', () => {
    expect(shouldRefetchRoute(null, a, dest, 0)).toBe(true);
    const last = { origin: a, dest, at: 0 };
    expect(shouldRefetchRoute(last, far, dest, 5_000)).toBe(false);
    expect(shouldRefetchRoute(last, near, dest, 20_000)).toBe(false);
    expect(shouldRefetchRoute(last, far, dest, 20_000)).toBe(true);
    expect(shouldRefetchRoute(last, a, { lat: 37.5, lng: 127.07 }, 20_000)).toBe(true);
    // 장소 변경은 10초 안이어도 즉시
    expect(shouldRefetchRoute(last, a, { lat: 37.5, lng: 127.07 }, 1_000)).toBe(true);
  });
  it('starts the line at my position and formats the summary', () => {
    expect(routeFromHere(a, [dest])).toEqual([a, dest]);
    expect(routeFromHere(a, [])).toEqual([]);
    expect(formatWalk(210, 170)).toBe('도보 3분 · 210m');
    expect(formatWalk(1530, 1200)).toBe('도보 20분 · 1.5km');
  });
});
