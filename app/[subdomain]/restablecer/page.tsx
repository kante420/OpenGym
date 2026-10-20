import { Suspense } from 'react';
import Link from 'next/link';
import { previewReset } from '@/lib/platform';
import { ResetForm } from './reset-form';

export const metadata = { title: 'Nueva contraseña' };

async function Content({ params, searchParams }: { params: Promise<{ subdomain: string }>; searchParams: Promise<{ token?: string }> }) {
  const { subdomain } = await params;
  const { token } = await searchParams;
  const valid = token ? await previewReset(token) : null;
  return (
    <div className="w-full max-w-sm">
      {valid && token ? (
        <>
          <h1 className="display text-center text-4xl">Nueva contraseña</h1>
          <p className="mb-6 mt-2 text-center text-sm text-muted">Elige una contraseña de al menos 10 caracteres.</p>
          <ResetForm subdomain={subdomain} token={token} />
        </>
      ) : (
        <div className="text-center">
          <h1 className="display text-4xl">Enlace no válido</h1>
          <p className="mb-6 mt-2 text-sm text-muted">El enlace ha caducado o ya se usó.</p>
          <Link href={`/${subdomain}/recuperar`} className="btn btn-primary">Pedir un enlace nuevo</Link>
        </div>
      )}
    </div>
  );
}

export default function Restablecer(props: { params: Promise<{ subdomain: string }>; searchParams: Promise<{ token?: string }> }) {
  return <main className="flex min-h-dvh items-center justify-center px-5 py-10"><Suspense fallback={<div className="skeleton h-64 w-full max-w-sm" />}><Content {...props} /></Suspense></main>;
}
