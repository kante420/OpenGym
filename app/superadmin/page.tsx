import { Suspense } from 'react';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { BrandMark } from '@/components/brand';
import { Card, Chip, EmptyState, Progress, Stat } from '@/components/ui/primitives';
import { formatDate, nowMs } from '@/lib/format';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { getSuperAdmin } from '@/lib/superadmin';
import { superAdminSignOut } from '@/lib/actions/superadmin';
import { GymControls, PurgeButton, SuperLogin } from './controls';

export const metadata = { title: 'Panel OpenGym', robots: { index: false, follow: false } };

interface Row {
  id: string; name: string; subdomain: string; status: string; max_members: number; city: string | null; province: string | null; country: string | null;
  director_name: string | null; contact_email: string | null; size_range: string | null; created_at: string; last_login_at: string | null;
  signup_country: string | null; signup_region: string | null; signup_city: string | null; members: number; staff: number; receipts: number; sessions: number;
}
interface Req { gym_name: string; slug: string; city: string | null; geo_country: string | null; geo_region: string | null; geo_city: string | null; created_at: string; expires_at: string; verified_at: string | null }

const DB_LIMIT_MB = 500; // plan gratuito de Supabase
const where = (...p: (string | null)[]) => p.filter(Boolean).join(', ') || '—';

