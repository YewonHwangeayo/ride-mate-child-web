/**
 * 개발 전용 데모 모드 (npm run dev 에서만 번들에 포함, 배포 빌드에서는 제거됨)
 *
 * 실제 차량 없이 로그인 → 픽업 → 도착 → 장소 변경 → 탑승 완료까지 화면을 확인하기 위해
 * /api/v1/* 응답과 SSE 스트림을 브라우저 안에서 흉내 낸다. 실제 서버에는 아무것도 보내지 않는다.
 * /api/walk-route(보행자 경로)는 그대로 실제 T map 프록시로 보낸다.
 */
import { toKstLocal } from '../time';
import type { LatLng, Pickup, SnapshotChange } from '../types';

export const DEMO_TOKEN = 'demo'.padEnd(43, '0');
const FLAG = 'rm-demo';

// 대치동 학원가 근처 좌표 (데모용)
const ACADEMY: LatLng = { lat: 37.4979, lng: 127.0603 };
const SPOT_A = { lat: 37.4992, lng: 127.0631, name: '은마사거리 편의점 앞' };
const SPOT_B = { lat: 37.4984, lng: 127.0645, name: '대치역 4번 출구' };
const CAR_PATH: LatLng[] = [
  { lat: 37.5046, lng: 127.0566 },
  { lat: 37.5034, lng: 127.0583 },
  { lat: 37.5022, lng: 127.06 },
  { lat: 37.501, lng: 127.0612 },
  { lat: 37.5001, lng: 127.0622 },
  { lat: 37.4996, lng: 127.0628 },
];
const CHILD_PATH: LatLng[] = [ACADEMY, { lat: 37.4979, lng: 127.0617 }, { lat: 37.498, lng: 127.0631 }, SPOT_A];

type Listener = (chunk: string) => void;

const realFetch = window.fetch.bind(window);
const listeners = new Set<Listener>();
const subs = new Set<() => void>();

const nowKst = () => toKstLocal(Date.now());
const inMin = (m: number) => toKstLocal(Date.now() + m * 60_000);

function freshState() {
  return {
    link: 'ACTIVE' as Pickup['linkStatus'],
    planStatus: 'STARTED' as Pickup['planStatus'],
    stopAtSpot: false,
    arrivalDt: inMin(4),
    spot: SPOT_A as typeof SPOT_A,
    carIndex: 0,
    leave: { leaveStatus: 'NONE', plannedLeaveDt: null, leavingDt: null } as Pickup['leave'],
    // 로그인
    signedUp: false,
    session: false,
    userName: '',
    phone: '',
  };
}
let s = freshState();

export const demoGps = {
  get simulate() {
    try {
      return sessionStorage.getItem('rm-demo-gps') !== '0';
    } catch {
      return true;
    }
  },
  set simulate(on: boolean) {
    try {
      sessionStorage.setItem('rm-demo-gps', on ? '1' : '0');
    } catch {
      /* noop */
    }
  },
  step: 0,
};

export function isDemo() {
  try {
    return sessionStorage.getItem(FLAG) === '1';
  } catch {
    return false;
  }
}
export function setDemo(on: boolean) {
  try {
    if (on) sessionStorage.setItem(FLAG, '1');
    else sessionStorage.removeItem(FLAG);
  } catch {
    /* noop */
  }
}

function pickup(): Pickup {
  if (s.link !== 'ACTIVE') {
    return {
      linkStatus: s.link,
      serverDt: nowKst(),
      driverName: null,
      car: null,
      academy: null,
      pickup: null,
      walkPath: null,
      planStatus: null,
      stopAtSpot: null,
      slotDt: null,
      arrivalDt: null,
      arrivalSource: null,
      vehicle: null,
      leave: null,
    };
  }
  const car = s.stopAtSpot ? { lat: s.spot.lat - 0.00025, lng: s.spot.lng } : CAR_PATH[s.carIndex];
  return {
    linkStatus: 'ACTIVE',
    serverDt: nowKst(),
    driverName: '엄마',
    car: { model: '아반떼', color: 'WHITE', noLast4: '1234' },
    academy: ACADEMY,
    pickup: {
      lat: s.spot.lat,
      lng: s.spot.lng,
      locationType: 'SPOT',
      pickupSpotSeq: 1,
      name: s.spot.name,
      walkMin: 3,
      guideText: null,
      photoUrl: null,
    },
    walkPath: null,
    planStatus: s.planStatus,
    stopAtSpot: s.stopAtSpot,
    slotDt: s.arrivalDt,
    arrivalDt: s.arrivalDt,
    arrivalSource: 'NAVI',
    vehicle: { ...car, reportedDt: nowKst() },
    leave: s.leave,
  };
}

