import { describe, expect, it } from 'vitest';
import { getDiagnosticCode } from '../diagnostic-code';

describe('diagnostic code presentation', () => {
  it('preserves the worker error code when one is available', () => {
    expect(getDiagnosticCode({ code: 'E_UNKNOWN_ANCHOR', path: 'objects.wall' })).toBe(
      'E_UNKNOWN_ANCHOR',
    );
  });

  it('uses a validation fallback for path-addressable errors', () => {
    expect(getDiagnosticCode({ code: null, path: 'objects.wall' })).toBe('VALIDATION_FAILED');
  });

  it('uses a compile fallback for errors without a path', () => {
    expect(getDiagnosticCode({})).toBe('COMPILE_ERROR');
  });
});
