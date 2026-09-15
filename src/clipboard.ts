export interface ClipboardFallbackElement {
  value: string;
  tabIndex: number;
  style: {
    position: string;
    opacity: string;
  };
  setAttribute(name: string, value: string): void;
  focus(options?: FocusOptions): void;
  select(): void;
  remove(): void;
}

export interface ClipboardDocument {
  body?: {
    appendChild(element: ClipboardFallbackElement): void;
  };
  createElement(tagName: 'textarea'): ClipboardFallbackElement;
  execCommand?: (command: string) => boolean;
}

export interface ClipboardEnvironment {
  clipboard?: {
    writeText(text: string): Promise<void>;
  };
  document?: ClipboardDocument;
}

function getBrowserEnvironment(): ClipboardEnvironment {
  return {
    clipboard: typeof navigator !== 'undefined' && navigator.clipboard
      ? navigator.clipboard
      : undefined,
    document: typeof document !== 'undefined' ? document : undefined,
  };
}

export async function copyText(
  text: string,
  environment: ClipboardEnvironment = getBrowserEnvironment(),
): Promise<void> {
  let modernClipboardError: unknown;
  if (environment.clipboard?.writeText) {
    try {
      await environment.clipboard.writeText(text);
      return;
    } catch (error) {
      // Some browsers expose the API but reject it for an insecure context or
      // a denied permission. Continue to the legacy gesture-based fallback.
      modernClipboardError = error;
    }
  }

  const fallbackDocument = environment.document;
  if (!fallbackDocument?.body || typeof fallbackDocument.execCommand !== 'function') {
    throw modernClipboardError instanceof Error
      ? modernClipboardError
      : new Error('Clipboard access is unavailable.');
  }

  const textarea = fallbackDocument.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.setAttribute('aria-hidden', 'true');
  textarea.tabIndex = -1;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  try {
    fallbackDocument.body.appendChild(textarea);
    textarea.focus({ preventScroll: true });
    textarea.select();
    if (!fallbackDocument.execCommand('copy')) {
      throw modernClipboardError instanceof Error
        ? modernClipboardError
        : new Error('Clipboard access is unavailable.');
    }
  } finally {
    textarea.remove();
  }
}
