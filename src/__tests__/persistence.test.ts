import { describe, expect, it } from 'vitest';
import {
  findExampleKeyByCode,
  resolveInitialPlaygroundState,
} from '../persistence';

const EXAMPLES = {
  fundamentals: { code: 'fundamentals-code' },
  technical_sheets: { code: 'technical-sheets-code' },
  architectural_plan: { code: 'architectural-plan-code' },
};

describe('playground persistence helpers', () => {
  it('finds exact example key by code', () => {
    expect(findExampleKeyByCode('technical-sheets-code', EXAMPLES)).toBe(
      'technical_sheets'
    );
    expect(findExampleKeyByCode('custom-code', EXAMPLES)).toBeNull();
  });

  it('prefers URL hash code and aligns selected example when code matches a bundled example', () => {
    const state = resolveInitialPlaygroundState({
      defaultExampleKey: 'architectural_plan',
      examples: EXAMPLES,
      hashCode: 'technical-sheets-code',
      draftCode: 'fundamentals-code',
      storedExampleKey: 'fundamentals',
    });

    expect(state.code).toBe('technical-sheets-code');
    expect(state.selectedExample).toBe('technical_sheets');
  });

  it('keeps stored selected example for custom local drafts', () => {
    const state = resolveInitialPlaygroundState({
      defaultExampleKey: 'architectural_plan',
      examples: EXAMPLES,
      draftCode: 'custom-draft-code',
      storedExampleKey: 'technical_sheets',
    });

    expect(state.code).toBe('custom-draft-code');
    expect(state.selectedExample).toBe('technical_sheets');
  });

  it('falls back to default example when no persisted state exists', () => {
    const state = resolveInitialPlaygroundState({
      defaultExampleKey: 'architectural_plan',
      examples: EXAMPLES,
    });

    expect(state.code).toBe('architectural-plan-code');
    expect(state.selectedExample).toBe('architectural_plan');
  });
});
