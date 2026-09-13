import { describe, expect, it } from 'vitest';
import { getGraphNavigationTarget } from '../graph-navigation';

const ids = ['exterior_walls', 'master_bed', 'bathroom', 'main_door'];

describe('graph keyboard navigation', () => {
  it('moves forward and backward through the deterministic visible order', () => {
    expect(getGraphNavigationTarget(ids, 'master_bed', 'ArrowRight')).toBe('bathroom');
    expect(getGraphNavigationTarget(ids, 'master_bed', 'ArrowDown')).toBe('bathroom');
    expect(getGraphNavigationTarget(ids, 'master_bed', 'ArrowLeft')).toBe('exterior_walls');
    expect(getGraphNavigationTarget(ids, 'master_bed', 'ArrowUp')).toBe('exterior_walls');
  });

  it('wraps at either end for directional navigation', () => {
    expect(getGraphNavigationTarget(ids, 'exterior_walls', 'ArrowLeft')).toBe('main_door');
    expect(getGraphNavigationTarget(ids, 'main_door', 'ArrowRight')).toBe('exterior_walls');
  });

  it('jumps to the first and last visible node', () => {
    expect(getGraphNavigationTarget(ids, 'bathroom', 'Home')).toBe('exterior_walls');
    expect(getGraphNavigationTarget(ids, 'bathroom', 'End')).toBe('main_door');
  });

  it('returns null for an unknown node or unsupported key', () => {
    expect(getGraphNavigationTarget(ids, 'missing', 'ArrowRight')).toBeNull();
    expect(getGraphNavigationTarget(ids, 'bathroom', 'PageDown')).toBeNull();
    expect(getGraphNavigationTarget([], 'bathroom', 'Home')).toBeNull();
  });
});
