import { Suspense } from 'react';
import Link from 'next/link';
import { BrandMark } from '@/components/brand';
import { redirect } from 'next/navigation';
import { LogOut, ShieldAlert } from 'lucide-react';
import { getAuth } from '@/lib/auth';
import { gymBase, gymPath, HOME_BY_ROLE } from '@/lib/paths';
import { signOut } from '@/lib/actions/auth';
import { Nav } from '@/components/nav';
import { Avatar, PageSkeleton } from '@/components/ui/primitives';

const ROLE_LABEL = { ADMINISTRADOR: 'Administración', ENTRENADOR: 'Entrenador', CLIENTE: 'Socio' } as const;

async function Shell({ params, children }: { params: Promise<{ subdomain: string }>; children: React.ReactNode }) {
  const { subdomain } = await params;
  const auth = await getAuth();
  if (!auth || auth.gym.subdomain !== subdomain) redirect(await gymPath(subdomain, '/login'));
  const { profile, gym, mustChangePassword } = auth;
  const base = await gymBase(subdomain);

  return (
    <div className="min-h-dvh lg:pl-64">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-panel px-4 py-5 lg:flex">
        <Link href={base + HOME_BY_ROLE[profile.role]} className="mb-8 flex items-center gap-3 px-1">
          <BrandMark className="h-7 w-auto shrink-0" />
          <span className="display text-2xl leading-none">{gym.name}</span>
        </Link>
        <div className="pl-4"><Nav role={profile.role} base={base} variant="side" /></div>
        <div className="mt-auto flex items-center gap-3 border-t border-line pt-4">
          <Avatar name={profile.full_name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{profile.full_name}</p>
            <p className="text-xs text-faint">{ROLE_LABEL[profile.role]}</p>
          </div>
          <form action={signOut.bind(null, subdomain)}>
            <button aria-label="Cerrar sesión" title="Cerrar sesión" className="rounded p-2 text-muted hover:bg-panel2 hover:text-fg"><LogOut className="size-4" /></button>
          </form>
        </div>
      </aside>

      <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-line bg-panel/95 px-4 py-3 backdrop-blur lg:hidden">
        <span className="flex items-center gap-2">
          <BrandMark className="h-5 w-auto shrink-0" />
          <span className="display text-xl">{gym.name}</span>
        </span>
        <form action={signOut.bind(null, subdomain)}>
          <button aria-label="Cerrar sesión" className="rounded p-2 text-muted"><LogOut className="size-5" /></button>
        </form>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-10">
        {mustChangePassword && (
          <div role="alert" className="mb-6 flex items-start gap-3 rounded-md border border-gold/40 bg-gold/10 px-4 py-3 text-sm">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
            <p>Estás usando una contraseña temporal. <Link className="font-semibold text-gold-hi underline" href={`${base}${profile.role === 'CLIENTE' ? '/me/profile' : profile.role === 'ENTRENADOR' ? '/coach/profile' : '/admin/settings'}`}>Cámbiala ahora</Link> para proteger tu cuenta.</p>
          </div>
        )}
        {children}
      </main>
      <Nav role={profile.role} base={base} variant="bottom" />
    </div>
  );
}

export default function AppLayout({ params, children }: { params: Promise<{ subdomain: string }>; children: React.ReactNode }) {
  return <Suspense fallback={<div className="p-8"><PageSkeleton /></div>}><Shell params={params}>{children}</Shell></Suspense>;
}
