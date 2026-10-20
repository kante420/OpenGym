import { Clock, MapPin } from 'lucide-react';
import { requirePage } from '@/lib/auth';
import { addDaysISO, daysBetween, formatDate, formatEUR, parseDays, startOfWeekISO, todayISO, WEEKDAYS } from '@/lib/format';
import { getBlocks } from '@/lib/routine';
import type { ClassRow, MemberBilling, WorkoutLog } from '@/lib/types';
import { BillingChip, Card, Chip, EmptyState, PageHeader } from '@/components/ui/primitives';

export const metadata = { title: 'Mi semana' };
type MyClass = ClassRow & { zones: { name: string } | null };

export default async function MeHome({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;
  const { supabase, profile } = await requirePage(subdomain, ['CLIENTE']);
  const today = todayISO();
  const monday = startOfWeekISO(today);
  const sunday = addDaysISO(monday, 6);

  const [bRes, lRes, fRes] = await Promise.all([
    supabase.from('bookings').select('classes(*, zones(name))').eq('user_id', profile.id),
    supabase.from('workout_logs').select('*, classes(title)').gte('log_date', monday).lte('log_date', sunday).order('log_date'),
    supabase.from('member_billing').select('*').eq('user_id', profile.id).maybeSingle(),
  ]);
  const classes = ((bRes.data ?? []) as unknown as { classes: MyClass | null }[]).map((b) => b.classes).filter((c): c is MyClass => !!c && c.active);
  const logs = (lRes.data ?? []) as WorkoutLog[];
  const fee = fRes.data as MemberBilling | null;
  const days = WEEKDAYS.map((name, i) => ({ name, date: addDaysISO(monday, i) }));
  const todayLogs = logs.filter((l) => l.log_date === today);
  const due = fee?.renewal_date ? daysBetween(today, fee.renewal_date) : null;

  return (
    <>
      <PageHeader title={`Hola, ${profile.full_name.split(' ')[0]}`} subtitle="Tus clases y entrenamientos de esta semana." />

      <div className="space-y-6">
        {fee && fee.billing_status !== 'SIN_ACTIVIDAD' && (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div><p className="text-sm text-muted">Tu cuota mensual</p><p className="display num text-4xl text-gold-hi">{formatEUR(fee.charge_total)}</p>
                <p className="text-xs text-faint">IVA {Number(fee.vat_rate)} % incluido: {formatEUR(fee.charge_vat)}</p>
                {fee.discount_pct > 0 && <p className="text-xs text-faint">Incluye un {Number(fee.discount_pct)}% de descuento por tus {fee.class_count} actividades</p>}</div>
              <div className="text-right"><BillingChip status={fee.billing_status} />
                <p className="mt-1.5 text-xs text-faint">{fee.billing_status === 'AL_DIA' && due !== null ? `Próxima cuota el ${formatDate(fee.renewal_date, { day: 'numeric', month: 'long' })}` : fee.billing_status === 'VENCIDO' ? 'Pásate por recepción para ponerte al día' : 'Primer pago pendiente en recepción'}</p></div>
            </div>
          </Card>
        )}

        <section aria-label="Entrenamiento de hoy">
          <h2 className="display mb-3 text-2xl text-muted">Hoy</h2>
          {todayLogs.length === 0 ? <Card><EmptyState title="Hoy no hay rutina publicada">Tu entrenador la publicará aquí antes de la clase.</EmptyState></Card> : todayLogs.map((l) => (
            <article key={l.id} className="card card-pad mb-3">
              <p className="text-sm text-muted">{l.classes?.title}</p>
              <h3 className="display mb-4 text-4xl">{l.title}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {getBlocks(l).map((b, i) => (
                  <div key={i} className="rounded-md border border-line bg-canvas/40 p-4">
                    <p className="mb-2 font-semibold text-gold-hi">{b.name}</p>
                    {b.exercises.length === 0 ? <p className="text-sm text-faint">Sin ejercicios</p> : (
                      <ul className="space-y-1.5 text-sm">{b.exercises.map((e, k) => <li key={k} className="flex justify-between gap-3"><span>{e.name}</span><span className="num text-muted">{e.sets} × {e.reps}</span></li>)}</ul>
                    )}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section aria-label="Semana">
          <h2 className="display mb-3 text-2xl text-muted">Esta semana</h2>
          {classes.length === 0 ? <Card><EmptyState title="Aún no estás inscrito en ninguna actividad">Pregunta en recepción por los horarios disponibles.</EmptyState></Card> : (
            <div className="grid gap-3 md:grid-cols-7">
              {days.map((d) => {
                const todays = classes.filter((c) => parseDays(c.days_of_week).includes(d.name));
                const isToday = d.date === today;
                return (
                  <div key={d.name} className={`card p-3 ${isToday ? 'border-gold/60' : ''}`}>
                    <p className={`text-sm font-semibold ${isToday ? 'text-gold-hi' : 'text-muted'}`}>{d.name}<span className="ml-1.5 text-xs font-normal text-faint">{d.date.slice(8)}</span></p>
                    <ul className="mt-2 space-y-2">
                      {todays.length === 0 && <li className="text-xs text-faint">Descanso</li>}
                      {todays.map((c) => (
                        <li key={c.id} className="rounded-md bg-panel2 p-2.5">
                          <p className="text-sm font-semibold leading-tight">{c.title}</p>
                          <p className="mt-1 flex items-center gap-1 text-xs text-muted"><Clock className="size-3" />{c.schedule_time}</p>
                          {c.zones?.name && <p className="flex items-center gap-1 text-xs text-faint"><MapPin className="size-3" />{c.zones.name}</p>}
                        </li>
                      ))}
                      {logs.filter((l) => l.log_date === d.date).map((l) => <li key={l.id}><Chip tone={l.is_completed ? 'ok' : 'gold'}>{l.title}</Chip></li>)}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
