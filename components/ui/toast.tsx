'use client';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, XCircle, X } from 'lucide-react';

type Kind = 'ok' | 'bad' | 'info';
interface ToastItem { id: number; kind: Kind; message: string }
const Ctx = createContext<{ toast: (message: string, kind?: Kind) => void } | null>(null);

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return c;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: number) => setItems((p) => p.filter((t) => t.id !== id)), []);
  const toast = useCallback((message: string, kind: Kind = 'ok') => {
    const id = Date.now() + Math.random();
    setItems((p) => [...p.slice(-3), { id, kind, message }]);
    setTimeout(() => dismiss(id), kind === 'bad' ? 7000 : 4000);
  }, [dismiss]);
  const value = useMemo(() => ({ toast }), [toast]);
  const Icon = { ok: CheckCircle2, bad: XCircle, info: Info };
  const tone = { ok: 'text-ok', bad: 'text-bad', info: 'text-info' };

  return (
    <Ctx.Provider value={value}>
      {children}
      <div aria-live="polite" role="status" className="no-print pointer-events-none fixed inset-x-3 top-3 z-[60] flex flex-col items-center gap-2 lg:top-6">
        {items.map((t) => {
          const I = Icon[t.kind];
          return (
            <div key={t.id} className="card pointer-events-auto flex w-full max-w-sm items-start gap-3 px-4 py-3 text-sm shadow-2xl" style={{ animation: 'pop .18s ease-out' }}>
              <I className={`mt-0.5 size-4 shrink-0 ${tone[t.kind]}`} aria-hidden />
              <span className="flex-1">{t.message}</span>
              <button onClick={() => dismiss(t.id)} aria-label="Cerrar aviso" className="text-faint hover:text-fg"><X className="size-4" /></button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