function emit(event: string, data: unknown) {
  const chunk = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  listeners.forEach((l) => l(chunk));
  subs.forEach((f) => f());
}
const snapshot = (change: SnapshotChange) => emit('snapshot', { change, ...pickup() });

// 차 이동 (3초마다)
setInterval(() => {
  if (!listeners.size || s.link !== 'ACTIVE' || s.stopAtSpot) return;
  if (s.carIndex < CAR_PATH.length - 1) s.carIndex += 1;
  const p = pickup();
  emit('vehicle', { ...p.vehicle, arrivalDt: p.arrivalDt, arrivalSource: p.arrivalSource, serverDt: p.serverDt });
}, 3000);

/** 데모 패널에서 호출하는 상태 전환 */
export const demo = {
  eta() {
    s.link = 'ACTIVE';
    s.planStatus = 'STARTED';
    s.stopAtSpot = false;
    s.arrivalDt = inMin(4);
    s.carIndex = 0;
    snapshot('OTHER');
  },
  soon() {
    s.planStatus = 'STARTED';
    s.stopAtSpot = false;
    s.arrivalDt = toKstLocal(Date.now() + 45_000);
    s.carIndex = CAR_PATH.length - 2;
    snapshot('OTHER');
  },
  arrived() {
    s.planStatus = 'STOPPED';
    s.stopAtSpot = true;
    s.arrivalDt = nowKst();
    snapshot('STATUS_CHANGED');
  },
  placeChange() {
    s.spot = s.spot === SPOT_A ? SPOT_B : SPOT_A;
    snapshot('PLACE_CHANGED');
  },
  boarded() {
    s.link = 'BOARDED';
    snapshot('STATUS_CHANGED');
  },
  closed() {
    s.link = 'CLOSED';
    snapshot('STATUS_CHANGED');
  },
  reset() {
    const keep = { signedUp: s.signedUp, session: s.session, userName: s.userName, phone: s.phone };
    s = { ...freshState(), ...keep };
    demoGps.step = 0;
    snapshot('STATUS_CHANGED');
  },
  resetLogin() {
    s.signedUp = false;
    s.session = false;
    s.userName = '';
  },
  state: () => s,
  subscribe(f: () => void) {
    subs.add(f);
    return () => subs.delete(f);
  },
};

