import { describe, expect, it } from 'vitest';
import { cameraBounds, outputSize } from './compositor';
import { cameraError } from './recorder';

describe('camera overlay layout', () => {
  it.each([
    [3840, 2160],
    [2560, 1080],
    [1080, 1920],
    [640, 480],
  ])('fits %i × %i inside 1080p without upscaling', (width, height) => {
    const result = outputSize(width, height);
    expect(result.width).toBeLessThanOrEqual(Math.min(width, 1920));
    expect(result.height).toBeLessThanOrEqual(Math.min(height, 1080));
    expect(result.width % 2).toBe(0);
    expect(result.height % 2).toBe(0);
    const face = cameraBounds(result.width, result.height);
    expect(face.x).toBeGreaterThan(0);
    expect(face.y).toBeGreaterThan(0);
    expect(face.x + face.size).toBeLessThan(result.width);
    expect(face.y + face.size).toBeLessThan(result.height);
  });
  it('offers camera-specific recovery for absent or blocked cameras', () => {
    expect(cameraError(new DOMException('', 'NotFoundError'))).toContain('No camera');
    expect(cameraError(new DOMException('', 'NotAllowedError'))).toContain(
      'Camera access is blocked',
    );
  });
});
