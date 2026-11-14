import type { LatLng, Pickup, Snapshot, VehicleEvent } from './types';

export type PickupView = {
  data: Pickup | undefined;
  previousPickup: LatLng | null;
  placeChanged: boolean;
};

export function emptyPickupView(): PickupView {
  return { data: undefined, previousPickup: null, placeChanged: false };
}

function sameCoord(a: LatLng | null | undefined, b: LatLng | null | undefined) {
  return !!a && !!b && a.lat === b.lat && a.lng === b.lng;
}

export function applySnapshot(view: PickupView, snapshot: Snapshot): PickupView {
  const { change, ...next } = snapshot;
  const oldPickup = view.data?.pickup;
  const moved = !!oldPickup && !!next.pickup && !sameCoord(oldPickup, next.pickup);
  const announced = change === 'PLACE_CHANGED' && moved;
  const inferred = change !== null && change !== undefined && moved;
  const placeChanged = announced || inferred;
  return {
    data: next,
    previousPickup: placeChanged ? { lat: oldPickup!.lat, lng: oldPickup!.lng } : view.previousPickup,
    placeChanged: placeChanged || view.placeChanged,
  };
}

export function applyVehicle(view: PickupView, event: VehicleEvent): PickupView {
  if (!view.data) return view;
  const vehicle =
    event.lat === null || event.lng === null || !event.reportedDt
      ? null
      : { lat: event.lat, lng: event.lng, reportedDt: event.reportedDt };
  return {
    ...view,
    data: {
      ...view.data,
      serverDt: event.serverDt,
      arrivalDt: event.arrivalDt,
      arrivalSource: event.arrivalSource,
      vehicle,
    },
  };
}

export function dismissPlaceChange(view: PickupView): PickupView {
  return { ...view, placeChanged: false };
}
