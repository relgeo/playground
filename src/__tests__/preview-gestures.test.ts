import { describe, expect, it } from 'vitest';
import { computePinchPan, computePinchZoom, getPointerCenter, getPointerDistance } from '../preview-gestures';

describe('preview gesture helpers', () => {
  it('computes pointer distance', () => {
    expect(getPointerDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('computes the midpoint between two pointers', () => {
    expect(getPointerCenter({ x: 10, y: 20 }, { x: 30, y: 60 })).toEqual({ x: 20, y: 40 });
  });

  it('scales pinch zoom by the distance ratio', () => {
    expect(computePinchZoom(100, 20, 30)).toBe(150);
    expect(computePinchZoom(100, 20, 10)).toBe(50);
  });

  it('keeps the starting zoom for invalid or zero-distance input', () => {
    expect(computePinchZoom(100, 0, 30)).toBe(100);
    expect(computePinchZoom(100, 20, 0)).toBe(100);
    expect(computePinchZoom(100, Number.NaN, 30)).toBe(100);
  });

  it('keeps the pinch focal point stable while zooming', () => {
    expect(computePinchPan(
      { x: 10, y: 20 },
      { x: 100, y: 80 },
      { x: 100, y: 80 },
      100,
      200,
    )).toEqual({ x: 120, y: 120 });
  });

  it('follows midpoint movement while preserving the content point', () => {
    expect(computePinchPan(
      { x: 10, y: 20 },
      { x: 100, y: 80 },
      { x: 120, y: 100 },
      100,
      200,
    )).toEqual({ x: 100, y: 100 });
  });

  it('keeps the starting pan for invalid pinch pan input', () => {
    expect(computePinchPan(
      { x: 10, y: 20 },
      { x: Number.NaN, y: 80 },
      { x: 120, y: 100 },
      100,
      200,
    )).toEqual({ x: 10, y: 20 });
  });
});
