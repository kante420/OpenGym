import { getAuth } from '@/lib/auth';
import { buildReceiptPdf } from '@/lib/receipt-pdf';
import type { Profile, Receipt } from '@/lib/types';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getAuth();
  if (!auth) return new Response('No autorizado', { status: 401 });

  // RLS: el administrador ve los recibos de su centro; un socio sólo los suyos
  const { data: receipt } = await auth.supabase.from('payment_receipts').select('*').eq('id', id).maybeSingle();
  if (!receipt) return new Response('Recibo no encontrado', { status: 404 });
  const { data: client } = await auth.supabase.from('profiles').select('full_name, dni, email').eq('id', receipt.user_id).maybeSingle();

  const pdf = buildReceiptPdf(auth.gym, (client ?? { full_name: '—', dni: null, email: null }) as Pick<Profile, 'full_name' | 'dni' | 'email'>, receipt as Receipt);
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Recibo_${receipt.receipt_code ?? id}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
