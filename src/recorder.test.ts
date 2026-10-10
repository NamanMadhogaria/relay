import { describe, expect, it } from 'vitest';
import { RecordingClock, captureError, formatTime } from './recorder';

describe('recording elapsed time', () => {
  it('excludes paused time across multiple pause cycles', () => {
    const clock = new RecordingClock();
    clock.start(100);
    clock.pause(2100);
    expect(clock.elapsed(9100)).toBe(2000);
    clock.resume(10100);
    clock.pause(11100);
    clock.resume(20100);
    expect(clock.elapsed(22100)).toBe(5000);
  });
  it('handles duplicate pause and resume without losing time', () => {
    const clock = new RecordingClock();
    clock.start(0);
    clock.resume(1000);
    clock.pause(2000);
    clock.pause(3000);
    expect(clock.elapsed(4000)).toBe(2000);
    clock.start(5000);
    expect(clock.elapsed(6000)).toBe(1000);
  });
  it('formats minutes without rounding up', () => {
    expect(formatTime(59999)).toBe('00:59');
    expect(formatTime(300000)).toBe('05:00');
    expect(formatTime(3599999)).toBe('59:59');
    expect(formatTime(3600000)).toBe('1:00:00');
    expect(formatTime(90305000)).toBe('25:05:05');
  });
});

describe('permission errors', () => {
  it('offers a recovery path when capture permission is denied', () => {
    expect(captureError(new DOMException('Denied', 'NotAllowedError'))).toContain('Try again');
  });
});
