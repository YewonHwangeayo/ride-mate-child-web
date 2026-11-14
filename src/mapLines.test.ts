import { describe, expect, it } from 'vitest';
import { childLine, vehicleLine } from './mapLines';

const academy = { lat: 37.498, lng: 127.062 };
const pickup = { lat: 37.4985, lng: 127.0625 };
const walk = [academy, { lat: 37.498, lng: 127.0625 }, pickup];

describe('map lines', () => {
  it('connects my GPS position straight to the pickup spot', () => {
    const me = { lat: 37.5, lng: 127.06 };
    expect(childLine(me, pickup, academy, walk)).toEqual({ path: [me, pickup], kind: 'direct' });
  });

  it('uses the server walkPath while the child is at the academy', () => {
    const me = { lat: 37.49801, lng: 127.06201 };
    expect(childLine(me, pickup, academy, walk)).toEqual({ path: walk, kind: 'walkPath' });
  });

  it('draws nothing without a pickup spot, falls back to walkPath without GPS', () => {
    expect(childLine({ lat: 1, lng: 1 }, null, academy, walk)).toBeNull();
    expect(childLine(null, pickup, academy, walk)).toEqual({ path: walk, kind: 'walkPath' });
    expect(childLine(null, pickup, academy, null)).toBeNull();
  });

  it('prefers the pedestrian route API result when available', () => {
    const me = { lat: 37.5, lng: 127.06 };
    const route = [me, { lat: 37.4995, lng: 127.061 }, pickup];
    expect(childLine(me, pickup, academy, walk, route)).toEqual({ path: route, kind: 'route' });
  });

  it('links the car to the pickup spot only when the car position is known', () => {
    const car = { lat: 37.499, lng: 127.063 };
    expect(vehicleLine(car, pickup)).toEqual([car, pickup]);
    expect(vehicleLine(null, pickup)).toBeNull();
  });
});
