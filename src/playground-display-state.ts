import type { RelGeoDocument, ResolvedScene } from '@relgeo/core';
import type { InspectorDependencyGraphEntry } from './inspector-helpers';

export interface PlaygroundRenderSnapshot {
  doc: RelGeoDocument | null;
  resolvedData: ResolvedScene | null;
  svgContent: string;
  dependencyGraph?: InspectorDependencyGraphEntry[];
}

interface ResolveDisplayStateInput {
  current: PlaygroundRenderSnapshot;
  fallback: PlaygroundRenderSnapshot | null;
}

export function resolveDisplayRenderState({
  current,
  fallback,
}: ResolveDisplayStateInput): PlaygroundRenderSnapshot {
  // The SVG is the user-facing render contract. A partially populated
  // response must not hide the last known-good canvas behind an empty one.
  const hasCurrentRender = current.svgContent !== '';

  if (hasCurrentRender || !fallback) {
    return current;
  }

  return fallback;
}

export function isUsingFallbackRender({
  current,
  fallback,
}: ResolveDisplayStateInput): boolean {
  const hasCurrentRender = current.svgContent !== '';

  return !hasCurrentRender && fallback !== null;
}
