import { describe, expect, it, vi } from 'vitest';
import { copyText, type ClipboardDocument, type ClipboardFallbackElement } from '../clipboard';

function createFallbackDocument(execCommand: (command: string) => boolean): {
  document: ClipboardDocument;
  element: ClipboardFallbackElement;
  appendChild: ReturnType<typeof vi.fn>;
  createElement: ReturnType<typeof vi.fn>;
} {
  const element: ClipboardFallbackElement = {
    value: '',
    tabIndex: 0,
    style: { position: '', opacity: '' },
    setAttribute: vi.fn(),
    focus: vi.fn(),
    select: vi.fn(),
    remove: vi.fn(),
  };
  const appendChild = vi.fn();
  const createElement = vi.fn(() => element);

  return {
    document: {
      body: { appendChild },
      createElement,
      execCommand,
    },
    element,
    appendChild,
    createElement,
  };
}

describe('copyText', () => {
  it('uses the modern clipboard API when it succeeds', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    await copyText('source', { clipboard: { writeText } });

    expect(writeText).toHaveBeenCalledWith('source');
  });

  it('falls back to a temporary textarea when clipboard permission is denied', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('permission denied'));
    const execCommand = vi.fn(() => true);
    const fallback = createFallbackDocument(execCommand);

    await copyText('source', { clipboard: { writeText }, document: fallback.document });

    expect(fallback.createElement).toHaveBeenCalledWith('textarea');
    expect(fallback.element.value).toBe('source');
    expect(fallback.element.select).toHaveBeenCalledOnce();
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(fallback.element.remove).toHaveBeenCalledOnce();
  });

  it('cleans up the fallback element and rethrows the original clipboard error when fallback fails', async () => {
    const permissionError = new Error('permission denied');
    const writeText = vi.fn().mockRejectedValue(permissionError);
    const fallback = createFallbackDocument(vi.fn(() => false));

    await expect(copyText('source', { clipboard: { writeText }, document: fallback.document }))
      .rejects.toBe(permissionError);

    expect(fallback.element.remove).toHaveBeenCalledOnce();
  });

  it('reports unavailable clipboard access when no browser path exists', async () => {
    await expect(copyText('source', {}))
      .rejects.toThrow('Clipboard access is unavailable.');
  });
});