// ---------- fetch 가로채기 ----------
const json = (data: unknown, status = 200, code = status) =>
  new Response(JSON.stringify({ message: status < 300 ? '요청이 정상 처리되었습니다.' : '데모 오류', code, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const masked = (p: string) => (p.length >= 10 ? `${p.slice(0, 3)}-****-${p.slice(-4)}` : p);
const qr = (extra: Record<string, unknown> = {}) => ({
  qrState: s.session ? 'VERIFIED' : 'SCANNED',
  signedIn: s.session,
  signupRequired: false,
  expiresIn: 180,
  ...(s.session ? { userName: s.userName, maskedPhone: masked(s.phone), matchCode: '4821' } : {}),
  ...extra,
});

async function mockFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (!url.includes('/api/v1/')) return realFetch(input, init);
  await new Promise((r) => setTimeout(r, 250)); // 네트워크 지연 흉내
  const body = init.body ? JSON.parse(String(init.body)) : {};

  // 자녀 픽업
  if (url.includes('/Pickup/W/DetailChildPickupStream')) {
    const signal = init.signal;
    let listener: Listener | null = null;
    const enc = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        listener = (chunk) => c.enqueue(enc.encode(chunk));
        listeners.add(listener);
        c.enqueue(enc.encode(`event: snapshot\ndata: ${JSON.stringify({ change: null, ...pickup() })}\n\n`));
        signal?.addEventListener('abort', () => {
          if (listener) listeners.delete(listener);
          try {
            c.close();
          } catch {
            /* closed */
          }
        });
      },
      cancel() {
        if (listener) listeners.delete(listener);
      },
    });
    return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
  }
  if (url.includes('/Pickup/W/DetailChildPickup')) return json(pickup());
  if (url.includes('/Pickup/W/AddPickupLinkOpen')) return json({ reason: null, openedDt: nowKst() });
  if (url.includes('/Pickup/W/AddChildLeave')) {
    if (s.leave?.leaveStatus === 'LEAVING') return json({ reason: 'ALREADY_LEAVING' }, 409);
    s.leave = body.leaveNow
      ? { leaveStatus: 'LEAVING', plannedLeaveDt: null, leavingDt: nowKst() }
      : { leaveStatus: 'SCHEDULED', plannedLeaveDt: String(body.leaveDt).slice(0, 16) + ':00', leavingDt: null };
    setTimeout(() => snapshot('LEAVE_CHANGED'), 50);
    return json({ reason: null, ...s.leave });
  }
  if (url.includes('/Pickup/W/DeleteChildLeave')) {
    s.leave = { leaveStatus: 'NONE', plannedLeaveDt: null, leavingDt: null };
    setTimeout(() => snapshot('LEAVE_CHANGED'), 50);
    return json({ reason: null, ...s.leave });
  }

  // 차량 QR 로그인
  if (url.includes('/Auth/W/DetailQrLogin')) return json(qr());
  if (url.includes('/Auth/W/AddPhoneVerification')) {
    s.phone = body.phone;
    return json({ expiresIn: 180, retryAfter: 60 });
  }
  if (url.includes('/Auth/W/AddWebSession')) {
    if (body.code === '000000') {
      return json({ signedIn: false, signupRequired: false, remainingAttempts: 4 }, 400);
    }
    if (!s.signedUp && !body.userName) return json({ signedIn: false, signupRequired: true }, 200, 101);
    if (body.userName) s.userName = body.userName;
    s.signedUp = true;
    s.session = true;
    return json(qr());
  }
  if (url.includes('/Auth/W/sign/AddQrApproval')) return json(qr({ qrState: 'APPROVED' }));
  if (url.includes('/Auth/W/sign/DeleteQrLogin')) return json(qr({ qrState: 'CANCELED' }));
  if (url.includes('/Auth/W/sign/DeleteWebSession')) {
    s.session = false;
    return json(qr());
  }
  return json(null, 404);
}

// ---------- 내 위치 시뮬레이션 (학원 → 픽업 장소로 걸어감) ----------
function simPoint(step: number): LatLng {
  // CHILD_PATH 를 약 8m 간격으로 보간
  const pts: LatLng[] = [];
  for (let i = 0; i < CHILD_PATH.length - 1; i++) {
    const a = CHILD_PATH[i];
    const b = CHILD_PATH[i + 1];
    const d = Math.hypot((a.lat - b.lat) * 111_000, (a.lng - b.lng) * 88_000);
    const n = Math.max(1, Math.round(d / 8));
    for (let k = 0; k < n; k++)
      pts.push({ lat: a.lat + ((b.lat - a.lat) * k) / n, lng: a.lng + ((b.lng - a.lng) * k) / n });
  }
  pts.push(CHILD_PATH[CHILD_PATH.length - 1]);
  return pts[Math.min(step, pts.length - 1)];
}

function patchGeolocation() {
  const geo = navigator.geolocation;
  if (!geo) return;
  const realWatch = geo.watchPosition.bind(geo);
  const realClear = geo.clearWatch.bind(geo);
  const sims = new Map<number, ReturnType<typeof setInterval>>();
  let nextId = 10_000;
  geo.watchPosition = (ok, err, opts) => {
    if (!demoGps.simulate) return realWatch(ok, err, opts);
    const id = nextId++;
    const fire = () => {
      const p = simPoint(demoGps.step);
      ok({
        coords: { latitude: p.lat, longitude: p.lng, accuracy: 8 },
        timestamp: Date.now(),
      } as GeolocationPosition);
    };
    fire();
    sims.set(
      id,
      setInterval(() => {
        demoGps.step += 1;
        fire();
      }, 2000),
    );
    return id;
  };
  geo.clearWatch = (id) => {
    const t = sims.get(id);
    if (t) {
      clearInterval(t);
      sims.delete(id);
    } else realClear(id);
  };
}

let installed = false;
export function maybeInstallDemo() {
  const params = new URLSearchParams(location.search);
  if (params.get('demo') === '1' || location.pathname === '/dev') setDemo(true);
  if (params.get('demo') === '0') setDemo(false);
  if (!isDemo() || installed) return;
  installed = true;
  window.fetch = mockFetch as typeof window.fetch;
  patchGeolocation();
  console.info('[RideMate] 데모 모드: /api/v1 응답을 브라우저에서 흉내 냅니다. 끄려면 ?demo=0');
}
