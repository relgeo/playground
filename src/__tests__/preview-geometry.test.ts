import { describe, expect, it } from 'vitest';
import type { ResolvedScene } from '@relgeo/core';
import {
  computeFitZoomPercent,
  computePreviewScreenScale,
  getPreviewFrameSize,
} from '../preview-geometry';

describe('preview geometry', () => {
  const createScene = (unit: ResolvedScene['unit']): ResolvedScene => ({
    unit,
    autoSize: true,
    padding: 2,
    objects: {},
    parameters: {},
    values: {},
    bbox: { x: 0, y: 0, width: 10, height: 10 },
  });

  it('keeps the same logical preview frame for mm and m scenes with identical geometry', () => {
    expect(getPreviewFrameSize(createScene('mm'), null, 'logical')).toEqual({ width: 14, height: 14 });
    expect(getPreviewFrameSize(createScene('m'), null, 'logical')).toEqual({ width: 14, height: 14 });
  });

  it('uses physical frame size for model preview geometry', () => {
    const mmFrame = getPreviewFrameSize(createScene('mm'), null, 'physical');
    const mFrame = getPreviewFrameSize(createScene('m'), null, 'physical');

    expect(mmFrame?.width).toBeCloseTo(52.9133858274, 8);
    expect(mmFrame?.height).toBeCloseTo(52.9133858274, 8);
    expect(mFrame?.width).toBeCloseTo(52913.3858274, 4);
    expect(mFrame?.height).toBeCloseTo(52913.3858274, 4);
  });

  it('computes different fit zoom for mm and m scenes when using physical geometry semantics', () => {
    const mmFrame = getPreviewFrameSize(createScene('mm'), null, 'physical');
    const mFrame = getPreviewFrameSize(createScene('m'), null, 'physical');

    expect(computeFitZoomPercent(mmFrame, 760, 560)).toBeCloseTo(1058.33, 2);
    expect(computeFitZoomPercent(mFrame, 760, 560)).toBeCloseTo(1.06, 2);
  });

  it('keeps preview screen scale consistent for equivalent mm and m fit scenes', () => {
    const mmLogical = getPreviewFrameSize(createScene('mm'), null, 'logical');
    const mmPhysical = getPreviewFrameSize(createScene('mm'), null, 'physical');
    const mLogical = getPreviewFrameSize(createScene('m'), null, 'logical');
    const mPhysical = getPreviewFrameSize(createScene('m'), null, 'physical');

    const mmZoom = computeFitZoomPercent(mmPhysical, 760, 560);
    const mZoom = computeFitZoomPercent(mPhysical, 760, 560);

    const mmScale = computePreviewScreenScale(mmLogical, mmPhysical, mmZoom!);
    const mScale = computePreviewScreenScale(mLogical, mPhysical, mZoom!);

    expect(mmScale?.pxPerSceneUnit).toBeCloseTo(mScale!.pxPerSceneUnit, 0);
    expect(mmScale?.sceneUnitsPerPx).toBeCloseTo(mScale!.sceneUnitsPerPx, 3);
  });

  it('derives overlay scale from screen scale instead of legacy zoom inversion', () => {
    const mmLogical = getPreviewFrameSize(createScene('mm'), null, 'logical');
    const mmPhysical = getPreviewFrameSize(createScene('mm'), null, 'physical');
    const mLogical = getPreviewFrameSize(createScene('m'), null, 'logical');
    const mPhysical = getPreviewFrameSize(createScene('m'), null, 'physical');

    const mmScale = computePreviewScreenScale(mmLogical, mmPhysical, 961);
    const mScale = computePreviewScreenScale(mLogical, mPhysical, 0.96);

    expect(mmScale?.sceneUnitsPerPx).toBeGreaterThan(0.02);
    expect(mmScale?.sceneUnitsPerPx).toBeLessThan(0.03);
    expect(mScale?.sceneUnitsPerPx).toBeGreaterThan(0.02);
    expect(mScale?.sceneUnitsPerPx).toBeLessThan(0.03);
    expect(mScale?.sceneUnitsPerPx).not.toBeCloseTo(100 / 0.96, 2);
  });

  it('prefers selected sheet dimensions when present', () => {
    const scene: ResolvedScene = {
      ...createScene('mm'),
      sheets: {
        main: {
          id: 'main',
          width: 297,
          height: 210,
          views: [],
        },
      },
    };

    expect(getPreviewFrameSize(scene, 'main', 'logical')).toEqual({ width: 297, height: 210 });
    const physicalSheetFrame = getPreviewFrameSize(scene, 'main', 'physical');
    expect(physicalSheetFrame?.width).toBeCloseTo(1122.519685, 6);
    expect(physicalSheetFrame?.height).toBeCloseTo(793.700787, 6);
  });

  it('rejects non-finite frames instead of producing an invalid zoom', () => {
    expect(computeFitZoomPercent({ width: Number.NaN, height: 100 }, 760, 560)).toBeNull();
    expect(computeFitZoomPercent({ width: Number.POSITIVE_INFINITY, height: 100 }, 760, 560)).toBeNull();
    expect(computeFitZoomPercent({ width: 100, height: 100 }, Number.NaN, 560)).toBeNull();
  });
});
