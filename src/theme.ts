export type ThemeMode = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'relgeo_playground_theme';

const THEME_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

function isThemeMode(value: string | null): value is ThemeMode {
  return value !== null && THEME_MODES.includes(value as ThemeMode);
}

function getBrowserStorage(): Pick<Storage, 'getItem' | 'setItem'> | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getInitialThemeMode(
  storage: Pick<Storage, 'getItem'> | null = getBrowserStorage(),
): ThemeMode {
  try {
    const storedMode = storage?.getItem(THEME_STORAGE_KEY) ?? null;
    return isThemeMode(storedMode) ? storedMode : 'system';
  } catch {
    return 'system';
  }
}

export function persistThemeMode(
  mode: ThemeMode,
  storage: Pick<Storage, 'setItem'> | null = getBrowserStorage(),
): void {
  try {
    storage?.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Browser storage may be disabled or unavailable. The in-memory preference
    // remains active for the current session in that case.
  }
}

export function applyThemeMode(
  mode: ThemeMode,
  root: HTMLElement | null = typeof document === 'undefined' ? null : document.documentElement,
): void {
  if (!root) return;

  root.dataset.theme = mode;
  root.style.colorScheme = mode === 'system' ? 'light dark' : mode;
}
