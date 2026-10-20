'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

/** Diálogo accesible basado en <dialog> nativo (foco atrapado, Esc, aria-modal). */
export function Modal({ open, onClose, title, children, footer }: {
  open: boolean; onClose: () => void; title: string; children?: ReactNode; footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog ref={ref} className="modal" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-labelledby="modal-title">
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <h2 id="modal-title" className="display text-2xl">{title}</h2>
        <button onClick={onClose} aria-label="Cerrar" className="rounded p-1 text-muted hover:text-fg"><X className="size-5" /></button>
      </div>
      <div className="px-5 py-4">{children}</div>
      {footer && <div className="flex justify-end gap-3 border-t border-line px-5 py-4">{footer}</div>}
    </dialog>
  );
}
