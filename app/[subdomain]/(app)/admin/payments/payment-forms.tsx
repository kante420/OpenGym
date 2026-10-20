'use client';
import { useState } from 'react';
import { Ban, Mail } from 'lucide-react';
import { ActionButton, ActionForm, SubmitButton } from '@/components/ui/action';
import { Modal } from '@/components/ui/modal';
import { Card, Field } from '@/components/ui/primitives';
import { createDiscountRule, registerPayment, resendReceipt, voidReceipt } from '@/lib/actions/billing';
import { formatEUR } from '@/lib/format';
import { PAYMENT_METHODS } from '@/lib/types';

export function CollectButton({ userId, name, base, vat, vatRate, total }: { userId: string; name: string; base: number; vat: number; vatRate: number; total: number }) {
  const [method, setMethod] = useState('Efectivo');
  return (
    <div className="flex items-center justify-end gap-2">
      <select value={method} onChange={(e) => setMethod(e.target.value)} className="select !h-8 !w-auto !py-0 text-xs" aria-label={`Método de pago de ${name}`}>
        {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
      </select>
      <ActionButton variant="primary" action={registerPayment.bind(null, userId, method)}
        confirm={{ title: 'Registrar cobro', message: `Se cobrarán ${formatEUR(total)} a ${name} por ${method.toLowerCase()} (base ${formatEUR(base)} + IVA ${Number(vatRate)} % ${formatEUR(vat)}) y se emitirá el recibo. Si tiene email, se le enviará automáticamente.`, confirmLabel: 'Cobrar' }}>
        Cobrar
      </ActionButton>
    </div>
  );
}

export function ReceiptActions({ id, code, voided, hasEmail }: { id: string; code: string; voided: boolean; hasEmail: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex justify-end gap-2">
      <a className="btn btn-ghost btn-sm" href={`/api/receipts/${id}/pdf`} target="_blank" rel="noreferrer">PDF</a>
      {!voided && hasEmail && <ActionButton action={resendReceipt.bind(null, id)} title="Reenviar por email"><Mail className="size-3.5" /></ActionButton>}
      {!voided && <button className="btn btn-danger btn-sm" onClick={() => setOpen(true)} title="Anular recibo"><Ban className="size-3.5" /></button>}
      <Modal open={open} onClose={() => setOpen(false)} title={`Anular ${code}`}>
        <ActionForm action={voidReceipt.bind(null, id)} onSuccess={() => setOpen(false)} className="space-y-4">
          <p className="text-sm text-muted">El recibo no se borra: queda marcado como anulado y la cuota del socio vuelve al estado anterior. El número no se reutiliza.</p>
          <Field label="Motivo de la anulación"><input name="reason" className="input" required minLength={3} placeholder="Ej.: cobro duplicado" /></Field>
          <div className="flex justify-end gap-3"><button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button><SubmitButton variant="danger">Anular recibo</SubmitButton></div>
        </ActionForm>
      </Modal>
    </div>
  );
}

export function RuleForm() {
  return (
    <Card title="Nueva regla de descuento">
      <ActionForm action={createDiscountRule} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="A partir de (actividades)"><input name="min_classes" type="number" min="2" defaultValue="2" className="input" required /></Field>
        <Field label="Descuento (%)"><input name="discount_percentage" type="number" min="1" max="90" step="0.5" defaultValue="30" className="input" required /></Field>
        <SubmitButton>Añadir regla</SubmitButton>
      </ActionForm>
    </Card>
  );
}
