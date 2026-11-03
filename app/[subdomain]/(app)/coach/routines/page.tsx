import { requirePage } from '@/lib/auth';
import { gymBase } from '@/lib/paths';
import { addDaysISO, formatDate, todayISO } from '@/lib/format';
import { getBlocks } from '@/lib/routine';
import type { WorkoutLog } from '@/lib/types';
import { ActionButton } from '@/components/ui/action';
import { Card, Chip, EmptyState, PageHeader } from '@/components/ui/primitives';
import { deleteRoutine, reopenSession } from '@/lib/actions/routines';
import { RoutineDesigner, type EditingRoutine } from './routine-designer';
import Link from 'next/link';
import { History, LayoutGrid, Pencil } from 'lucide-react';
import { PresentButton } from '@/components/present-button';
import { CatalogManager, DuplicateButton } from './routine-tools';
import { RoutineHistoryView } from './routine-history';

export const metadata = { title: 'Rutinas' };

export default async function RoutinesPage({
  params,
  searchParams,
}: {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<{ class?: string; date?: string; edit?: string; tab?: string }>;
}) {
  const { subdomain } = await params;
  const sp = await searchParams;
  const { supabase, gym, profile } = await requirePage(subdomain, ['ENTRENADOR', 'ADMINISTRADOR']);
  const base = await gymBase(subdomain);
  const today = todayISO();
  const editId = /^[0-9a-f-]{36}$/i.test(sp.edit ?? '') ? sp.edit! : null;
  const activeTab = sp.tab === 'history' ? 'history' : 'designer';

  const [cRes, eRes, lRes, allLogsRes, edRes] = await Promise.all([
    supabase.from('classes').select('id, title, trainer_id').eq('gym_id', gym.id).eq('active', true).order('title'),
    supabase.from('exercises').select('id, name, gym_id').or(`gym_id.eq.${gym.id},gym_id.is.null`).order('name'),
    supabase.from('workout_logs').select('*, classes(title)').eq('gym_id', gym.id).gte('log_date', addDaysISO(today, -30)).order('log_date', { ascending: false }).limit(60),
    supabase.from('workout_logs').select('*, classes(title)').eq('gym_id', gym.id).order('log_date', { ascending: false }).limit(300),
    editId ? supabase.from('workout_logs').select('*').eq('id', editId).eq('gym_id', gym.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const editLog = edRes.data as WorkoutLog | null;
  const editing: EditingRoutine | undefined = editLog
    ? { id: editLog.id, class_id: editLog.class_id, title: editLog.title, log_date: editLog.log_date, blocks: getBlocks(editLog), is_completed: editLog.is_completed }
    : undefined;
  const classes = (cRes.data ?? []) as { id: string; title: string; trainer_id: string | null }[];
  const mine = classes.filter((c) => c.trainer_id === profile.id);
  const shown = mine.length ? mine : classes;
  const exercises = ((eRes.data ?? []) as { id: string; name: string; gym_id: string | null }[]).map((e) => ({ id: e.id, name: e.name, own: e.gym_id === gym.id }));
  const logs = (lRes.data ?? []) as WorkoutLog[];
  const allLogs = (allLogsRes.data ?? []) as WorkoutLog[];
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
          {l.is_completed && (
            <ActionButton
              action={reopenSession.bind(null, l.id)}
              variant="ghost"
              size="sm"
              title="Quitar el check de completada"
              confirm={{
                title: `¿Reabrir «${l.title}»?`,
                message: 'La rutina volverá a figurar como pendiente (sin el check de completada) manteniendo las marcas registradas.',
                confirmLabel: 'Reabrir',
              }}
            >
              Reabrir
            </ActionButton>
          )}
          <Link href={`${base}/coach/routines?edit=${l.id}&tab=designer`} scroll className="btn btn-ghost btn-sm"><Pencil className="size-3.5" />Editar</Link>
          <DuplicateButton
            id={l.id}
            title={l.title}
            defaultDate={addDaysISO(l.log_date, 7)}
            classes={classes}
            defaultClassId={l.class_id}
            base={base}
          />
          <ActionButton variant="danger" action={deleteRoutine.bind(null, l.id)} confirm={{ title: `¿Eliminar «${l.title}»?`, message: 'Se elimina la rutina y las marcas y asistencia registradas en ella.', confirmLabel: 'Eliminar' }}>Eliminar</ActionButton>
        </div>
      </li>
    );
  };

  return (
    <>
      <PageHeader
        title="Rutinas"
        subtitle="Diseña sesiones, consulta tu histórico y reutiliza rutinas creadas previamente para cualquier grupo."
        actions={
          <div className="flex rounded-md border border-line bg-panel2 p-1 text-sm">
            <Link
              href={`${base}/coach/routines?tab=designer`}
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 font-medium transition ${activeTab === 'designer' ? 'bg-gold font-bold text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
            >
              <LayoutGrid className="size-4" />
              Diseñador y Activas
            </Link>
            <Link
              href={`${base}/coach/routines?tab=history`}
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 font-medium transition ${activeTab === 'history' ? 'bg-gold font-bold text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
            >
              <History className="size-4" />
              Historial de Rutinas ({allLogs.length})
            </Link>
          </div>
        }
      />

      {activeTab === 'history' ? (
        <div className="space-y-6">
          <RoutineHistoryView
            logs={allLogs}
            classes={classes}
            base={base}
            nextDate={today}
          />
          <CatalogManager exercises={exercises} />
        </div>
      ) : (
        <div className="space-y-6">
          <RoutineDesigner
            key={editing?.id ?? 'new'}
            editing={editing}
            classes={shown}
            catalog={exercises.map((e) => e.name)}
            defaultClass={sp.class ?? ''}
            defaultDate={/^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? '') ? sp.date! : today}
            base={base}
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Próximas" pad={false}>
              {upcoming.length === 0 ? <EmptyState title="Sin rutinas programadas" /> : <ul className="divide-y divide-line">{upcoming.map((l) => <Row key={l.id} l={l} />)}</ul>}
            </Card>
            <Card title="Últimos 30 días" pad={false}>
              {past.length === 0 ? <EmptyState title="Aún no hay histórico reciente" /> : <ul className="divide-y divide-line">{past.map((l) => <Row key={l.id} l={l} />)}</ul>}
            </Card>
          </div>
          <CatalogManager exercises={exercises} />
        </div>
      )}
    </>
  );
}
