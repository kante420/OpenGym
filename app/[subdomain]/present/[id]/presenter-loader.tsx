'use client';
import dynamic from 'next/dynamic';

/** Usa pantalla completa y almacenamiento local: se carga sólo en el navegador. */
export const PresenterClient = dynamic(() => import('./presenter').then((m) => m.Presenter), {
  ssr: false,
  loading: () => <div className="fixed inset-0 grid place-items-center bg-canvas text-muted">Preparando la presentación…</div>,
});
