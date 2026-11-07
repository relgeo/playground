import { describe, expect, it } from 'vitest';
import {
  getPlaygroundStatusMeta,
  getPreviewRecoveryHint,
  isBootstrapInteractionBlocked,
} from '../playground-status';

describe('playground status helpers', () => {
  it('blocks interaction only during opening and restore bootstrap phases', () => {
    expect(isBootstrapInteractionBlocked('opening')).toBe(true);
    expect(isBootstrapInteractionBlocked('restoring')).toBe(true);
    expect(isBootstrapInteractionBlocked('empty')).toBe(false);
    expect(isBootstrapInteractionBlocked('ready')).toBe(false);
    expect(isBootstrapInteractionBlocked('error')).toBe(false);
  });

  it('reports explicit bootstrap loading before workspace state is ready', () => {
    expect(
      getPlaygroundStatusMeta({
        hasError: false,
        hasRenderablePreview: false,
        isResolving: false,
        isShowingFallback: false,
        isBootstrapping: true,
        bootstrapDetail: 'Restoring local files',
      })
    ).toEqual({
      tone: 'loading',
      label: 'LOADING',
      detail: 'Restoring local files',
    });
  });

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

  it('reports an explicit empty workspace state after bootstrap has no local files', () => {
    expect(
      getPlaygroundStatusMeta({
        hasError: false,
        hasRenderablePreview: false,
        isResolving: true,
        isShowingFallback: false,
        isEmpty: true,
      })
    ).toEqual({
      tone: 'empty',
      label: 'EMPTY',
      detail: 'No local files yet; starting from the default example',
    });
  });

  it('reports bootstrap storage failure as ERROR instead of EMPTY or READY', () => {
    expect(
      getPlaygroundStatusMeta({
        hasError: false,
        hasRenderablePreview: true,
        isResolving: false,
        isShowingFallback: false,
        isBootstrapError: true,
        bootstrapErrorDetail: 'Browser storage is unavailable',
      })
    ).toEqual({
      tone: 'error',
      label: 'ERROR',
      detail: 'Browser storage is unavailable',
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
