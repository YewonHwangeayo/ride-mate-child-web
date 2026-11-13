import { describe, expect, it } from 'vitest';
import { pickupPhase } from './pickupStatus';
import type { Pickup } from './types';

const base: Pickup = {
  linkStatus: 'ACTIVE',
  serverDt: '2026-11-12T22:00:00',
  driverName: '엄마',
  car: null,
  academy: null,
  pickup: null,
  walkPath: null,
  planStatus: 'STARTED',
  stopAtSpot: false,
  slotDt: null,
  arrivalDt: '2026-11-12T22:04:00',
  arrivalSource: 'NAVI',
  vehicle: null,
  leave: { leaveStatus: 'NONE', plannedLeaveDt: null, leavingDt: null },
};

describe('pickupPhase', () => {
  const now = Date.parse('2026-11-12T22:00:00+09:00');

  it('prefers boarded and closed over arrival', () => {
    expect(pickupPhase({ ...base, linkStatus: 'BOARDED' }, now, false)).toBe('boarded');
    expect(pickupPhase({ ...base, linkStatus: 'CLOSED' }, now, false)).toBe('closed');
  });

  it('treats arrival only when stopped at the assigned spot', () => {
    expect(pickupPhase({ ...base, planStatus: 'STOPPED', stopAtSpot: true }, now, true)).toBe('arrived');
    expect(pickupPhase({ ...base, planStatus: 'STOPPED', stopAtSpot: false }, now, false)).toBe('eta');
  });

  it('shows soon when one minute or less remains', () => {
    const almost = Date.parse('2026-11-12T22:03:30+09:00');
    expect(pickupPhase(base, almost, false)).toBe('soon');
  });

  it('does not invent an ETA number when arrivalDt is null', () => {
    expect(pickupPhase({ ...base, arrivalDt: null }, now, false)).toBe('etaUnknown');
  });
});
