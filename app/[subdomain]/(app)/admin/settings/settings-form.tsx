'use client';
import { ActionForm, SubmitButton } from '@/components/ui/action';
import { Card, Field } from '@/components/ui/primitives';
import { updateGymSettings } from '@/lib/actions/settings';
import type { Gym } from '@/lib/types';

export function SettingsForm({ gym }: { gym: Gym }) {
  return (
    <ActionForm action={updateGymSettings} resetOnSuccess={false} className="space-y-6">
      <Card title="Datos del centro">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre comercial"><input name="name" className="input" defaultValue={gym.name} required /></Field>
          <Field label="Razón social" hint="Aparece como emisor en los recibos."><input name="legal_name" className="input" defaultValue={gym.legal_name ?? ''} /></Field>
          <Field label="NIF / CIF"><input name="tax_id" className="input" defaultValue={gym.tax_id ?? ''} /></Field>
          <Field label="Teléfono"><input name="phone" type="tel" className="input" defaultValue={gym.phone ?? ''} /></Field>
          <Field label="Dirección" className="sm:col-span-2"><input name="address" className="input" defaultValue={gym.address ?? ''} /></Field>
          <Field label="Email de contacto" hint="Los socios podrán responder a los recibos a esta dirección."><input name="contact_email" type="email" className="input" defaultValue={gym.contact_email ?? ''} /></Field>
        </div>
      </Card>
      <Card title="Recibos e impuestos">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="IVA (%)" hint="Lo habitual en un gimnasio privado es el 21 %. Confírmalo con tu gestor: puede haber exenciones según tu tipo de entidad."><input name="vat_rate" type="number" step="0.01" min="0" max="30" className="input" defaultValue={gym.vat_rate} required /></Field>
          <Field label="Los precios de las actividades…"><select name="prices_include_vat" className="select" defaultValue={String(gym.prices_include_vat)}><option value="true">ya incluyen IVA</option><option value="false">no incluyen IVA</option></select></Field>
          <Field label="Prefijo de numeración" hint="Ej.: FG → FG-2026-000001."><input name="receipt_prefix" className="input uppercase" defaultValue={gym.receipt_prefix} maxLength={6} required /></Field>
        </div>
        <p className="mt-4 text-xs text-faint">Los recibos son comprobantes de pago. Consulta con tu gestor qué tipo de factura necesitas emitir y qué tipo de IVA corresponde a tu actividad.</p>
      </Card>
      <SubmitButton size="lg">Guardar ajustes</SubmitButton>
    </ActionForm>
  );
}
