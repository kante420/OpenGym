'use client';
import { Trash2 } from 'lucide-react';
import { ActionButton, ActionForm, SubmitButton } from '@/components/ui/action';
import { Field } from '@/components/ui/primitives';
import { addMeasurement, deleteMeasurement } from '@/lib/actions/routines';
import { formatDate } from '@/lib/format';
import type { BodyMeasurement } from '@/lib/types';

export function BodyForm({ entries }: { entries: BodyMeasurement[] }) {
  return (
    <div className="space-y-5">
      <ActionForm action={addMeasurement} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <Field label="Peso (kg)"><input name="weight_kg" inputMode="decimal" className="input" placeholder="72,5" required /></Field>
        <Field label="% grasa (opcional)"><input name="body_fat_pct" inputMode="decimal" className="input" placeholder="18" /></Field>
        <Field label="Fecha"><input name="measured_on" type="date" className="input" /></Field>
        <SubmitButton>Guardar</SubmitButton>
      </ActionForm>
      {entries.length > 0 && (
        <ul className="divide-y divide-line rounded-md border border-line">
          {[...entries].reverse().slice(0, 6).map((m) => (
            <li key={m.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-muted">{formatDate(m.measured_on)}</span>
              <span className="num font-semibold">{m.weight_kg} kg{m.body_fat_pct ? ` · ${m.body_fat_pct}%` : ''}</span>
              <ActionButton size="sm" variant="ghost" className="!border-0 text-faint hover:text-bad" title="Eliminar medición" action={deleteMeasurement.bind(null, m.id)}
                confirm={{ title: 'Eliminar medición', message: `¿Borrar la medición del ${formatDate(m.measured_on)}?`, confirmLabel: 'Eliminar' }}><Trash2 className="size-3.5" /></ActionButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
