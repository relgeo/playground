export interface PointerPosition {
  x: number;
  y: number;
}

export interface PanOffset {
  x: number;
  y: number;
}

export function getPointerDistance(first: PointerPosition, second: PointerPosition): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

export function getPointerCenter(first: PointerPosition, second: PointerPosition): PointerPosition {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

export function computePinchZoom(
  startZoom: number,
  startDistance: number,
  currentDistance: number,
): number {
  if (![startZoom, startDistance, currentDistance].every(Number.isFinite)) return startZoom;
  if (startZoom <= 0 || startDistance <= 0 || currentDistance <= 0) return startZoom;
  return startZoom * (currentDistance / startDistance);
}

/**
 * Keeps the content under the pinch midpoint stable while the zoom changes.
 * Coordinates are client-space positions; stageOrigin is the stage's client
 * origin, and pan is the stage scroll offset captured at pinch start.
 */
export function computePinchPan(
  startPan: PanOffset,
  startCenter: PointerPosition,
  currentCenter: PointerPosition,
  startZoom: number,
  currentZoom: number,
  stageOrigin: PointerPosition = { x: 0, y: 0 },
): PanOffset {
  if (![startPan.x, startPan.y, startCenter.x, startCenter.y, currentCenter.x, currentCenter.y,
    startZoom, currentZoom, stageOrigin.x, stageOrigin.y].every(Number.isFinite)) {
    return startPan;
  }
  if (startZoom <= 0 || currentZoom <= 0) return startPan;

  const startScale = startZoom / 100;
  const currentScale = currentZoom / 100;
  const contentPoint = {
    x: (startPan.x + startCenter.x - stageOrigin.x) / startScale,
    y: (startPan.y + startCenter.y - stageOrigin.y) / startScale,
  };

  return {
    x: contentPoint.x * currentScale - (currentCenter.x - stageOrigin.x),
    y: contentPoint.y * currentScale - (currentCenter.y - stageOrigin.y),
  };
}
