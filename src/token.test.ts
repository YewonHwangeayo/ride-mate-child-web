import { describe, expect, it } from 'vitest';
import { extractToken, isPickupToken } from './token';

const token = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopq';

describe('extractToken', () => {
  it('accepts a 43-character query token', () => {
    expect(extractToken('/pickup', `?token=${token}`)).toBe(token);
  });

  it('accepts a 43-character path token', () => {
    expect(extractToken(`/${token}`, '')).toBe(token);
  });

  it('rejects a missing or short token without calling an API', () => {
    expect(extractToken('/', '')).toBe('');
    expect(extractToken('/pickup', '')).toBe('');
    expect(isPickupToken('short')).toBe(false);
  });
});
