import { minutesLeft, parseKst } from './time';
import type { Pickup } from './types';

export type PickupPhase = 'boarded' | 'closed' | 'arrived' | 'placeChanged' | 'soon' | 'eta' | 'etaUnknown';

export function isArrived(data: Pickup) {
  return data.planStatus === 'STOPPED' && data.stopAtSpot === true;
}

export function pickupPhase(data: Pickup, now: number, placeChangedVisible: boolean): PickupPhase {
  if (data.linkStatus === 'BOARDED') return 'boarded';
  if (data.linkStatus === 'CLOSED') return 'closed';
  if (isArrived(data)) return 'arrived';
  if (placeChangedVisible) return 'placeChanged';
  const left = minutesLeft(data.arrivalDt, now);
  if (left !== null && left <= 1) return 'soon';
  if (left === null) return 'etaUnknown';
  return 'eta';
}

export function vehicleIfFresh(data: Pickup, now: number) {
  if (!data.vehicle) return null;
  const ms = parseKst(data.vehicle.reportedDt);
  if (ms === null || now - ms > 30_000) return null;
  return data.vehicle;
}
