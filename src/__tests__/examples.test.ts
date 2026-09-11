import { describe, expect, it } from 'vitest';
import { DEFAULT_EXAMPLE_KEY, EXAMPLES } from '../examples';

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

  it('labels historical public examples as historical', () => {
    const historicalKeys = ['v02_showcase', 'v03_showcase', 'v03_holes'] as const;

    for (const key of historicalKeys) {
      expect(EXAMPLES[key].category).toBe('Historical Showcases');
      expect(EXAMPLES[key].name.startsWith('Historical:')).toBe(true);
    }
  });
});
