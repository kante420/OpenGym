import { Suspense } from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { BrandMark } from '@/components/brand';
import { getAuth } from '@/lib/auth';
import { gymPath, HOME_BY_ROLE } from '@/lib/paths';
import { createServerSupabase } from '@/lib/supabase/server';
import { LoginForm } from './login/login-form';

async function LoginContent({ params, searchParams }: { params: Promise<{ subdomain: string }>; searchParams: Promise<{ creado?: string; clave?: string }> }) {
  const { subdomain } = await params;
  const sp = await searchParams;
  const auth = await getAuth();
  if (auth && auth.gym.subdomain === subdomain) redirect(await gymPath(subdomain, HOME_BY_ROLE[auth.profile.role]));

  const supabase = await createServerSupabase();
  const { data } = await supabase.rpc('get_gym_public', { p_subdomain: subdomain });
  const gym = Array.isArray(data) ? data[0] : null;
  if (!gym) notFound();

  return (
    <div className="w-full max-w-sm">
      <BrandMark className="mx-auto mb-5 h-12 w-auto" />
      <h1 className="display text-center text-5xl">{gym.name}</h1>
      <p className="mb-6 mt-2 text-center text-sm text-muted">Entra con tu usuario o email para ver tus clases, tu progreso y tus recibos.</p>
      {sp.creado && <p role="status" className="mb-4 flex items-start gap-2 rounded-md border border-ok/40 bg-ok/10 px-3 py-2.5 text-sm"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden />¡Tu gimnasio está creado! Entra con tu email y la contraseña que elegiste.</p>}
      {sp.clave && <p role="status" className="mb-4 flex items-start gap-2 rounded-md border border-ok/40 bg-ok/10 px-3 py-2.5 text-sm"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden />Contraseña actualizada. Ya puedes entrar.</p>}
      {gym.status === 'suspended'
        ? <p role="alert" className="card card-pad text-center text-sm text-muted">Este gimnasio está desactivado temporalmente. Si eres el administrador, contacta con OpenGym.</p>
        : <LoginForm subdomain={subdomain} />}
      <div className="mt-6 border-t border-line pt-5 text-center">
        <p className="mb-3 text-sm text-faint">¿Quieres un sistema como este para tu gimnasio?</p>
        <Link href="/crear-gimnasio" className="btn btn-ghost w-full">Crear gimnasio</Link>
      </div>
      <p className="mt-6 text-center text-xs text-faint">Con la tecnología de <Link href="/" className="text-muted hover:text-fg">OpenGym</Link></p>
    </div>
  );
}

export default function GymLoginPage({ params, searchParams }: { params: Promise<{ subdomain: string }>; searchParams: Promise<{ creado?: string; clave?: string }> }) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-10">
      <div aria-hidden className="pointer-events-none absolute -right-40 top-0 h-full w-72 -skew-x-[18deg] bg-gradient-to-b from-gold/15 to-bronze/5" />
      <div aria-hidden className="pointer-events-none absolute -right-8 top-0 h-full w-10 -skew-x-[18deg] bg-gold/10" />
      <Suspense fallback={<div className="skeleton h-96 w-full max-w-sm" />}><LoginContent params={params} searchParams={searchParams} /></Suspense>
    </main>
  );
}
