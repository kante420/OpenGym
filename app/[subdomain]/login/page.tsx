import { Suspense } from 'react';
import { redirect } from 'next/navigation';

async function Redirector({ params }: { params: Promise<{ subdomain: string }> }): Promise<never> {
  const { subdomain } = await params;
  redirect(`/${subdomain}`);
}

/** La pantalla de acceso vive en /<código>; esta ruta se mantiene por compatibilidad. */
export default function LoginRedirect({ params }: { params: Promise<{ subdomain: string }> }) {
  return <Suspense fallback={null}><Redirector params={params} /></Suspense>;
}