async function Dashboard() {
  const sa = await getSuperAdmin();
  if (!sa) return <SuperLogin />;
  const admin = createAdminSupabase();
  const [ov, size, rq] = await Promise.all([
    admin.rpc('platform_overview'),
    admin.rpc('platform_db_size'),
    admin.from('signup_requests').select('gym_name, slug, city, geo_country, geo_region, geo_city, created_at, expires_at, verified_at').order('created_at', { ascending: false }).limit(15),
  ]);
  const gyms = (ov.data ?? []) as Row[];
  const reqs = (rq.data ?? []) as Req[];
  const mb = Number(size.data ?? 0) / 1048576;
  const now = nowMs();
  const days = Array.from({ length: 30 }, (_, i) => new Date(now - (29 - i) * 86_400_000).toISOString().slice(0, 10));
  const perDay = days.map((d) => ({ d, n: gyms.filter((g) => g.created_at.slice(0, 10) === d).length }));
  const maxDay = Math.max(1, ...perDay.map((x) => x.n));
  const pending = reqs.filter((r) => !r.verified_at && new Date(r.expires_at).getTime() > now).length;
  const state = (r: Req) => (r.verified_at ? <Chip tone="ok">Verificada</Chip> : new Date(r.expires_at).getTime() > now ? <Chip tone="gold">Pendiente</Chip> : <Chip>Caducada</Chip>);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3"><BrandMark className="h-8 w-auto" /><h1 className="display text-4xl">Panel de OpenGym</h1></div>
        <div className="flex items-center gap-3 text-sm text-muted"><span>{sa.email}</span>
          <form action={superAdminSignOut}><button className="btn btn-ghost btn-sm"><LogOut className="size-3.5" />Salir</button></form></div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Gimnasios" value={gyms.length} tone="gold" sub={`${gyms.filter((g) => g.status === 'active').length} activos`} />
        <Stat label="Altas (7 días)" value={gyms.filter((g) => now - new Date(g.created_at).getTime() < 7 * 86_400_000).length} />
        <Stat label="Socios en total" value={gyms.reduce((s, g) => s + g.members, 0)} />
        <Stat label="Solicitudes pendientes" value={pending} />
        <div className="card card-pad">
          <p className="text-sm text-muted">Base de datos</p>
          <p className="display num mt-1 text-5xl">{mb.toFixed(0)}<span className="ml-1 text-xl text-muted">/ {DB_LIMIT_MB} MB</span></p>
          <div className="mt-2"><Progress value={(mb / DB_LIMIT_MB) * 100} label="Uso de la base de datos" /></div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Altas por día (30 días)" className="lg:col-span-1">
          <div className="flex h-32 items-end gap-[3px]" role="img" aria-label="Altas de gimnasios por día">
            {perDay.map((x) => <div key={x.d} title={`${x.d}: ${x.n}`} className="flex-1 -skew-x-[14deg] rounded-sm bg-gradient-to-t from-bronze to-gold-hi" style={{ height: `${x.n ? 12 + (x.n / maxDay) * 88 : 3}%`, opacity: x.n ? 1 : 0.25 }} />)}
          </div>
        </Card>
        <Card title="Solicitudes recientes" pad={false} className="lg:col-span-2" action={<PurgeButton />}>
          {reqs.length === 0 ? <EmptyState title="Sin solicitudes" /> : (
            <div className="scroll-x"><table className="table"><thead><tr><th>Fecha</th><th>Gimnasio</th><th>Desde</th><th>Estado</th></tr></thead>
              <tbody>{reqs.map((r) => <tr key={r.slug + r.created_at}><td className="whitespace-nowrap text-sm">{formatDate(r.created_at, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', year: undefined })}</td>
                <td><p className="font-semibold">{r.gym_name}</p><p className="text-xs text-faint">/{r.slug} · {r.city ?? '—'}</p></td><td className="text-sm">{where(r.geo_city, r.geo_region, r.geo_country)}</td><td>{state(r)}</td></tr>)}</tbody></table></div>
          )}
        </Card>
      </div>

      <Card title="Gimnasios registrados" pad={false} className="mt-6">
        {gyms.length === 0 ? <EmptyState title="Todavía no hay gimnasios">Cuando alguien cree el suyo aparecerá aquí.</EmptyState> : (
          <div className="scroll-x"><table className="table">
            <thead><tr><th>Gimnasio</th><th>Ubicación declarada</th><th>Alta desde</th><th>Alta</th><th>Último acceso</th><th className="text-right">Socios</th><th className="text-right">Equipo</th><th>Estado</th><th className="text-right">Acciones</th></tr></thead>
            <tbody>{gyms.map((g) => (
              <tr key={g.id} className={g.status === 'active' ? '' : 'opacity-60'}>
                <td><Link href={`/${g.subdomain}`} className="font-semibold hover:text-gold-hi" target="_blank">{g.name}</Link>
                  <p className="text-xs text-faint">/{g.subdomain} · {g.director_name ?? '—'}</p><p className="text-xs text-faint">{g.contact_email ?? ''}</p></td>
                <td className="text-sm">{where(g.city, g.province, g.country)}<p className="text-xs text-faint">{g.size_range ? `${g.size_range} socios` : ''}</p></td>
                <td className="text-sm">{where(g.signup_city, g.signup_region, g.signup_country)}</td>
                <td className="whitespace-nowrap text-sm">{formatDate(g.created_at)}</td>
                <td className="whitespace-nowrap text-sm">{g.last_login_at ? formatDate(g.last_login_at) : '—'}</td>
                <td className="num text-right"><span className={g.members >= g.max_members ? 'text-bad' : ''}>{g.members}</span><span className="text-faint"> / {g.max_members}</span></td>
                <td className="num text-right">{g.staff}</td>
                <td>{g.status === 'active' ? <Chip tone="ok">Activo</Chip> : <Chip tone="bad">Suspendido</Chip>}</td>
                <td><GymControls id={g.id} name={g.name} status={g.status} maxMembers={g.max_members} /></td>
              </tr>))}</tbody></table></div>
        )}
      </Card>
      <p className="mt-4 text-xs text-faint">Este panel muestra solo recuentos y datos del gimnasio: nunca nombres de socios, pesos ni importes cobrados.</p>
    </div>
  );
}

export default function SuperAdminPage() {
  return <Suspense fallback={<div className="mx-auto max-w-6xl px-5 py-8"><div className="skeleton h-64" /></div>}><Dashboard /></Suspense>;
}
