interface PlaygroundStatusInput {
  hasError: boolean;
  hasRenderablePreview: boolean;
  isResolving: boolean;
  isShowingFallback: boolean;
  isBootstrapping?: boolean;
  isEmpty?: boolean;
  bootstrapDetail?: string | null;
}

export type BootstrapPhase = 'opening' | 'restoring' | 'empty' | 'ready' | 'error';

export function isBootstrapInteractionBlocked(phase: BootstrapPhase): boolean {
  return phase === 'opening' || phase === 'restoring';
}

export interface PlaygroundStatusMeta {
  tone: 'error' | 'ready' | 'empty' | 'resolving' | 'loading';
  label: string;
  detail: string | null;
}

export function getPlaygroundStatusMeta({
  hasError,
  hasRenderablePreview,
  isResolving,
  isShowingFallback,
  isBootstrapping = false,
  isEmpty = false,
  bootstrapDetail = null,
}: PlaygroundStatusInput): PlaygroundStatusMeta {
  if (isBootstrapping) {
    return {
      tone: 'loading',
      label: 'LOADING',
      detail: bootstrapDetail ?? 'Opening the local workspace',
    };
  }

  if (isEmpty) {
    return {
      tone: 'empty',
      label: 'EMPTY',
      detail: 'No local files yet; starting from the default example',
    };
  }

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
    tone: 'empty',
    label: 'EMPTY',
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
