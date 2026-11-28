import { describe, expect, it } from 'vitest';
import {
  createParameterMetadata,
  getProfileOverrides,
  getParameterStep,
  hasParameterValueChanges,
  normalizeParameterBounds,
  validateParameterDraft,
} from '../parameter-controls';

describe('numeric parameter metadata', () => {
  it('preserves declared bounds and explicit spinner steps', () => {
    expect(createParameterMetadata(2.5, 'length', '1cm', '5cm', 0.5)).toEqual({
      defaultValue: 2.5,
      type: 'length',
      min: 1,
      max: 5,
      step: 0.5,
    });
  });

  it('uses the documented 1, 2, 5 step rounding for valid ranges', () => {
    expect(getParameterStep(0, 100)).toBe(1);
    expect(getParameterStep(0, 250)).toBe(5);
    expect(getParameterStep(undefined, 100)).toBe(0.1);
  });

  it('omits invalid bounds instead of inventing a 0–100 range', () => {
    expect(normalizeParameterBounds('not-a-number', Infinity)).toEqual({});
    expect(createParameterMetadata(12, undefined, 'not-a-number', undefined, undefined)).toEqual({
      defaultValue: 12,
      type: undefined,
      step: 0.1,
    });
  });

  it('does not expose non-numeric parameters as number fields', () => {
    expect(createParameterMetadata(true, 'boolean', undefined, undefined, undefined)).toBeUndefined();
  });
});

describe('numeric parameter drafts', () => {
  const bounds = { min: 1, max: 10 };

  it('keeps empty and incomplete drafts invalid without producing NaN', () => {
    expect(validateParameterDraft('', bounds)).toEqual({ valid: false, message: 'Enter a value.' });
    expect(validateParameterDraft('-', bounds)).toEqual({ valid: false, message: 'Enter a finite number.' });
    expect(validateParameterDraft('1e', bounds)).toEqual({ valid: false, message: 'Enter a finite number.' });
  });

  it('reports explicit range errors but accepts manual values between steps', () => {
    expect(validateParameterDraft('0', bounds)).toEqual({ valid: false, message: 'Value must be at least 1.' });
    expect(validateParameterDraft('11', bounds)).toEqual({ valid: false, message: 'Value must be at most 10.' });
    expect(validateParameterDraft('3.7', bounds)).toEqual({ valid: true, value: 3.7 });
  });

  it('rejects non-finite values before they can reach preview state', () => {
    expect(validateParameterDraft('Infinity', bounds).valid).toBe(false);
    expect(validateParameterDraft('NaN', bounds).valid).toBe(false);
  });

  it('normalizes direct and wrapped profile values into parameter paths', () => {
    expect(getProfileOverrides({ width: 15, nested: { height: '2cm' } })).toEqual({
      width: 15,
      'nested.height': 2,
    });
    expect(getProfileOverrides({ overrides: { width: 20 } })).toEqual({ width: 20 });
  });

  it('detects changes against the active profile or document baseline', () => {
    expect(hasParameterValueChanges({ width: 12 }, { width: 10 })).toBe(true);
    expect(hasParameterValueChanges({ width: 10 }, { width: 10 })).toBe(false);
    expect(hasParameterValueChanges({}, { width: 10 })).toBe(true);
  });
});
