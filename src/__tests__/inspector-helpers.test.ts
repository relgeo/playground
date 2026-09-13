import { describe, expect, it } from 'vitest';
import { getClosedShapeMetricLabel, getRelatedObjectIds } from '../inspector-helpers';

describe('inspector helpers', () => {
  it('uses perimeter wording for closed shapes', () => {
    expect(getClosedShapeMetricLabel('polygon', true)).toBe('Perimeter');
    expect(getClosedShapeMetricLabel('path', true)).toBe('Perimeter');
  });

  it('keeps total length wording for open paths', () => {
    expect(getClosedShapeMetricLabel('path', false)).toBe('Total Length');
  });
});

describe('related object navigation', () => {
  const graph = [
    { id: 'base', deps: [] },
    { id: 'derived', deps: ['base'] },
    { id: 'annotation', deps: ['derived'] },
    { id: 'unrelated', deps: [] },
  ];

  it('includes direct and indirect dependencies in both directions', () => {
    expect(getRelatedObjectIds(graph, 'base', Object.keys({ base: {}, derived: {}, annotation: {} }))).toEqual([
      'derived',
      'annotation',
    ]);
    expect(getRelatedObjectIds(graph, 'annotation', Object.keys({ base: {}, derived: {}, annotation: {} }))).toEqual([
      'derived',
      'base',
    ]);
  });

  it('bounds the neighborhood and ignores unavailable objects', () => {
    expect(getRelatedObjectIds(graph, 'base', ['base', 'derived', 'annotation'], 1)).toEqual(['derived']);
    expect(getRelatedObjectIds(graph, 'base', ['base', 'derived'], 2)).toEqual(['derived']);
  });
});
