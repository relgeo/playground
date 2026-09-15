import { describe, expect, it } from 'vitest';
import {
  getPreviewStageHint,
  getPreviewToolbarAriaLabel,
  getPreviewToolbarHint,
  getPreviewToolbarLabel,
  getPreviewToolbarMode,
} from '../preview-toolbar';

describe('preview toolbar helpers', () => {
  it('derives toolbar mode from print mode flag', () => {
    expect(getPreviewToolbarMode(false)).toBe('model');
    expect(getPreviewToolbarMode(true)).toBe('physical');
  });

  it('returns a mode-appropriate toolbar label', () => {
    expect(getPreviewToolbarLabel('model')).toBe('Model Preview');
    expect(getPreviewToolbarLabel('physical')).toBe('Physical Preview');
  });

  it('names the contextual toolbar separately from global preview controls', () => {
    expect(getPreviewToolbarAriaLabel('model')).toBe('Model Preview contextual controls');
    expect(getPreviewToolbarAriaLabel('physical')).toBe('Physical Preview contextual controls');
  });

  it('returns a mode-appropriate toolbar hint', () => {
    expect(getPreviewToolbarHint('model', null)).toBe(
      'Authoring and geometry inspection surface'
    );
    expect(getPreviewToolbarHint('physical', 'a4-main')).toBe(
      'Sheet/view print-oriented preview: a4-main'
    );
  });

  it('describes the pan and zoom gesture for each preview surface', () => {
    expect(getPreviewStageHint('model')).toContain('model preview');
    expect(getPreviewStageHint('physical')).toContain('print-oriented preview');
    expect(getPreviewStageHint('model')).toContain('Ctrl or Command');
  });
});
