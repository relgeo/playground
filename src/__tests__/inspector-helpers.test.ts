import { describe, expect, it } from 'vitest';
import { getClosedShapeMetricLabel } from '../inspector-helpers';

describe('inspector helpers', () => {
  it('uses perimeter wording for closed shapes', () => {
    expect(getClosedShapeMetricLabel('polygon', true)).toBe('Perimeter');
    expect(getClosedShapeMetricLabel('path', true)).toBe('Perimeter');
  });

  it('keeps total length wording for open paths', () => {
    expect(getClosedShapeMetricLabel('path', false)).toBe('Total Length');
  });
});
