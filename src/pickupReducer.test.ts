import { describe, expect, it } from 'vitest';
import { applySnapshot, applyVehicle, emptyPickupView } from './pickupReducer';
import type { Pickup, Snapshot } from './types';

const pickup: Pickup = {
  linkStatus: 'ACTIVE',
  serverDt: '2026-11-12T22:00:00',
  driverName: '엄마',
  car: null,
  academy: null,
  pickup: {
    lat: 37.5,
    lng: 127.0,
    locationType: 'SPOT',
    pickupSpotSeq: 1,
    name: '정문',
    walkMin: 3,
    guideText: null,
    photoUrl: null,
  },
  walkPath: null,
  planStatus: 'STARTED',
  stopAtSpot: false,
  slotDt: null,
  arrivalDt: '2026-11-12T22:04:00',
  arrivalSource: 'NAVI',
  vehicle: { lat: 37.49, lng: 127.01, reportedDt: '2026-11-12T22:00:00' },
  leave: { leaveStatus: 'SCHEDULED', plannedLeaveDt: '2026-11-12T22:10:00', leavingDt: null },
};

describe('pickup reducer', () => {
  it('does not treat the first snapshot as a place change', () => {
    const snapshot: Snapshot = { ...pickup, change: null };
    const next = applySnapshot(emptyPickupView(), snapshot);
    expect(next.placeChanged).toBe(false);
    expect(next.previousPickup).toBeNull();
  });

  it('keeps the previous pin only when a later snapshot moves the place', () => {
    const first = applySnapshot(emptyPickupView(), { ...pickup, change: null });
    const moved = applySnapshot(first, {
      ...pickup,
      change: 'PLACE_CHANGED',
      pickup: { ...pickup.pickup!, lat: 37.51, lng: 127.02, name: '후문' },
    });
    expect(moved.placeChanged).toBe(true);
    expect(moved.previousPickup).toEqual({ lat: 37.5, lng: 127.0 });
    expect(moved.data?.pickup?.name).toBe('후문');
  });

  it('updates vehicle and ETA without clearing leave or pickup', () => {
    const first = applySnapshot(emptyPickupView(), { ...pickup, change: null });
    const next = applyVehicle(first, {
      lat: null,
      lng: null,
      reportedDt: null,
      arrivalDt: '2026-11-12T22:06:00',
      arrivalSource: 'NAVI',
      serverDt: '2026-11-12T22:01:00',
    });
    expect(next.data?.vehicle).toBeNull();
    expect(next.data?.leave?.leaveStatus).toBe('SCHEDULED');
    expect(next.data?.pickup?.name).toBe('정문');
    expect(next.data?.arrivalDt).toBe('2026-11-12T22:06:00');
  });
});
