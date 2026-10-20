import { requirePage } from '@/lib/auth';
import { formatDate, formatEUR } from '@/lib/format';
import type { Receipt } from '@/lib/types';
import { Card, Chip, EmptyState, PageHeader } from '@/components/ui/primitives';
import { ChangePasswordCard } from '@/components/change-password';

export const metadata = { title: 'Perfil' };

export default async function MeProfile({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;
  const { supabase, profile } = await requirePage(subdomain, ['CLIENTE']);
  const { data } = await supabase.from('payment_receipts').select('*').eq('user_id', profile.id).order('payment_date', { ascending: false }).limit(24);
  const receipts = (data ?? []) as Receipt[];

  return (
    <>
      <PageHeader title="Perfil" />
      <div className="space-y-6">
        <Card title="Tus datos">
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div><dt className="text-faint">Nombre</dt><dd className="font-semibold">{profile.full_name}</dd></div>
            <div><dt className="text-faint">Usuario</dt><dd className="font-semibold">@{profile.username}</dd></div>
            <div><dt className="text-faint">Email</dt><dd className="font-semibold">{profile.email ?? '—'}</dd></div>
            <div><dt className="text-faint">Teléfono</dt><dd className="font-semibold">{profile.phone ?? '—'}</dd></div>
          </dl>
          <p className="mt-4 text-xs text-faint">¿Algún dato es incorrecto? Díselo a recepción para que lo actualicen.</p>
        </Card>

        <Card title="Mis recibos" pad={false}>
          {receipts.length === 0 ? <EmptyState title="Aún no tienes recibos" /> : (
            <div className="scroll-x"><table className="table"><thead><tr><th>Recibo</th><th>Fecha</th><th>Concepto</th><th className="text-right">Importe</th><th className="text-right">PDF</th></tr></thead>
              <tbody>{receipts.map((r) => (
                <tr key={r.id}><td className="num">{r.receipt_code}</td><td className="whitespace-nowrap">{formatDate(r.payment_date)}</td><td className="text-sm text-muted">{r.concept} {r.voided_at && <Chip tone="bad">Anulado</Chip>}</td>
                  <td className="num text-right">{formatEUR(r.amount)}</td><td className="text-right"><a className="btn btn-ghost btn-sm" href={`/api/receipts/${r.id}/pdf`} target="_blank" rel="noreferrer">Descargar</a></td></tr>
              ))}</tbody></table></div>
          )}
        </Card>
        <ChangePasswordCard />
      </div>
    </>
  );
}
