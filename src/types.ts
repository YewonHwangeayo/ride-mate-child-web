export type LatLng = { lat: number; lng: number };
export type CarColor = 'WHITE' | 'BLACK' | 'GRAY' | 'ETC';
export type Car = { model: string | null; color: CarColor | null; noLast4: string | null };
export type PickupSpot = LatLng & {
  locationType: 'SPOT' | 'CUSTOM';
  pickupSpotSeq: number | null;
  name: string | null;
  walkMin: number | null;
  guideText: string | null;
  photoUrl: string | null;
};
export type LeaveStatus = 'NONE' | 'SCHEDULED' | 'SOON' | 'LEAVING';
export type Leave = {
  leaveStatus: LeaveStatus;
  plannedLeaveDt: string | null;
  leavingDt: string | null;
  reason?: string | null;
};
export type PlanStatus = 'PLANNED' | 'STARTED' | 'WAITING' | 'STOPPED' | 'LOOPING';
export type Pickup = {
  linkStatus: 'ACTIVE' | 'BOARDED' | 'CLOSED';
  serverDt: string;
  driverName: string | null;
  car: Car | null;
  academy: LatLng | null;
  pickup: PickupSpot | null;
  walkPath: LatLng[] | null;
  planStatus: PlanStatus | null;
  stopAtSpot: boolean | null;
  slotDt: string | null;
  arrivalDt: string | null;
  arrivalSource: 'NAVI' | 'SLOT' | null;
  vehicle: (LatLng & { reportedDt: string }) | null;
  leave: Leave | null;
};
export type Envelope<T> = { message: string; code: number; data: T };
export type SnapshotChange = 'STATUS_CHANGED' | 'PLACE_CHANGED' | 'LEAVE_CHANGED' | 'OTHER' | null;
export type Snapshot = Pickup & { change?: SnapshotChange };
export type VehicleEvent = {
  lat: number | null;
  lng: number | null;
  reportedDt: string | null;
  arrivalDt: string | null;
  arrivalSource: 'NAVI' | 'SLOT' | null;
  serverDt: string;
};
