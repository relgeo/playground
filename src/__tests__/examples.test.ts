import { describe, expect, it } from 'vitest';
import { DEFAULT_EXAMPLE_KEY, EXAMPLES } from '../examples';
import { processWorkerRequest } from '../worker';

describe('playground example surface', () => {
  it('uses a default example key that exists', () => {
    expect(EXAMPLES[DEFAULT_EXAMPLE_KEY]).toBeDefined();
  });

  it('keeps active onboarding examples available', () => {
    expect(EXAMPLES.fundamentals).toBeDefined();
    expect(EXAMPLES.path_join).toBeDefined();
    expect(EXAMPLES.split).toBeDefined();
    expect(EXAMPLES.architectural_plan).toBeDefined();
    expect(EXAMPLES.technical_sheets).toBeDefined();
    expect(EXAMPLES.v05_joined_bracket_detail).toBeDefined();
  });

  it('keeps the basic onboarding list in a readable numeric order', () => {
    expect(['fundamentals', 'ellipse_basics', 'boolean_csg', 'path_join', 'split'].map(
      (key) => EXAMPLES[key].name,
    )).toEqual([
      '01. Fundamentals',
      '02. Ellipse Basics',
      '03. Boolean CSG',
      '04. Path Join',
      '05. Split',
    ]);
  });

  it('labels historical public examples as historical', () => {
    const historicalKeys = ['v02_showcase', 'v03_showcase', 'v03_holes'] as const;

    for (const key of historicalKeys) {
      expect(EXAMPLES[key].category).toBe('Historical Showcases');
      expect(EXAMPLES[key].name.startsWith('Historical:')).toBe(true);
    }
  });

  it('keeps every bundled example compilable in the worker', () => {
    for (const [key, example] of Object.entries(EXAMPLES)) {
      const result = processWorkerRequest({
        code: example.code,
        overrides: {},
        hiddenRoles: [],
      });

      expect(result.type, `${key} should compile`).toBe('SUCCESS');
    }
  });
});
