import Link from 'next/link';
import type { SupabaseClient } from '@supabase/supabase-js';
import { estimate1RM, formatDate } from '@/lib/format';
import type { BodyMeasurement, StudentLog } from '@/lib/types';
import { Card, EmptyState, Stat } from '@/components/ui/primitives';
import { LineChart } from '@/components/ui/line-chart';
import { BodyForm } from '@/components/body-form';

interface Session { date: string; best: number; reps: number | null }

/** Progreso de un socio: marcas por ejercicio, peso corporal y asistencia. Lo usan el socio y el entrenador. */
export async function ProgressView({ supabase, userId, ex, basePath, allowBodyLog }: {
  supabase: SupabaseClient; userId: string; ex?: string; basePath: string; allowBodyLog: boolean;
}) {
  const [lRes, bRes, aRes] = await Promise.all([
    supabase.from('student_logs').select('*, workout_logs(title, log_date)').eq('user_id', userId).order('created_at'),
    supabase.from('body_measurements').select('*').eq('user_id', userId).order('measured_on'),
    supabase.from('attendance_logs').select('attended').eq('user_id', userId),
  ]);
  const logs = (lRes.data ?? []) as StudentLog[];
  const body = (bRes.data ?? []) as BodyMeasurement[];
  const att = (aRes.data ?? []) as { attended: boolean }[];

  // ejercicio → sesiones (mejor peso de cada día)
  const byEx = new Map<string, Map<string, Session>>();
  for (const l of logs) {
    const date = l.workout_logs?.log_date ?? l.created_at.slice(0, 10);
    const m = byEx.get(l.exercise_name) ?? new Map<string, Session>();
    const cur = m.get(date);
    if (!cur || Number(l.weight_kg) > cur.best) m.set(date, { date, best: Number(l.weight_kg), reps: l.reps });
    byEx.set(l.exercise_name, m);
  }
  const summary = [...byEx.entries()].map(([name, m]) => {
    const sessions = [...m.values()].sort((a, b) => a.date.localeCompare(b.date));
    const max = sessions.reduce((a, s) => (s.best >= a.best ? s : a), sessions[0]);
    const last = sessions.at(-1)!;
    const prev = sessions.at(-2);
    return { name, sessions, max, last, delta: prev ? Math.round((last.best - prev.best) * 10) / 10 : null };
  }).sort((a, b) => b.last.date.localeCompare(a.last.date));

  const selected = summary.find((s) => s.name === ex) ?? summary[0];
  const attended = att.filter((a) => a.attended).length;
  const rate = att.length ? Math.round((attended / att.length) * 100) : null;
  const link = (name: string) => `${basePath}${basePath.includes('?') ? '&' : '?'}ex=${encodeURIComponent(name)}`;
  const nowW = body.at(-1)?.weight_kg;
  const diffW = body.length > 1 ? Math.round((body.at(-1)!.weight_kg - body[0].weight_kg) * 10) / 10 : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Asistencia" value={rate === null ? '—' : `${rate}%`} tone="gold" sub={att.length ? `${attended} de ${att.length} sesiones` : 'Aún sin sesiones'} />
        <Stat label="Ejercicios con marcas" value={summary.length} />
        <Stat label="Peso corporal" value={nowW ? `${nowW} kg` : '—'} sub={diffW === null ? undefined : `${diffW > 0 ? '+' : ''}${diffW} kg desde el primer registro`} />
      </div>

      <Card title="Marcas por ejercicio" pad={false}>
        {summary.length === 0 ? <EmptyState title="Sin marcas todavía">Se registran al cerrar cada sesión de entrenamiento.</EmptyState> : (
          <div className="grid lg:grid-cols-[260px_1fr]">
            <ul className="max-h-96 divide-y divide-line overflow-y-auto border-b border-line lg:border-b-0 lg:border-r">
              {summary.map((s) => (
                <li key={s.name}>
                  <Link href={link(s.name)} scroll={false} aria-current={s.name === selected?.name ? 'true' : undefined}
                    className={`flex items-center justify-between gap-3 px-5 py-3 text-sm ${s.name === selected?.name ? 'bg-panel2 text-gold-hi' : 'hover:bg-panel2/60'}`}>
                    <span className="truncate">{s.name}</span>
                    <span className="num shrink-0 font-semibold">{s.last.best} kg</span>
                  </Link>
                </li>
              ))}
            </ul>
            {selected && (
              <div className="space-y-5 p-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <h3 className="display text-3xl">{selected.name}</h3>
                  <p className="text-sm text-muted">Récord <strong className="num text-gold-hi">{selected.max.best} kg</strong> · {formatDate(selected.max.date)}
                    {selected.delta !== null && <span className={selected.delta >= 0 ? ' ml-3 text-ok' : ' ml-3 text-bad'}>{selected.delta > 0 ? '+' : ''}{selected.delta} kg vs. anterior</span>}</p>
                </div>
                <LineChart label={`Evolución de ${selected.name}`} data={selected.sessions.map((s) => ({ x: formatDate(s.date, { day: 'numeric', month: 'short' }), y: s.best }))} />
                <div className="scroll-x"><table className="table"><thead><tr><th>Fecha</th><th className="text-right">Peso</th><th className="text-right">Reps</th><th className="text-right">1RM estimado</th></tr></thead>
                  <tbody>{[...selected.sessions].reverse().slice(0, 8).map((s) => (
                    <tr key={s.date}><td>{formatDate(s.date)}</td><td className="num text-right">{s.best} kg</td><td className="num text-right">{s.reps ?? '—'}</td><td className="num text-right text-muted">{s.reps ? `${estimate1RM(s.best, s.reps)} kg` : '—'}</td></tr>
                  ))}</tbody></table></div>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card title="Peso corporal">
        <div className="space-y-5">
          {body.length >= 2 ? <LineChart label="Peso corporal" data={body.map((b) => ({ x: formatDate(b.measured_on, { day: 'numeric', month: 'short' }), y: Number(b.weight_kg) }))} /> : (
            <p className="text-sm text-muted">{body.length === 0 ? 'Aún no hay mediciones.' : 'Con una segunda medición verás la gráfica.'}</p>
          )}
          {allowBodyLog ? <BodyForm entries={body} /> : null}
        </div>
      </Card>
    </div>
  );
}
