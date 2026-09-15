import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    returnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const frame = window.requestAnimationFrame(() => cancelRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = [cancelRef.current, confirmRef.current].filter(
        (element): element is HTMLButtonElement => Boolean(element && !element.disabled)
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel, open]);

  useEffect(() => {
    if (open || !returnFocusRef.current) return;

    const element = returnFocusRef.current;
    const frame = window.requestAnimationFrame(() => {
      if (element.isConnected && !element.hasAttribute('disabled')) element.focus();
    });
    returnFocusRef.current = null;
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  return (
    <div
      className="playground-confirm-backdrop"
      hidden={!open}
      data-confirm-dialog={open ? 'open' : 'closed'}
    >
      <section
        className="playground-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="playground-confirm-title"
        aria-describedby="playground-confirm-message"
      >
        <p className="playground-confirm-kicker">Confirm change</p>
        <h2 id="playground-confirm-title">{title}</h2>
        <p id="playground-confirm-message">{message}</p>
        <div className="playground-confirm-actions">
          <button type="button" ref={cancelRef} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" ref={confirmRef} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
