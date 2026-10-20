import { Suspense } from 'react';
import Link from 'next/link';
import { RecoverForm } from './recover-form';

export const metadata = { title: 'Recuperar contraseña' };

async function Content({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;
  return (
    <div className="w-full max-w-sm">
      <h1 className="display text-center text-4xl">Recuperar contraseña</h1>
      <p className="mb-6 mt-2 text-center text-sm text-muted">Escribe el email de tu cuenta y te enviaremos un enlace para crear una contraseña nueva.</p>
      <RecoverForm subdomain={subdomain} />
      <p className="mt-5 text-center text-sm"><Link href={`/${subdomain}`} className="text-muted underline hover:text-fg">Volver al acceso</Link></p>
      <p className="mt-4 text-center text-xs text-faint">¿Eres socio y no tienes email en tu ficha? Pide a recepción que te genere una contraseña temporal.</p>
    </div>
  );
}

export default function Recuperar({ params }: { params: Promise<{ subdomain: string }> }) {
  return <main className="flex min-h-dvh items-center justify-center px-5 py-10"><Suspense fallback={<div className="skeleton h-64 w-full max-w-sm" />}><Content params={params} /></Suspense></main>;
}
