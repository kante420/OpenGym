import Link from 'next/link';
import { Download } from 'lucide-react';
import { requirePage } from '@/lib/auth';
import { gymBase } from '@/lib/paths';
import { daysBetween, formatDate, formatEUR, formatMonthLabel, todayISO } from '@/lib/format';
import type { DiscountRule, MemberBilling, Receipt } from '@/lib/types';
import { ActionButton } from '@/components/ui/action';
import { BillingChip, Card, Chip, EmptyState, PageHeader, Stat } from '@/components/ui/primitives';
import { deleteDiscountRule } from '@/lib/actions/billing';
import { CollectButton, ReceiptActions, RuleForm } from './payment-forms';

export const metadata = { title: 'Cobros' };
type Search = { tab?: string; status?: string; month?: string };

export default async function PaymentsPage({ params, searchParams }: { params: Promise<{ subdomain: string }>; searchParams: Promise<Search> }) {
  const { subdomain } = await params;
  const sp = await searchParams;
  const tab = sp.tab === 'receipts' || sp.tab === 'rules' ? sp.tab : 'fees';
  const { supabase, gym } = await requirePage(subdomain, ['ADMINISTRADOR']);
  const base = `${await gymBase(subdomain)}/admin/payments`;
  const today = todayISO();

  const [bRes, rRes, dRes] = await Promise.all([
    supabase.from('member_billing').select('*').eq('gym_id', gym.id).eq('active', true).order('full_name'),
    supabase.from('payment_receipts').select('*').eq('gym_id', gym.id).order('created_at', { ascending: false }).limit(1000),
    supabase.from('discount_rules').select('*').eq('gym_id', gym.id).order('min_classes'),
  ]);
  const members = (bRes.data ?? []) as MemberBilling[];
  const receipts = (rRes.data ?? []) as Receipt[];
  const rules = (dRes.data ?? []) as DiscountRule[];
  const byId = new Map(members.map((m) => [m.user_id, m]));

  const months = [...new Set([today.slice(0, 7), ...receipts.map((r) => r.payment_date.slice(0, 7))])].sort().reverse();
  const month = sp.month && months.includes(sp.month) ? sp.month : today.slice(0, 7);
  const monthReceipts = receipts.filter((r) => r.payment_date.startsWith(month));
  const valid = monthReceipts.filter((r) => !r.voided_at);
  const total = valid.reduce((s, r) => s + Number(r.amount), 0);
  const vatTotal = valid.reduce((s, r) => s + Number(r.vat_amount ?? 0), 0);

  const status = sp.status ?? '';
  const feeRows = members.filter((m) => m.billing_status !== 'SIN_ACTIVIDAD' && (!status || m.billing_status === status));
  const owed = members.filter((m) => m.billing_status === 'PENDIENTE' || m.billing_status === 'VENCIDO');

  const tabs = [['fees', 'Cuotas'], ['receipts', 'Recibos'], ['rules', 'Descuentos']] as const;

  return (
    <>
      <PageHeader title="Cobros" subtitle="Cuotas mensuales calculadas según las actividades de cada socio, con descuentos aplicados automáticamente." />
      <div className="mb-6 flex gap-1 border-b border-line" role="tablist">
        {tabs.map(([k, label]) => (
          <Link key={k} href={`${base}?tab=${k}`} role="tab" aria-selected={tab === k}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold ${tab === k ? 'border-gold text-gold-hi' : 'border-transparent text-muted hover:text-fg'}`}>{label}</Link>
        ))}
      </div>

      {tab === 'fees' && (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <Stat label="Pendiente de cobro" value={formatEUR(owed.reduce((s, m) => s + Number(m.charge_total), 0))} tone={owed.length ? 'bad' : 'ok'} sub={`${owed.length} socios`} />
            <Stat label="Al día" value={members.filter((m) => m.billing_status === 'AL_DIA').length} tone="ok" />
            <Stat label="Vencidos" value={members.filter((m) => m.billing_status === 'VENCIDO').length} tone="bad" />
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            {[['', 'Todos'], ['PENDIENTE', 'Pendientes'], ['VENCIDO', 'Vencidos'], ['AL_DIA', 'Al día']].map(([v, l]) => (
              <Link key={v} href={`${base}?tab=fees${v ? `&status=${v}` : ''}`} className={`chip px-4 ${status === v ? 'chip-gold' : ''}`}>{l}</Link>
            ))}
          </div>
          <Card pad={false}>
            {feeRows.length === 0 ? <EmptyState title="Nada que mostrar">{members.length ? 'No hay socios con ese estado.' : 'Inscribe socios en actividades para generar sus cuotas.'}</EmptyState> : (
              <div className="scroll-x"><table className="table">
                <thead><tr><th>Socio</th><th className="text-right">Act.</th><th className="text-right">Dto.</th><th className="text-right">Base</th><th className="text-right">IVA</th><th className="text-right">Total</th><th>Vence</th><th>Estado</th><th className="text-right">Cobro</th></tr></thead>
                <tbody>{feeRows.map((m) => {
                  const d = m.renewal_date ? daysBetween(today, m.renewal_date) : null;
                  return (
                    <tr key={m.user_id}>
                      <td><p className="font-semibold">{m.full_name}</p><p className="text-xs text-faint">{m.email ?? 'sin email'}</p></td>
                      <td className="num text-right">{m.class_count}</td>
                      <td className="num text-right text-muted">{m.discount_pct > 0 ? `−${Number(m.discount_pct)}%` : '—'}</td>
                      <td className="num text-right text-muted">{formatEUR(m.charge_base)}</td>
                      <td className="num text-right text-muted">{formatEUR(m.charge_vat)}<span className="block text-xs text-faint">{Number(m.vat_rate)} %</span></td>
                      <td className="num text-right font-semibold">{formatEUR(m.charge_total)}</td>
                      <td className="whitespace-nowrap text-sm">{m.renewal_date && m.last_payment_date ? <>{formatDate(m.renewal_date, { day: 'numeric', month: 'long' })}<span className="block text-xs text-faint">{d !== null && d < 0 ? `hace ${-d} d` : d === 0 ? 'hoy' : `en ${d} d`}</span></> : <span className="text-faint">Primer pago</span>}</td>
                      <td><BillingChip status={m.billing_status} /></td>
                      <td>{m.billing_status === 'AL_DIA' ? <span className="block text-right text-xs text-faint">Pagado {formatDate(m.last_payment_date)}</span> : <CollectButton userId={m.user_id} name={m.full_name} base={m.charge_base} vat={m.charge_vat} vatRate={m.vat_rate} total={m.charge_total} />}</td>
                    </tr>);
                })}</tbody>
              </table></div>
            )}
          </Card>
        </>
      )}

      {tab === 'receipts' && (
        <>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <form className="flex items-end gap-2">
              <input type="hidden" name="tab" value="receipts" />
              <label><span className="label">Mes</span><select name="month" defaultValue={month} className="select !w-52">{months.map((m) => <option key={m} value={m}>{formatMonthLabel(m)}</option>)}</select></label>
              <button className="btn btn-ghost">Ver</button>
            </form>
            <a className="btn btn-ghost" href={`/api/export/payments?month=${month}`}><Download className="size-4" />Exportar CSV</a>
          </div>
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <Stat label="Total cobrado" value={formatEUR(total)} tone="gold" sub={`${valid.length} recibos`} />
            <Stat label="IVA repercutido" value={formatEUR(vatTotal)} />
            <Stat label="Base imponible" value={formatEUR(total - vatTotal)} />
          </div>
          <Card pad={false}>
            {monthReceipts.length === 0 ? <EmptyState title="Sin recibos este mes" /> : (
              <div className="scroll-x"><table className="table">
                <thead><tr><th>Recibo</th><th>Socio</th><th>Fecha</th><th>Método</th><th className="text-right">Total</th><th>Estado</th><th className="text-right">Acciones</th></tr></thead>
                <tbody>{monthReceipts.map((r) => (
                  <tr key={r.id} className={r.voided_at ? 'opacity-60' : ''}>
                    <td className="num whitespace-nowrap font-semibold">{r.receipt_code}</td>
                    <td>{byId.get(r.user_id)?.full_name ?? '—'}</td>
                    <td className="whitespace-nowrap text-sm">{formatDate(r.payment_date)}</td>
                    <td>{r.payment_method}</td>
                    <td className={`num text-right ${r.voided_at ? 'line-through' : ''}`}>{formatEUR(r.amount)}</td>
                    <td>{r.voided_at ? <span title={r.void_reason ?? ''}><Chip tone="bad">Anulado</Chip></span> : <Chip tone="ok">Válido</Chip>}</td>
                    <td><ReceiptActions id={r.id} code={r.receipt_code ?? ''} voided={!!r.voided_at} hasEmail={!!byId.get(r.user_id)?.email} /></td>
                  </tr>))}</tbody>
              </table></div>
            )}
          </Card>
        </>
      )}

      {tab === 'rules' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Reglas activas" pad={false}>
            {rules.length === 0 ? <EmptyState title="Sin descuentos">Los socios pagan la suma de sus actividades.</EmptyState> : (
              <ul className="divide-y divide-line">{rules.map((r) => (
                <li key={r.id} className="flex items-center justify-between px-5 py-3.5">
                  <p><span className="display num text-3xl text-gold-hi">{Number(r.discount_percentage)}%</span> <span className="ml-2 text-sm text-muted">desde {r.min_classes} actividades</span></p>
                  <ActionButton variant="danger" action={deleteDiscountRule.bind(null, r.id)} confirm={{ title: 'Eliminar regla', message: 'Las cuotas de los socios afectados se recalcularán al instante.', confirmLabel: 'Eliminar' }}>Eliminar</ActionButton>
                </li>))}</ul>
            )}
          </Card>
          <div className="space-y-6">
            <RuleForm />
            <p className="text-sm text-muted">Si varias reglas aplican a un socio, se usa la de mayor descuento sobre el total de sus actividades. Los precios de cada actividad se editan en <Link className="text-gold underline" href={`${base.replace('/admin/payments', '/admin/classes')}`}>Actividades</Link>.</p>
          </div>
        </div>
      )}
    </>
  );
}
