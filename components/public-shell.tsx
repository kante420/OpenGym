import Link from 'next/link';
import { BrandMark, Wordmark } from '@/components/brand';

/** Marco de las páginas públicas de OpenGym (portada, alta, legales). */
export function PublicShell({ children, cta = true }: { children: React.ReactNode; cta?: boolean }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -right-48 top-0 h-full w-80 -skew-x-[18deg] bg-gradient-to-b from-gold/15 to-bronze/5" />
      <div aria-hidden className="pointer-events-none absolute -right-14 top-0 h-full w-10 -skew-x-[18deg] bg-gold/10" />
      <header className="relative mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5">
        <Link href="/" className="flex items-center gap-2.5" aria-label="OpenGym, inicio"><BrandMark className="h-7 w-auto" /><Wordmark className="text-3xl" /></Link>
        {cta && <Link href="/crear-gimnasio" className="btn btn-ghost btn-sm">Crear gimnasio</Link>}
      </header>
      <main className="relative mx-auto w-full max-w-5xl flex-1 px-5 pb-16">{children}</main>
      <footer className="relative mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-5 text-xs text-faint">
        <span>© OpenGym · Gestión de gimnasios</span>
        <span className="flex gap-4"><Link href="/legal/privacidad" className="hover:text-fg">Privacidad</Link><Link href="/legal/terminos" className="hover:text-fg">Términos</Link></span>
      </footer>
    </div>
  );
}
