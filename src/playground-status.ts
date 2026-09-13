interface PlaygroundStatusInput {
  hasError: boolean;
  hasRenderablePreview: boolean;
  isResolving: boolean;
  isShowingFallback: boolean;
}

export interface PlaygroundStatusMeta {
  tone: 'error' | 'ready' | 'idle' | 'resolving';
  label: string;
  detail: string | null;
}

export function getPlaygroundStatusMeta({
  hasError,
  hasRenderablePreview,
  isResolving,
  isShowingFallback,
}: PlaygroundStatusInput): PlaygroundStatusMeta {
  if (isResolving && isShowingFallback) {
    return {
      tone: 'resolving',
      label: 'RESOLVING',
      detail: 'Showing last successful preview',
    };
  }

  if (isResolving) {
    return {
      tone: 'resolving',
      label: 'RESOLVING',
      detail: null,
    };
  }

  if (hasError && isShowingFallback) {
    return {
      tone: 'error',
      label: 'ERROR',
      detail: 'Preview is from last successful render',
    };
  }

  if (hasError) {
    return {
      tone: 'error',
      label: 'ERROR',
      detail: null,
    };
  }

  if (hasRenderablePreview) {
    return {
      tone: 'ready',
      label: 'READY',
      detail: null,
    };
  }

  return {
    tone: 'idle',
    label: 'IDLE',
    detail: null,
  };
}

export function getPreviewRecoveryHint({
  hasError,
  isResolving,
  isShowingFallback,
}: Pick<PlaygroundStatusInput, 'hasError' | 'isResolving' | 'isShowingFallback'>): string | null {
  if (!hasError || !isShowingFallback) {
    return hasError
      ? 'No successful preview is available yet. Fix the source or reset to the selected example to recover a known-good starting point.'
      : null;
  }

  if (isResolving) {
    return 'Latest compile failed, but the canvas is still showing the last successful preview while a newer request is in flight.';
  }

  return 'Latest compile failed. The canvas is still showing the last successful preview so you can keep editing without losing visual context.';
}
