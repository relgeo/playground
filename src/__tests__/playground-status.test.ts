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

  it('returns a recovery hint only for stale-on-error preview', () => {
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
  });
});
