import { getAuth } from '@/lib/auth';
import type { Receipt } from '@/lib/types';

const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const eur = (n: number | null) => (n == null ? '' : Number(n).toFixed(2).replace('.', ','));

export async function GET(req: Request) {
  const auth = await getAuth();
  if (!auth || auth.profile.role !== 'ADMINISTRADOR') return new Response('No autorizado', { status: 403 });

  const month = new URL(req.url).searchParams.get('month') ?? '';
  if (!/^\d{4}-\d{2}$/.test(month)) return new Response('Mes no válido (usa AAAA-MM)', { status: 400 });
  const [y, m] = month.split('-').map(Number);
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;

  const { data } = await auth.supabase.from('payment_receipts').select('*').eq('gym_id', auth.gym.id)
    .gte('payment_date', `${month}-01`).lt('payment_date', next).order('receipt_code');
  const receipts = (data ?? []) as Receipt[];
  const { data: people } = await auth.supabase.from('profiles').select('id, full_name, dni').eq('gym_id', auth.gym.id);
  const who = new Map((people ?? []).map((p: { id: string; full_name: string; dni: string | null }) => [p.id, p]));

  const head = ['Recibo', 'Fecha', 'Socio', 'DNI', 'Concepto', 'Método', 'Base', 'IVA %', 'IVA', 'Total', 'Estado'];
  const rows = receipts.map((r) => {
    const p = who.get(r.user_id);
    return [r.receipt_code, r.payment_date, p?.full_name, p?.dni, r.concept, r.payment_method, eur(r.base_amount), r.vat_rate ?? '', eur(r.vat_amount), eur(r.amount), r.voided_at ? 'ANULADO' : 'Válido'].map(cell).join(';');
  });
  // BOM + separador «;» para que Excel en español lo abra bien
  const csv = '\uFEFF' + [head.map(cell).join(';'), ...rows].join('\r\n');
  return new Response(csv, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="cobros_${month}.csv"`, 'Cache-Control': 'private, no-store' },
  });
}
