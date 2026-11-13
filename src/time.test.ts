import { describe, expect, it } from 'vitest';
import { clock, defaultLeaveClock, fromKstClock, isLeaveInRange, minutesLeft, parseKst, toKstLocal } from './time';

describe('KST helpers', () => {
  it('parses offset-less KST as Asia/Seoul', () => {
    expect(parseKst('2026-11-12T22:04:00')).toBe(Date.parse('2026-11-12T22:04:00+09:00'));
  });

  it('formats a clock in KST', () => {
    expect(clock('2026-11-12T22:04:00')).toBe('22:04');
  });

  it('does not invent an ETA when arrivalDt is missing', () => {
    expect(minutesLeft(null, Date.now())).toBeNull();
  });

  it('writes leaveDt without a timezone suffix', () => {
    const ms = Date.parse('2026-11-12T22:10:00+09:00');
    expect(toKstLocal(ms)).toBe('2026-11-12T22:10:00');
  });

  it('defaults the wheel to now + 5 min rounded up to 5 min (KST)', () => {
    expect(defaultLeaveClock(Date.parse('2026-11-12T22:03:20+09:00'))).toEqual({ hour: '22', minute: '10' });
    expect(defaultLeaveClock(Date.parse('2026-11-12T23:57:00+09:00'))).toEqual({ hour: '00', minute: '05' });
  });

  it('keeps the leave window within -1 .. +60 minutes of server time', () => {
    const now = Date.parse('2026-11-12T22:03:40+09:00');
    expect(isLeaveInRange(Date.parse('2026-11-12T22:02:00+09:00'), now)).toBe(true);
    expect(isLeaveInRange(Date.parse('2026-11-12T22:01:00+09:00'), now)).toBe(false);
    expect(isLeaveInRange(Date.parse('2026-11-12T23:03:00+09:00'), now)).toBe(true);
    expect(isLeaveInRange(Date.parse('2026-11-12T23:05:00+09:00'), now)).toBe(false);
  });

  it('rolls a wheel time past midnight onto the next KST day', () => {
    const now = Date.parse('2026-11-12T23:50:00+09:00');
    expect(fromKstClock(now, '00', '10')).toBe(Date.parse('2026-11-13T00:10:00+09:00'));
  });
});
