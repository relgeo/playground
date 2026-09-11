import type { ResolvedScene } from 'relgeo-core';

export interface PreviewFrameSize {
  width: number;
  height: number;
}

export interface PreviewScreenScale {
  pxPerSceneUnit: number;
  sceneUnitsPerPx: number;
}

export type PreviewFrameSemantics = 'logical' | 'physical';

export function getUnitToCssPxRatio(unit: ResolvedScene['unit']): number {
  switch (unit) {
    case 'mm':
      return 3.7795275591;
    case 'cm':
      return 37.795275591;
    case 'in':
      return 96;
    case 'm':
      return 3779.5275591;
    case 'px':
    default:
      return 1;
  }
}

function getCssLengthValue(value: number, unit: ResolvedScene['unit']): string {
  if (unit === 'm') return `${value * 1000}mm`;
  return `${value}${unit}`;
}

export function getPreviewFrameSize(
  scene?: ResolvedScene,
  selectedSheetId?: string | null,
  semantics: PreviewFrameSemantics = 'logical'
): PreviewFrameSize | null {
  if (!scene) return null;

  if (selectedSheetId && scene.sheets?.[selectedSheetId]) {
    const sheet = scene.sheets[selectedSheetId];
    const ratio = semantics === 'physical' ? getUnitToCssPxRatio(scene.unit) : 1;
    return {
      width: sheet.width * ratio,
      height: sheet.height * ratio,
    };
  }

  if (scene.autoSize === false || !scene.bbox) {
    return null;
  }

  const padding = scene.padding ?? 20;
  const ratio = semantics === 'physical' ? getUnitToCssPxRatio(scene.unit) : 1;
  return {
    width: (scene.bbox.width + padding * 2) * ratio,
    height: (scene.bbox.height + padding * 2) * ratio,
  };
}

export function getPreviewFrameCssSize(
  scene?: ResolvedScene,
  selectedSheetId?: string | null
): PreviewFrameSize | null {
  if (!scene) return null;

  if (selectedSheetId && scene.sheets?.[selectedSheetId]) {
    return {
      width: Number.NaN,
      height: Number.NaN,
    };
  }

  if (scene.autoSize === false || !scene.bbox) {
    return null;
  }

  const padding = scene.padding ?? 20;
  return {
    width: scene.bbox.width + padding * 2,
    height: scene.bbox.height + padding * 2,
  };
}

export function formatPreviewFrameCssLength(
  scene: ResolvedScene,
  value: number
): string {
  return getCssLengthValue(value, scene.unit);
}

export function computeFitZoomPercent(
  frame: PreviewFrameSize | null,
  containerWidth: number,
  containerHeight: number
): number | null {
  if (!frame) return null;
  if (frame.width <= 0 || frame.height <= 0) return null;
  if (containerWidth <= 0 || containerHeight <= 0) return null;

  const scaleX = containerWidth / frame.width;
  const scaleY = containerHeight / frame.height;
  const zoom = Math.min(scaleX, scaleY) * 100;

  return Math.min(10000, Math.max(0.01, Math.round(zoom * 100) / 100));
}

export function computePreviewScreenScale(
  logicalFrame: PreviewFrameSize | null,
  physicalFrame: PreviewFrameSize | null,
  zoomPercent: number
): PreviewScreenScale | null {
  if (!logicalFrame || !physicalFrame) return null;
  if (logicalFrame.width <= 0 || logicalFrame.height <= 0) return null;
  if (physicalFrame.width <= 0 || physicalFrame.height <= 0) return null;
  if (zoomPercent <= 0) return null;

  const displayWidthPx = physicalFrame.width * (zoomPercent / 100);
  const displayHeightPx = physicalFrame.height * (zoomPercent / 100);
  const pxPerSceneUnitX = displayWidthPx / logicalFrame.width;
  const pxPerSceneUnitY = displayHeightPx / logicalFrame.height;
  const pxPerSceneUnit = Math.max(0.0001, Math.min(pxPerSceneUnitX, pxPerSceneUnitY));

  return {
    pxPerSceneUnit,
    sceneUnitsPerPx: 1 / pxPerSceneUnit,
  };
}
