import { describe, expect, it } from 'vitest';
import { getClosedShapeMetricLabel, getFirstDiagnosticTarget, getRelatedObjectIds } from '../inspector-helpers';

describe('first diagnostic navigation', () => {
  it('prefers object, violation, path, and dependency targets in that order', () => {
    expect(getFirstDiagnosticTarget({
      error: { objectId: 'error-object', path: 'objects.error' },
      firstViolation: { objectId: 'violation-object' },
    })).toEqual({ kind: 'object', value: 'error-object' });

    expect(getFirstDiagnosticTarget({
      error: { path: 'objects.error' },
      firstViolation: { objectId: 'violation-object' },
    })).toEqual({ kind: 'object', value: 'violation-object' });

    expect(getFirstDiagnosticTarget({
      error: { path: 'objects.error' },
    })).toEqual({ kind: 'path', value: 'objects.error' });

    expect(getFirstDiagnosticTarget({
      error: { dependencyChain: ['first-node', 'second-node'] },
    })).toEqual({ kind: 'dependency', value: 'first-node' });
  });

  it('returns no target for a diagnostic without source navigation data', () => {
    expect(getFirstDiagnosticTarget({ error: { dependencyChain: [] } })).toBeNull();
  });
});

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
