'use client';
import { createContext, startTransition, useActionState, useContext, useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import type { ActionResult } from '@/lib/types';
import { useToast } from './toast';
import { Modal } from './modal';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FormAction = (prev: ActionResult<any> | null, fd: FormData) => Promise<ActionResult<any>>;
const PendingCtx = createContext(false);

/**
 * Formulario ligado a una Server Action. A diferencia de <form action>, NO borra lo escrito
 * cuando hay un error (React 19 resetea el formulario tras cada acción); sólo lo limpia al tener éxito.
 */
export function ActionForm({ action, children, className, resetOnSuccess = true, onSuccess, extraFields }: {
  action: FormAction; children: ReactNode; className?: string; resetOnSuccess?: boolean; extraFields?: () => Record<string, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSuccess?: (r: Extract<ActionResult<any>, { ok: true }>) => void;
}) {
  const [state, run, pending] = useActionState(action, null);
  const { toast } = useToast();
  const ref = useRef<HTMLFormElement>(null);
  const handled = useRef<unknown>(null);

  useEffect(() => {
    if (!state || handled.current === state) return;
    handled.current = state;
    if (state.ok) {
      if (state.message) toast(state.message, 'ok');
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.(state);
    } else toast(state.error, 'bad');
  }, [state, toast, resetOnSuccess, onSuccess]);

  return (
    <PendingCtx value={pending}>
      <form
        ref={ref}
        className={className}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          for (const [k, v] of Object.entries(extraFields?.() ?? {})) fd.set(k, v);
          startTransition(() => run(fd));
        }}
      >
        {children}
      </form>
    </PendingCtx>
  );
}

export function SubmitButton({ children, variant = 'primary', size, className = '', onClick }: {
  children: ReactNode; variant?: 'primary' | 'ghost' | 'danger'; size?: 'sm' | 'lg'; className?: string; onClick?: () => void;
}) {
  const pending = useContext(PendingCtx);
  return (
    <button type="submit" onClick={onClick} disabled={pending} className={`btn btn-${variant} ${size ? `btn-${size}` : ''} ${className}`}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

/** Botón que ejecuta una Server Action (opcionalmente tras confirmar en un diálogo). */
export function ActionButton({ action, children, variant = 'ghost', size = 'sm', confirm, className = '', title }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: () => Promise<ActionResult<any>>;
  children: ReactNode;
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'lg' | 'md';
  confirm?: { title: string; message: string; confirmLabel?: string };
  className?: string;
  title?: string;
}) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const exec = () =>
    start(async () => {
      const r = await action();
      setOpen(false);
      if (r.ok) { if (r.message) toast(r.message, 'ok'); } else toast(r.error, 'bad');
    });

  return (
    <>
      <button type="button" title={title} disabled={pending} onClick={() => (confirm ? setOpen(true) : exec())}
        className={`btn btn-${variant} ${size === 'md' ? '' : `btn-${size}`} ${className}`}>
        {pending && !open && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {children}
      </button>
      {confirm && (
        <Modal open={open} onClose={() => !pending && setOpen(false)} title={confirm.title}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setOpen(false)} disabled={pending}>Cancelar</button>
            <button className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`} onClick={exec} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}{confirm.confirmLabel ?? 'Confirmar'}
            </button>
          </>}>
          <p className="text-sm text-muted">{confirm.message}</p>
        </Modal>
      )}
    </>
  );
}
