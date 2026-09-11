export function getEffectiveSheetId(
  selectedSheetId: string | null,
  isPrintMode: boolean
): string | null {
  return isPrintMode ? selectedSheetId : null;
}

export function shouldEnterPrintModeForSheetSelection(
  sheetId: string | null
): boolean {
  return sheetId !== null;
}

export function getNextPrintModeForSheetSelection(
  sheetId: string | null
): boolean {
  return sheetId !== null;
}

export function getExportFileName(
  selectedExample: string,
  selectedSheetId: string | null,
  isPrintMode: boolean
): string {
  if (isPrintMode && selectedSheetId) {
    return `relgeo-${selectedExample}-${selectedSheetId}.svg`;
  }

  return `relgeo-${selectedExample}.svg`;
}

export function getSheetPreviewEntryTarget(
  sheetIds: string[],
  selectedSheetId: string | null,
  isPrintMode: boolean
): string | null {
  if (isPrintMode || sheetIds.length === 0) {
    return null;
  }

  if (selectedSheetId && sheetIds.includes(selectedSheetId)) {
    return selectedSheetId;
  }

  return sheetIds[0] ?? null;
}

export function getSheetPreviewEntryLabel(
  sheetIds: string[],
  selectedSheetId: string | null,
  isPrintMode: boolean
): string | null {
  const target = getSheetPreviewEntryTarget(sheetIds, selectedSheetId, isPrintMode);
  if (!target) {
    return null;
  }

  if (selectedSheetId === target) {
    return `Return to Sheet/View: ${target}`;
  }

  return `Open Sheet/View: ${target}`;
}
