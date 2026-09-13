import { getDependencyGraph, parseRelGeo, resolveGeometry } from '@relgeo/core';
import { renderToSVG } from '@relgeo/renderer-svg';
import type { WorkerRequest, WorkerResponse } from './types';

const offscreenCanvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(0, 0) : null;
const offscreenCtx = offscreenCanvas ? offscreenCanvas.getContext('2d') : null;

const playgroundTextMetricsProvider = {
  measure({ content, fontSize, lineHeight }: { content: string; fontSize: number; lineHeight: number }) {
    const lines = String(content ?? '').split('\n');

    if (offscreenCtx) {
      // Use Outfit/Inter or standard sans-serif font matching the Playground stylesheet
      offscreenCtx.font = `${fontSize}px sans-serif`;
      let maxWidth = 0;
      let maxAscent = fontSize * 0.8;
      let maxDescent = fontSize * 0.2;

      for (const line of lines) {
        const measured = offscreenCtx.measureText(line);
        maxWidth = Math.max(maxWidth, measured.width);
        maxAscent = Math.max(
          maxAscent,
          measured.actualBoundingBoxAscent || fontSize * 0.8
        );
        maxDescent = Math.max(
          maxDescent,
          measured.actualBoundingBoxDescent || fontSize * 0.2
        );
      }

      return {
        width: maxWidth,
        height: lines.length * fontSize * lineHeight,
        ascent: maxAscent,
        descent: maxDescent,
      };
    }
    // Determinisic fallback if OffscreenCanvas is unavailable
    const avgCharWidth = fontSize * 0.6;
    const longestLine = lines.reduce(
      (max, line) => Math.max(max, line.length),
      0
    );
    return {
      width: longestLine * avgCharWidth,
      height: lines.length * fontSize * lineHeight,
      ascent: fontSize * 0.8,
      descent: fontSize * 0.2,
    };
  },
};

export function processWorkerRequest({
  requestId,
  code,
  profile,
  overrides,
  selectedSheetId,
  showDimensions,
  showAnnotations,
  showAnchors,
  showBoundingBox,
  showLabels,
  hiddenRoles = ['construction'],
  nonScalingStroke,
}: WorkerRequest): WorkerResponse {
  try {
    // 1. Parse & Validate Document (Strict mode for better playground feedback)
    const doc = parseRelGeo(code, { mode: 'validate' });

    // 2. Resolve Geometry
    const scene = resolveGeometry(doc, {
      profile: profile || undefined,
      overrides: overrides || {},
      mode: 'validate',
      textMetrics: playgroundTextMetricsProvider
    });

    const dependencyGraph = getDependencyGraph(doc.objects, doc);

    // 3. Render to SVG
    const svgContent = renderToSVG(scene, {
      sheetId: selectedSheetId || undefined,
      showDimension: showDimensions !== false && !hiddenRoles.includes('dimension'),
      showAnnotation: showAnnotations !== false && !hiddenRoles.includes('annotation'),
      showConstruction: !hiddenRoles.includes('construction'),
      showGuide: !hiddenRoles.includes('guide'),
      showCenterline: !hiddenRoles.includes('centerline'),
      showHidden: !hiddenRoles.includes('hidden'),
      showSection: !hiddenRoles.includes('section'),
      showCut: !hiddenRoles.includes('cut'),
      showFold: !hiddenRoles.includes('fold'),
      showAnchors: showAnchors === true,
      showBoundingBox: showBoundingBox === true,
      showLabels: showLabels === true,
      nonScalingStroke,
    });

    // Send back results in strict typed response format
    return {
      requestId,
      type: 'SUCCESS',
      data: {
        doc,
        resolvedData: scene,
        svgContent,
        dependencyGraph,
      },
    };
  } catch (err: unknown) {
    const error = err as { message?: string; path?: string; objectId?: string; dependencyChain?: string[] };
    return {
      requestId,
      type: 'ERROR',
      error: error?.message ?? 'Unknown error',
      code: error?.code ?? null,
      path: error?.path ?? null,
      objectId: error?.objectId ?? null,
      dependencyChain: error?.dependencyChain ?? null,
    };
  }
}

if (typeof self !== 'undefined') {
  self.onmessage = (e: MessageEvent<WorkerRequest>) => {
    self.postMessage(processWorkerRequest(e.data));
  };
}
