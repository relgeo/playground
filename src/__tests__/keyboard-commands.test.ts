import { describe, expect, it } from 'vitest';
import { getPlaygroundKeyboardCommand } from '../keyboard-commands';

const command = (key: string, overrides: Partial<KeyboardEvent> = {}) => getPlaygroundKeyboardCommand({
  key,
  altKey: true,
  ctrlKey: true,
  metaKey: false,
  shiftKey: false,
  ...overrides,
});

describe('Playground keyboard command map', () => {
  it('keeps browser/editor defaults untouched without the app modifier', () => {
    expect(getPlaygroundKeyboardCommand({
      key: 's',
      altKey: false,
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
    })).toBeNull();
  });

  it('maps file and preview commands to the documented Mod+Alt surface', () => {
    expect(command('n')).toBe('new-file');
    expect(command('o')).toBe('open-file-picker');
    expect(command('s')).toBe('save-file');
    expect(command('s', { shiftKey: true })).toBe('save-as-file');
    expect(command('i')).toBe('import-file');
    expect(command('e')).toBe('export-file');
    expect(command('f')).toBe('fit-preview');
    expect(command('0')).toBe('reset-viewport');
  });

  it('maps diagnostics, drawer, and surface commands', () => {
    expect(command('d')).toBe('show-diagnostics');
    expect(command('b')).toBe('toggle-sidebar');
    expect(command('1')).toBe('show-both');
    expect(command('2')).toBe('show-editor');
    expect(command('3')).toBe('show-preview');
  });

  it('keeps Escape available as a non-editing cancel command', () => {
    expect(getPlaygroundKeyboardCommand({
      key: 'Escape',
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
    })).toBe('cancel');
    expect(getPlaygroundKeyboardCommand({
      key: 'Escape',
      altKey: true,
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
    })).toBeNull();
  });
});
