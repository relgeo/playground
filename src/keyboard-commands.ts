export type PlaygroundKeyboardCommand =
  | 'new-file'
  | 'open-file-picker'
  | 'save-file'
  | 'save-as-file'
  | 'import-file'
  | 'export-file'
  | 'fit-preview'
  | 'reset-viewport'
  | 'show-diagnostics'
  | 'toggle-sidebar'
  | 'show-both'
  | 'show-editor'
  | 'show-preview'
  | 'cancel';

interface KeyboardCommandEvent {
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

/**
 * App commands use Mod+Alt so browser/editor commands such as Mod+S and
 * Mod+O remain available to the host. Escape stays unmodified for cancel.
 */
export function getPlaygroundKeyboardCommand({
  key,
  altKey,
  ctrlKey,
  metaKey,
  shiftKey,
}: KeyboardCommandEvent): PlaygroundKeyboardCommand | null {
  if (key === 'Escape' && !altKey && !ctrlKey && !metaKey && !shiftKey) {
    return 'cancel';
  }

  if (!altKey || (!ctrlKey && !metaKey)) return null;

  switch (key.toLowerCase()) {
    case 'n':
      return 'new-file';
    case 'o':
      return 'open-file-picker';
    case 's':
      return shiftKey ? 'save-as-file' : 'save-file';
    case 'i':
      return 'import-file';
    case 'e':
      return 'export-file';
    case 'f':
      return 'fit-preview';
    case '0':
      return 'reset-viewport';
    case 'd':
      return 'show-diagnostics';
    case 'b':
      return 'toggle-sidebar';
    case '1':
      return 'show-both';
    case '2':
      return 'show-editor';
    case '3':
      return 'show-preview';
    default:
      return null;
  }
}
