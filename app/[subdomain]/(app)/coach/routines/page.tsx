import { requirePage } from '@/lib/auth';
import { gymBase } from '@/lib/paths';
import { addDaysISO, formatDate, todayISO } from '@/lib/format';
import { getBlocks } from '@/lib/routine';
import type { WorkoutLog } from '@/lib/types';
import { ActionButton } from '@/components/ui/action';
import { Card, Chip, EmptyState, PageHeader } from '@/components/ui/primitives';
import { deleteRoutine } from '@/lib/actions/routines';
import { RoutineDesigner } from './routine-designer';
import { PresentButton } from '@/components/present-button';
import { CatalogManager, DuplicateButton } from './routine-tools';

export const metadata = { title: 'Rutinas' };

export default async function RoutinesPage({ params, searchParams }: { params: Promise<{ subdomain: string }>; searchParams: Promise<{ class?: string; date?: string }> }) {
  const { subdomain } = await params;
  const sp = await searchParams;
  const { supabase, gym, profile } = await requirePage(subdomain, ['ENTRENADOR', 'ADMINISTRADOR']);
  const base = await gymBase(subdomain);
  const today = todayISO();

  const [cRes, eRes, lRes] = await Promise.all([
    supabase.from('classes').select('id, title, trainer_id').eq('gym_id', gym.id).eq('active', true).order('title'),
    supabase.from('exercises').select('id, name, gym_id').or(`gym_id.eq.${gym.id},gym_id.is.null`).order('name'),
    supabase.from('workout_logs').select('*, classes(title)').eq('gym_id', gym.id).gte('log_date', addDaysISO(today, -30)).order('log_date', { ascending: false }).limit(60),
  ]);
  const classes = (cRes.data ?? []) as { id: string; title: string; trainer_id: string | null }[];
  const mine = classes.filter((c) => c.trainer_id === profile.id);
  const shown = mine.length ? mine : classes;
  const exercises = ((eRes.data ?? []) as { id: string; name: string; gym_id: string | null }[]).map((e) => ({ id: e.id, name: e.name, own: e.gym_id === gym.id }));
  const logs = (lRes.data ?? []) as WorkoutLog[];
  const upcoming = logs.filter((l) => l.log_date >= today).sort((a, b) => a.log_date.localeCompare(b.log_date));
  const past = logs.filter((l) => l.log_date < today);

  const Row = ({ l }: { l: WorkoutLog }) => {
    const blocks = getBlocks(l);
    const n = blocks.reduce((s, b) => s + b.exercises.length, 0);
    return (
      <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
        <div>
          <p className="font-semibold">{l.title} {l.is_completed && <Chip tone="ok">Completada</Chip>}</p>
          <p className="text-xs text-faint">{l.classes?.title} · {formatDate(l.log_date, { weekday: 'short', day: 'numeric', month: 'short' })} · {n} ejercicios</p>
        </div>
        <div className="flex gap-2">
          <PresentButton href={`${base}/present/${l.id}`} variant="primary" />
          <DuplicateButton id={l.id} title={l.title} defaultDate={addDaysISO(l.log_date, 7)} />
          <ActionButton variant="danger" action={deleteRoutine.bind(null, l.id)} confirm={{ title: `¿Eliminar «${l.title}»?`, message: 'Se elimina la rutina y las marcas y asistencia registradas en ella.', confirmLabel: 'Eliminar' }}>Eliminar</ActionButton>
        </div>
      </li>
    );
  };

  return (
    <>
      <PageHeader title="Rutinas" subtitle="Diseña la sesión por bloques y publícala para tu grupo. Tus socios la verán en «Mi semana»." />
      <div className="space-y-6">
        <RoutineDesigner classes={shown} catalog={exercises.map((e) => e.name)} defaultClass={sp.class ?? ''} defaultDate={/^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? '') ? sp.date! : today} base={base} />
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Próximas" pad={false}>{upcoming.length === 0 ? <EmptyState title="Sin rutinas programadas" /> : <ul className="divide-y divide-line">{upcoming.map((l) => <Row key={l.id} l={l} />)}</ul>}</Card>
          <Card title="Últimos 30 días" pad={false}>{past.length === 0 ? <EmptyState title="Aún no hay histórico" /> : <ul className="divide-y divide-line">{past.map((l) => <Row key={l.id} l={l} />)}</ul>}</Card>
        </div>
        <CatalogManager exercises={exercises} />
      </div>
    </>
  );
}
