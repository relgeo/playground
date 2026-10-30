import { describe, expect, it, vi } from 'vitest';
import {
  applyThemeMode,
  getInitialThemeMode,
  persistThemeMode,
  THEME_STORAGE_KEY,
} from '../theme';

function createStorage(initialValue: string | null = null) {
  let value = initialValue;
  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key: string, nextValue: string) => {
      value = nextValue;
    }),
  };
}

describe('theme preference', () => {
  it('defaults to system and accepts only supported stored modes', () => {
    expect(getInitialThemeMode(createStorage())).toBe('system');
    expect(getInitialThemeMode(createStorage('dark'))).toBe('dark');
    expect(getInitialThemeMode(createStorage('light'))).toBe('light');
    expect(getInitialThemeMode(createStorage('sepia'))).toBe('system');
  });

  it('persists the selected mode without failing when storage is unavailable', () => {
    const storage = createStorage();
    persistThemeMode('dark', storage);
    expect(storage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'dark');

    expect(() => persistThemeMode('light', {
      setItem: () => { throw new Error('storage disabled'); },
    })).not.toThrow();
  });

  it('applies the mode to the document root and preserves system media behavior', () => {
    const root = {
      dataset: {} as DOMStringMap,
      style: { colorScheme: '' },
    } as unknown as HTMLElement;
    applyThemeMode('system', root);
    expect(root.dataset.theme).toBe('system');
    expect(root.style.colorScheme).toBe('light dark');

    applyThemeMode('dark', root);
    expect(root.dataset.theme).toBe('dark');
    expect(root.style.colorScheme).toBe('dark');
  });
});
