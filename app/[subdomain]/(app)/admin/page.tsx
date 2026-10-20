import Link from 'next/link';
import { requirePage } from '@/lib/auth';
import { gymBase } from '@/lib/paths';
import { addDaysISO, daysBetween, formatDate, formatEUR, formatMonthLabel, todayISO } from '@/lib/format';
import type { MemberBilling, Receipt } from '@/lib/types';
import { BillingChip, Card, EmptyState, PageHeader, Progress, Stat } from '@/components/ui/primitives';

export const metadata = { title: 'Resumen' };

function lastMonths(today: string, n: number) {
  let [y, m] = today.split('-').map(Number);
  const out: string[] = [];
  for (let i = 0; i < n; i++) { out.unshift(`${y}-${String(m).padStart(2, '0')}`); if (--m === 0) { m = 12; y--; } }
  return out;
}

export default async function AdminHome({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;
  const { supabase, gym, profile } = await requirePage(subdomain, ['ADMINISTRADOR']);
  const base = await gymBase(subdomain);
  const today = todayISO();
  const months = lastMonths(today, 6);

  const [billingRes, receiptsRes, classesRes] = await Promise.all([
    supabase.from('member_billing').select('*').eq('gym_id', gym.id).eq('active', true),
    supabase.from('payment_receipts').select('*').eq('gym_id', gym.id).gte('payment_date', `${months[0]}-01`).order('created_at', { ascending: false }),
    supabase.from('classes').select('id, title, capacity, bookings(user_id)').eq('gym_id', gym.id).eq('active', true),
  ]);
  const members = (billingRes.data ?? []) as MemberBilling[];
  const receipts = ((receiptsRes.data ?? []) as Receipt[]).filter((r) => !r.voided_at);
  const classes = (classesRes.data ?? []) as { id: string; title: string; capacity: number | null; bookings: unknown[] }[];

  const thisMonth = today.slice(0, 7);
  const collected = receipts.filter((r) => r.payment_date.startsWith(thisMonth)).reduce((s, r) => s + Number(r.amount), 0);
  const owing = members.filter((m) => m.billing_status === 'PENDIENTE' || m.billing_status === 'VENCIDO');
  const owedTotal = owing.reduce((s, m) => s + Number(m.charge_total), 0);
  const withFee = members.filter((m) => m.billing_status !== 'SIN_ACTIVIDAD').length;
  const capped = classes.filter((c) => c.capacity);
  const occupancy = capped.length ? Math.round((capped.reduce((s, c) => s + c.bookings.length, 0) / capped.reduce((s, c) => s + (c.capacity ?? 0), 0)) * 100) : null;
  const upcoming = members
    .filter((m) => m.billing_status === 'AL_DIA' && m.renewal_date && m.renewal_date <= addDaysISO(today, 7))
    .sort((a, b) => a.renewal_date!.localeCompare(b.renewal_date!));
  const byMonth = months.map((mo) => ({ mo, total: receipts.filter((r) => r.payment_date.startsWith(mo)).reduce((s, r) => s + Number(r.amount), 0) }));
  const maxMonth = Math.max(...byMonth.map((b) => b.total), 1);
  const nameOf = new Map(members.map((m) => [m.user_id, m.full_name]));

  return (
    <>
      <PageHeader title={`Hola, ${profile.full_name.split(' ')[0]}`} subtitle={`Así está ${gym.name} a ${formatDate(today, { weekday: 'long', day: 'numeric', month: 'long', year: undefined })}.`}
        actions={<Link href={`${base}/admin/payments`} className="btn btn-primary">Ir a cobros</Link>} />

      {classes.length === 0 && (
        <Card title="Primeros pasos" className="mb-6">
          <ol className="grid gap-3 text-sm sm:grid-cols-3">
            {[['1', 'Completa los datos del centro', 'NIF, dirección e IVA para los recibos.', '/admin/settings'], ['2', 'Crea tus actividades', 'Horario, precio, aforo y zona.', '/admin/classes'], ['3', 'Da de alta a tu equipo y socios', 'Entrenadores y socios con su acceso.', '/admin/members']].map(([n, t, d, href]) => (
              <li key={n} className="rounded-md bg-panel2 p-4"><span className="display text-3xl text-gold">{n}</span><p className="mt-1 font-semibold">{t}</p><p className="mb-3 text-xs text-muted">{d}</p><Link href={`${base}${href}`} className="btn btn-ghost btn-sm">Ir</Link></li>
            ))}
          </ol>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={`Cobrado en ${formatMonthLabel(thisMonth).split(' ')[0].toLowerCase()}`} value={formatEUR(collected)} tone="gold" sub={`${receipts.filter((r) => r.payment_date.startsWith(thisMonth)).length} recibos`} />
        <Stat label="Pendiente de cobro" value={formatEUR(owedTotal)} tone={owing.length ? 'bad' : 'ok'} sub={`${owing.length} socios`} />
        <Stat label="Socios con cuota" value={withFee} sub={`${members.length} socios activos`} />
        <Stat label="Ocupación" value={occupancy === null ? '—' : `${occupancy}%`} sub={occupancy === null ? 'Define el aforo de tus actividades' : 'Plazas ocupadas'} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card title="Ingresos de los últimos 6 meses" className="lg:col-span-3">
          <div className="flex h-44 items-end gap-3" role="img" aria-label="Ingresos por mes">
            {byMonth.map((b) => (
              <div key={b.mo} className="flex flex-1 flex-col items-center gap-2">
                <span className="num text-xs text-muted">{b.total ? Math.round(b.total) : ''}</span>
                <div className="w-full -skew-x-[14deg] rounded-sm bg-gradient-to-t from-bronze via-gold to-gold-hi" style={{ height: `${Math.max(4, (b.total / maxMonth) * 100)}%`, opacity: b.mo === thisMonth ? 1 : 0.6 }} />
                <span className="text-xs text-faint">{formatMonthLabel(b.mo).slice(0, 3)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Ocupación por actividad" className="lg:col-span-2">
          {classes.length === 0 ? <EmptyState title="Sin actividades" /> : (
            <ul className="space-y-4">
              {classes.map((c) => (
                <li key={c.id}>
                  <div className="mb-1.5 flex justify-between text-sm"><span>{c.title}</span><span className="num text-muted">{c.bookings.length}{c.capacity ? ` / ${c.capacity}` : ''}</span></div>
                  <Progress value={c.capacity ? (c.bookings.length / c.capacity) * 100 : 0} label={`Ocupación de ${c.title}`} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Pendientes y vencidos" pad={false} className="lg:col-span-3" action={<Link href={`${base}/admin/payments`} className="text-sm text-gold hover:underline">Ver todos</Link>}>
          {owing.length === 0 ? <EmptyState title="Todo cobrado">No hay cuotas pendientes ahora mismo.</EmptyState> : (
            <ul className="divide-y divide-line">
              {owing.slice(0, 6).map((m) => (
                <li key={m.user_id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div><p className="text-sm font-semibold">{m.full_name}</p><p className="text-xs text-faint">{m.renewal_date ? `Venció el ${formatDate(m.renewal_date)}` : 'Sin primer pago'}</p></div>
                  <div className="flex items-center gap-3"><span className="num text-sm">{formatEUR(m.charge_total)}</span><BillingChip status={m.billing_status} /></div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Renuevan esta semana" pad={false} className="lg:col-span-2">
          {upcoming.length === 0 ? <EmptyState title="Nada próximo" /> : (
            <ul className="divide-y divide-line">
              {upcoming.slice(0, 6).map((m) => {
                const d = daysBetween(today, m.renewal_date!);
                return <li key={m.user_id} className="flex items-center justify-between px-5 py-3 text-sm"><span>{m.full_name}</span><span className="text-faint">{d <= 0 ? 'hoy' : d === 1 ? 'mañana' : `en ${d} días`}</span></li>;
              })}
            </ul>
          )}
        </Card>

        <Card title="Últimos recibos" pad={false} className="lg:col-span-5">
          {receipts.length === 0 ? <EmptyState title="Aún no hay cobros">Cuando registres el primero aparecerá aquí.</EmptyState> : (
            <div className="scroll-x"><table className="table"><thead><tr><th>Recibo</th><th>Socio</th><th>Fecha</th><th>Método</th><th className="text-right">Importe</th></tr></thead>
              <tbody>{receipts.slice(0, 6).map((r) => (
                <tr key={r.id}><td className="num">{r.receipt_code}</td><td>{nameOf.get(r.user_id) ?? '—'}</td><td>{formatDate(r.payment_date)}</td><td>{r.payment_method}</td><td className="num text-right">{formatEUR(r.amount)}</td></tr>
              ))}</tbody></table></div>
          )}
        </Card>
      </div>
    </>
  );
}
