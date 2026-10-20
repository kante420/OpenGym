import Link from 'next/link';
import { CheckCircle2, Play, Plus } from 'lucide-react';
import { requirePage } from '@/lib/auth';
import { gymBase } from '@/lib/paths';
import { addDaysISO, formatDate, todayISO, weekdayName, parseDays } from '@/lib/format';
import { getBlocks } from '@/lib/routine';
import type { ClassRow, WorkoutLog } from '@/lib/types';
import { PresentButton } from '@/components/present-button';
import { Card, Chip, EmptyState, PageHeader } from '@/components/ui/primitives';

export const metadata = { title: 'Hoy' };

export default async function CoachHome({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;
  const { supabase, gym, profile } = await requirePage(subdomain, ['ENTRENADOR', 'ADMINISTRADOR']);
  const base = await gymBase(subdomain);
  const today = todayISO();

  const [cRes, lRes] = await Promise.all([
    supabase.from('classes').select('*, bookings(user_id)').eq('gym_id', gym.id).eq('active', true),
    supabase.from('workout_logs').select('*, classes(title)').eq('gym_id', gym.id).gte('log_date', today).lte('log_date', addDaysISO(today, 7)).order('log_date'),
  ]);
  const all = (cRes.data ?? []) as (ClassRow & { bookings: unknown[] })[];
  const mine = all.filter((c) => c.trainer_id === profile.id);
  const scope = mine.length ? mine : all;
  const scopeIds = new Set(scope.map((c) => c.id));
  const logs = ((lRes.data ?? []) as WorkoutLog[]).filter((l) => scopeIds.has(l.class_id));
  const todayLogs = logs.filter((l) => l.log_date === today);
  const later = logs.filter((l) => l.log_date > today);
  const dow = weekdayName(today);
  const missing = scope.filter((c) => parseDays(c.days_of_week).includes(dow) && !todayLogs.some((l) => l.class_id === c.id));
  const size = (id: string) => all.find((c) => c.id === id)?.bookings.length ?? 0;

  return (
    <>
      <PageHeader title="Hoy" subtitle={`${formatDate(today, { weekday: 'long', day: 'numeric', month: 'long', year: undefined })}${mine.length ? ' · mostrando tus grupos' : ''}`}
        actions={<Link href={`${base}/coach/routines`} className="btn btn-ghost"><Plus className="size-4" />Nueva rutina</Link>} />

      <div className="space-y-6">
        <section aria-label="Sesiones de hoy" className="space-y-3">
          {todayLogs.length === 0 && <Card><EmptyState title="No hay rutinas para hoy">{missing.length ? 'Tienes clases hoy sin rutina publicada (abajo).' : 'Cuando publiques una rutina para hoy aparecerá aquí.'}</EmptyState></Card>}
          {todayLogs.map((l) => {
            const n = getBlocks(l).reduce((s, b) => s + b.exercises.length, 0);
            return (
              <article key={l.id} className="card card-pad flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted">{l.classes?.title} · {size(l.class_id)} inscritos</p>
                  <h2 className="display text-4xl">{l.title}</h2>
                  <p className="mt-1 text-sm text-faint">{n} ejercicios</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <PresentButton href={`${base}/present/${l.id}`} variant={l.is_completed ? 'ghost' : 'primary'} size="lg" />
                  {l.is_completed
                    ? <><Chip tone="ok"><CheckCircle2 className="size-3.5" />Completada</Chip><Link className="btn btn-ghost" href={`${base}/coach/session/${l.id}`}>Revisar marcas</Link></>
                    : <Link className="btn btn-ghost btn-lg" href={`${base}/coach/session/${l.id}`}><Play className="size-4" />Anotar por alumno</Link>}
                </div>
              </article>
            );
          })}
        </section>

        {missing.length > 0 && (
          <Card title="Clases de hoy sin rutina" pad={false}>
            <ul className="divide-y divide-line">{missing.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3.5"><div><p className="font-semibold">{c.title}</p><p className="text-xs text-faint">{c.schedule_time}</p></div>
                <Link className="btn btn-ghost btn-sm" href={`${base}/coach/routines?class=${c.id}&date=${today}`}>Crear rutina</Link></li>
            ))}</ul>
          </Card>
        )}

        <Card title="Próximos 7 días" pad={false}>
          {later.length === 0 ? <EmptyState title="Nada programado" /> : (
            <ul className="divide-y divide-line">{later.map((l) => (
              <li key={l.id} className="flex items-center justify-between px-5 py-3.5"><div><p className="font-semibold">{l.title}</p><p className="text-xs text-faint">{l.classes?.title}</p></div><span className="text-sm text-muted">{formatDate(l.log_date, { weekday: 'long', day: 'numeric', month: 'short', year: undefined })}</span></li>
            ))}</ul>
          )}
        </Card>
      </div>
    </>
  );
}
