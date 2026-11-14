import { describe, expect, it } from 'vitest';
import { readUserCode } from './qrCode';

describe('readUserCode', () => {
  it('accepts the server QR format and common variants', () => {
    expect(readUserCode('/qr', '?code=MDPuhP4rmOmrbawrY6RKZw')).toBe('MDPuhP4rmOmrbawrY6RKZw');
    expect(readUserCode('/qr', '?userCode=abc')).toBe('abc');
    expect(readUserCode('/qr', '?user_code=abc')).toBe('abc');
    expect(readUserCode('/qr/abc', '')).toBe('abc');
    expect(readUserCode('/qr', '?code=%3Cabc%3E')).toBe('abc');
    expect(readUserCode('/qr', '')).toBe('');
  });
});
