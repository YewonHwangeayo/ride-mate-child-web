import { describe, expect, it } from 'vitest';
import { digitsOnly, formatPhone, isValidPhone, maskPhone, mmss } from './phone';

describe('phone helpers', () => {
  it('formats as the user types', () => {
    expect(formatPhone('010')).toBe('010');
    expect(formatPhone('0101234')).toBe('010-1234');
    expect(formatPhone('01012345678')).toBe('010-1234-5678');
    expect(formatPhone('0111234567')).toBe('011-123-4567');
  });
  it('validates with the server rule and sends digits only', () => {
    expect(isValidPhone('010-1234-5678')).toBe(true);
    expect(isValidPhone('010-123')).toBe(false);
    expect(isValidPhone('02-123-4567')).toBe(false);
    expect(digitsOnly('010-1234-5678')).toBe('01012345678');
  });
  it('masks the middle digits and formats countdowns', () => {
    expect(maskPhone('01012345678')).toBe('010-****-5678');
    expect(mmss(168)).toBe('2:48');
    expect(mmss(-3)).toBe('0:00');
  });
});
