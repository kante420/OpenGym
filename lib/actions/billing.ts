'use server';
import { z } from 'zod';
import { requireRole, UserError } from '../auth';
import { buildReceiptPdf } from '../receipt-pdf';
import { emailConfigured, explainEmailError, sendReceiptEmail } from '../email';
import { PAYMENT_METHODS, type ActionResult, type Gym, type Profile, type Receipt } from '../types';
import { num, run, str, unwrap } from './shared';

type MailResult = { status: 'enviado' | 'sin-email' | 'no-configurado' | 'error'; note: string };

async function emailReceiptInternal(gym: Gym, client: Profile, receipt: Receipt): Promise<MailResult> {
  if (!client.email) return { status: 'sin-email', note: 'El socio no tiene email: descarga el recibo.' };
  if (!emailConfigured()) return { status: 'no-configurado', note: 'Envío por email no configurado (ver README).' };
  try {
    await sendReceiptEmail({ gym, to: client.email, clientName: client.full_name, receipt, pdf: buildReceiptPdf(gym, client, receipt) });
    return { status: 'enviado', note: `Recibo enviado a ${client.email}.` };
  } catch (e) {
    console.error('[email]', e); // el detalle completo queda en la consola del servidor
    return { status: 'error', note: explainEmailError(e) };
  }
}

export async function registerPayment(userId: string, method: string): Promise<ActionResult<{ receiptId: string }>> {
  return run<{ receiptId: string }>(async () => {
    const { supabase, gym } = await requireRole(['ADMINISTRADOR']);
    if (!PAYMENT_METHODS.includes(method as never)) throw new UserError('Método de pago no válido.');
    // El importe lo calcula la base de datos: el navegador no puede alterarlo
    const receipt = unwrap(await supabase.rpc('register_payment', { p_user_id: userId, p_method: method })) as Receipt;
    const { data: client } = await supabase.from('profiles').select('*').eq('id', userId).single();
    const mail = client ? await emailReceiptInternal(gym, client as Profile, receipt) : { note: 'No se pudo leer el email del socio.' };
    return { message: `Cobro registrado · ${receipt.receipt_code}. ${mail.note}`, data: { receiptId: receipt.id } };
  });
}

export async function resendReceipt(receiptId: string) {
  return run(async () => {
    const { supabase, gym } = await requireRole(['ADMINISTRADOR']);
    const { data: receipt } = await supabase.from('payment_receipts').select('*').eq('id', receiptId).maybeSingle();
    if (!receipt) throw new UserError('Recibo no encontrado.');
    const { data: client } = await supabase.from('profiles').select('*').eq('id', receipt.user_id).single();
    const mail = await emailReceiptInternal(gym, client as Profile, receipt as Receipt);
    if (mail.status !== 'enviado') throw new UserError(mail.note);
    return { message: mail.note };
  }, false);
}

export async function voidReceipt(receiptId: string, _p: ActionResult | null, fd: FormData) {
  return run(async () => {
    const { supabase } = await requireRole(['ADMINISTRADOR']);
    unwrap(await supabase.rpc('void_receipt', { p_receipt_id: receiptId, p_reason: str(fd, 'reason') }));
    return { message: 'Recibo anulado. La cuota del socio se ha revertido.' };
  });
}

// ── Descuentos ───────────────────────────────────────────────────────────────
const ruleSchema = z.object({
  min_classes: z.number().int().min(2, 'Un descuento aplica a partir de 2 actividades.').max(20),
  discount_percentage: z.number().min(1, 'El descuento debe ser mayor que 0.').max(90, 'El máximo es 90 %.'),
});

export async function createDiscountRule(_p: ActionResult | null, fd: FormData) {
  return run(async () => {
    const { supabase, profile } = await requireRole(['ADMINISTRADOR']);
    const r = ruleSchema.safeParse({ min_classes: num(fd, 'min_classes'), discount_percentage: num(fd, 'discount_percentage') });
    if (!r.success) throw new UserError(r.error.issues[0].message);
    const { data: existing } = await supabase.from('discount_rules').select('id').eq('gym_id', profile.gym_id).eq('min_classes', r.data.min_classes);
    if (existing?.length) throw new UserError(`Ya existe una regla para ${r.data.min_classes} actividades. Elimínala antes.`);
    unwrap(await supabase.from('discount_rules').insert({ gym_id: profile.gym_id, ...r.data }));
    return { message: 'Regla de descuento creada.' };
  });
}

export async function deleteDiscountRule(id: string) {
  return run(async () => {
    const { supabase, profile } = await requireRole(['ADMINISTRADOR']);
    unwrap(await supabase.from('discount_rules').delete().eq('id', id).eq('gym_id', profile.gym_id));
    return { message: 'Regla eliminada.' };
  });
}
