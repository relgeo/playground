import { describe, expect, it } from 'vitest';
import {
  getPlaygroundStatusMeta,
  getPreviewRecoveryHint,
} from '../playground-status';

describe('playground status helpers', () => {
  it('reports fallback preview while resolving', () => {
    expect(
      getPlaygroundStatusMeta({
        hasError: false,
        hasRenderablePreview: true,
        isResolving: true,
        isShowingFallback: true,
      })
    ).toEqual({
      tone: 'resolving',
      label: 'RESOLVING',
      detail: 'Showing last successful preview',
    });
  });

  it('reports stale preview after an error', () => {
    expect(
      getPlaygroundStatusMeta({
        hasError: true,
        hasRenderablePreview: true,
        isResolving: false,
        isShowingFallback: true,
      })
    ).toEqual({
      tone: 'error',
      label: 'ERROR',
      detail: 'Preview is from last successful render',
    });
  });

  it('reports ready when preview is current', () => {
    expect(
      getPlaygroundStatusMeta({
        hasError: false,
        hasRenderablePreview: true,
        isResolving: false,
        isShowingFallback: false,
      })
    ).toEqual({
      tone: 'ready',
      label: 'READY',
      detail: null,
    });
  });

  it('keeps resolving explicit when no fallback preview exists yet', () => {
    expect(
      getPlaygroundStatusMeta({
        hasError: false,
        hasRenderablePreview: false,
        isResolving: true,
        isShowingFallback: false,
      })
    ).toEqual({
      tone: 'resolving',
      label: 'RESOLVING',
      detail: null,
    });
  });

  it('returns a recovery hint for stale and first-error states', () => {
    expect(
      getPreviewRecoveryHint({
        hasError: true,
        isResolving: false,
        isShowingFallback: true,
      })
    ).toContain('last successful preview');

    expect(
      getPreviewRecoveryHint({
        hasError: false,
        isResolving: false,
        isShowingFallback: true,
      })
    ).toBeNull();

    expect(
      getPreviewRecoveryHint({
        hasError: true,
        isResolving: false,
        isShowingFallback: false,
      })
    ).toContain('reset to the selected example');
  });
});
