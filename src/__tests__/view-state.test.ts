import { describe, expect, it } from 'vitest';
import {
  getExportFileName,
  getEffectiveSheetId,
  getNextPrintModeForSheetSelection,
  getSheetPreviewEntryLabel,
  getSheetPreviewEntryTarget,
  shouldEnterPrintModeForSheetSelection,
} from '../view-state';

describe('playground view state helpers', () => {
  it('activates selected sheet only in print mode', () => {
    expect(getEffectiveSheetId('drawing1', true)).toBe('drawing1');
    expect(getEffectiveSheetId('drawing1', false)).toBeNull();
    expect(getEffectiveSheetId(null, true)).toBeNull();
  });

  it('enters print mode automatically when a sheet is explicitly selected', () => {
    expect(shouldEnterPrintModeForSheetSelection('drawing1')).toBe(true);
    expect(shouldEnterPrintModeForSheetSelection(null)).toBe(false);
  });

  it('keeps print mode aligned with explicit sheet selection changes', () => {
    expect(getNextPrintModeForSheetSelection('drawing1')).toBe(true);
    expect(getNextPrintModeForSheetSelection(null)).toBe(false);
  });

  it('uses a sheet-specific export name only for active print sheets', () => {
    expect(getExportFileName('technical_sheets', 'drawing1', true)).toBe(
      'relgeo-technical_sheets-drawing1.svg'
    );
    expect(getExportFileName('technical_sheets', 'drawing1', false)).toBe(
      'relgeo-technical_sheets.svg'
    );
    expect(getExportFileName('technical_sheets', null, true)).toBe(
      'relgeo-technical_sheets.svg'
    );
  });

  it('offers a first-sheet entry target only while still in model preview', () => {
    expect(
      getSheetPreviewEntryTarget(['drawing1', 'drawing2'], null, false)
    ).toBe('drawing1');
    expect(
      getSheetPreviewEntryTarget(['drawing1', 'drawing2'], 'drawing2', false)
    ).toBe('drawing2');
    expect(
      getSheetPreviewEntryTarget(['drawing1', 'drawing2'], 'drawing2', true)
    ).toBeNull();
    expect(getSheetPreviewEntryTarget([], null, false)).toBeNull();
  });

  it('derives a lightweight onboarding label for sheet/view entry', () => {
    expect(
      getSheetPreviewEntryLabel(['drawing1', 'drawing2'], null, false)
    ).toBe('Open Sheet/View: drawing1');
    expect(
      getSheetPreviewEntryLabel(['drawing1', 'drawing2'], 'drawing2', false)
    ).toBe('Return to Sheet/View: drawing2');
    expect(
      getSheetPreviewEntryLabel(['drawing1', 'drawing2'], 'drawing2', true)
    ).toBeNull();
  });
});
