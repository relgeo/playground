export type PreviewToolbarMode = 'model' | 'physical';

export function getPreviewToolbarMode(isPrintMode: boolean): PreviewToolbarMode {
  return isPrintMode ? 'physical' : 'model';
}

export function getPreviewToolbarLabel(mode: PreviewToolbarMode): string {
  return mode === 'physical' ? 'Physical Preview' : 'Model Preview';
}

export function getPreviewToolbarAriaLabel(mode: PreviewToolbarMode): string {
  return `${getPreviewToolbarLabel(mode)} contextual controls`;
}

export function getPreviewToolbarHint(
  mode: PreviewToolbarMode,
  selectedSheetId: string | null
): string {
  if (mode === 'physical') {
    return selectedSheetId
      ? `Sheet/view print-oriented preview: ${selectedSheetId}`
      : 'Print-oriented preview surface';
  }
  return 'Authoring and geometry inspection surface';
}

export function getPreviewStageHint(mode: PreviewToolbarMode): string {
  const surface = mode === 'physical' ? 'print-oriented preview' : 'model preview';
  return `Drag to pan the ${surface}. Pinch to zoom on touch; hold Ctrl or Command and scroll to zoom with a pointer device.`;
}
