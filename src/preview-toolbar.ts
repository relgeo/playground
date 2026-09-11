export type PreviewToolbarMode = 'model' | 'physical';

export function getPreviewToolbarMode(isPrintMode: boolean): PreviewToolbarMode {
  return isPrintMode ? 'physical' : 'model';
}

export function getPreviewToolbarLabel(mode: PreviewToolbarMode): string {
  return mode === 'physical' ? 'Physical Preview' : 'Model Preview';
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
