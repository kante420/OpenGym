'use client';
import { useRouter } from 'next/navigation';
import { Presentation } from 'lucide-react';

/** Entra en pantalla completa (necesita el clic del usuario) y abre la presentación de la rutina. */
export function PresentButton({ href, label = 'Presentar', variant = 'ghost', size = 'sm', className = '' }: {
  href: string; label?: string; variant?: 'primary' | 'ghost'; size?: 'sm' | 'md' | 'lg'; className?: string;
}) {
  const router = useRouter();
  return (
    <button type="button" className={`btn btn-${variant} ${size === 'md' ? '' : `btn-${size}`} ${className}`}
      onClick={async () => {
        try { await document.documentElement.requestFullscreen(); } catch { /* sin pantalla completa: se presenta igualmente */ }
        router.push(href);
      }}>
      <Presentation className="size-4" aria-hidden />{label}
    </button>
  );
}
