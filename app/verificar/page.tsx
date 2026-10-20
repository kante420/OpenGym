import { Suspense } from 'react';
import Link from 'next/link';
import { PublicShell } from '@/components/public-shell';
import { previewSignup } from '@/lib/platform';
import { ConfirmGym } from './confirm-gym';

export const metadata = { title: 'Activar gimnasio' };

async function Content({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const p = token ? await previewSignup(token) : ({ state: 'invalid' } as const);
  return (
    <div className="card card-pad mx-auto mt-10 max-w-lg text-center">
      {p.state === 'ok' && token && (
        <>
          <h1 className="display text-4xl">Activar «{p.name}»</h1>
          <p className="mb-6 mt-2 text-muted">Un último paso: confirma para crear tu gimnasio en <strong className="text-fg">/{p.slug}</strong>.</p>
          <ConfirmGym token={token} />
        </>
      )}
      {p.state === 'done' && (
        <>
          <h1 className="display text-4xl">Tu gimnasio ya está activo</h1>
          <Link href={`/${p.slug}`} className="btn btn-primary mt-6">Ir a {p.name}</Link>
        </>
      )}
      {(p.state === 'expired' || p.state === 'invalid') && (
        <>
          <h1 className="display text-4xl">Enlace no válido</h1>
          <p className="mb-6 mt-2 text-muted">{p.state === 'expired' ? 'Este enlace ha caducado.' : 'No reconocemos este enlace.'} Puedes empezar de nuevo.</p>
          <Link href="/crear-gimnasio" className="btn btn-primary">Crear gimnasio</Link>
        </>
      )}
    </div>
  );
}

export default function Verificar({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  return <PublicShell cta={false}><Suspense fallback={<div className="skeleton mx-auto mt-10 h-48 max-w-lg" />}><Content searchParams={searchParams} /></Suspense></PublicShell>;
}
