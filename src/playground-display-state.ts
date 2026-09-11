import type { RelGeoDocument, ResolvedScene } from 'relgeo-core';

export interface PlaygroundRenderSnapshot {
  doc: RelGeoDocument | null;
  resolvedData: ResolvedScene | null;
  svgContent: string;
}

interface ResolveDisplayStateInput {
  current: PlaygroundRenderSnapshot;
  fallback: PlaygroundRenderSnapshot | null;
}

export function resolveDisplayRenderState({
  current,
  fallback,
}: ResolveDisplayStateInput): PlaygroundRenderSnapshot {
  const hasCurrentRender =
    current.doc !== null || current.resolvedData !== null || current.svgContent !== '';

  if (hasCurrentRender || !fallback) {
    return current;
  }

  return fallback;
}

export function isUsingFallbackRender({
  current,
  fallback,
}: ResolveDisplayStateInput): boolean {
  const hasCurrentRender =
    current.doc !== null || current.resolvedData !== null || current.svgContent !== '';

  return !hasCurrentRender && fallback !== null;
}
