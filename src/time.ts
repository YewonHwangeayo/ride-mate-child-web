// Backend timestamps are KST without timezone suffix.
export function parseKst(value: string | null | undefined): number | null {
  if (!value) return null;
  const iso = value.includes('T') ? value : value.replace(' ', 'T');
  const stamped = /[zZ]$|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}+09:00`;
  const ms = Date.parse(stamped);
  return Number.isFinite(ms) ? ms : null;
}

export function toKstLocal(ms: number) {
  const d = new Date(ms + 9 * 3600_000);
  return d.toISOString().slice(0, 19);
}

export function clock(value: string | null | undefined) {
  const ms = parseKst(value);
  return ms === null
    ? '--:--'
    : new Intl.DateTimeFormat('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Seoul',
      }).format(ms);
}

export function minutesLeft(target: string | null | undefined, now: number) {
  const ms = parseKst(target);
  return ms === null ? null : Math.max(0, Math.ceil((ms - now) / 60000));
}

export function kstParts(ms: number) {
  const d = new Date(ms + 9 * 3600_000);
  return {
    hour: String(d.getUTCHours()).padStart(2, '0'),
    minute: String(d.getUTCMinutes()).padStart(2, '0'),
  };
}

export function fromKstClock(now: number, hour: string, minute: string) {
  const date = new Date(now + 9 * 3600_000).toISOString().slice(0, 10);
  let ms = parseKst(`${date}T${hour}:${minute}:00`);
  if (ms !== null && ms < now - 60_000) ms += 86_400_000;
  return ms;
}

/** 기본 출발 시각: 서버 기준 지금 + 5분을 5분 단위로 올림 (휠 기본 선택값) */
export function defaultLeaveClock(now: number) {
  const step = 5 * 60_000;
  return kstParts(Math.ceil((now + step) / step) * step);
}

/** 출발 예약 가능 범위: 서버 현재 시각(분 내림) − 1분 ~ 현재 + 60분. 최종 검증은 서버가 한다. */
export function isLeaveInRange(ms: number, now: number) {
  const floor = Math.floor(now / 60_000) * 60_000;
  return ms >= floor - 60_000 && ms <= now + 60 * 60_000;
}
