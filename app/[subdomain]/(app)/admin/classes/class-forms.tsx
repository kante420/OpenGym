'use client';
import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { ActionButton, ActionForm, SubmitButton } from '@/components/ui/action';
import { Modal } from '@/components/ui/modal';
import { Card, Field } from '@/components/ui/primitives';
import { createClass, createZone, deleteZone, enrollMember, renameZone, updateClass } from '@/lib/actions/classes';
import { parseDays, WEEKDAYS } from '@/lib/format';
import type { ClassRow, Profile, Zone } from '@/lib/types';

interface Opts { zones: Zone[]; trainers: Pick<Profile, 'id' | 'full_name'>[] }

function ClassFields({ zones, trainers, cls }: Opts & { cls?: ClassRow }) {
  const [start = '', end = ''] = (cls?.schedule_time ?? '').split('-').map((s) => s.trim());
  const days = parseDays(cls?.days_of_week);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nombre de la actividad" className="sm:col-span-2"><input name="title" className="input" defaultValue={cls?.title} required /></Field>
      <fieldset className="sm:col-span-2">
        <legend className="label">Días</legend>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((d) => (
            <label key={d} className="cursor-pointer">
              <input type="checkbox" name="days" value={d} defaultChecked={days.includes(d)} className="sr-only" />
              <span className="chip-toggle">{d.slice(0, 3)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Hora de inicio"><input name="start" type="time" className="input" defaultValue={start} required /></Field>
      <Field label="Hora de fin"><input name="end" type="time" className="input" defaultValue={end} required /></Field>
      <Field label="Precio mensual (€)" hint="IVA incluido o no según Ajustes."><input name="price" type="number" step="0.01" min="0" className="input" defaultValue={cls?.price ?? 0} required /></Field>
      <Field label="Aforo máximo" hint="Vacío = sin límite."><input name="capacity" type="number" min="1" className="input" defaultValue={cls?.capacity ?? ''} /></Field>
      <Field label="Zona"><select name="zone_id" className="select" defaultValue={cls?.zone_id ?? ''}><option value="">Sin zona</option>{zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}</select></Field>
      <Field label="Entrenador"><select name="trainer_id" className="select" defaultValue={cls?.trainer_id ?? ''}><option value="">Sin asignar</option>{trainers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}</select></Field>
    </div>
  );
}

export function ClassModal({ zones, trainers, cls }: Opts & { cls?: ClassRow }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {cls
        ? <button className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}><Pencil className="size-3.5" />Editar</button>
        : <button className="btn btn-primary" onClick={() => setOpen(true)}><Plus className="size-4" />Nueva actividad</button>}
      <Modal open={open} onClose={() => setOpen(false)} title={cls ? 'Editar actividad' : 'Nueva actividad'}>
        <ActionForm action={cls ? updateClass.bind(null, cls.id) : createClass} resetOnSuccess={!cls} onSuccess={() => setOpen(false)} className="space-y-5">
          <ClassFields zones={zones} trainers={trainers} cls={cls} />
          <div className="flex justify-end gap-3"><button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button><SubmitButton>{cls ? 'Guardar cambios' : 'Crear actividad'}</SubmitButton></div>
        </ActionForm>
      </Modal>
    </>
  );
}

export function EnrollCard({ classes, members }: { classes: Pick<ClassRow, 'id' | 'title'>[]; members: Pick<Profile, 'id' | 'full_name'>[] }) {
  return (
    <Card title="Inscribir a un socio">
      <ActionForm action={enrollMember} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Actividad"><select name="class_id" className="select" required defaultValue=""><option value="" disabled>Elige actividad</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></Field>
        <Field label="Socio"><select name="user_id" className="select" required defaultValue=""><option value="" disabled>Elige socio</option>{members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select></Field>
        <SubmitButton>Inscribir</SubmitButton>
      </ActionForm>
    </Card>
  );
}

export function ZoneManager({ zones }: { zones: Zone[] }) {
  return (
    <Card title="Zonas del centro">
      <ul className="mb-4 space-y-2">
        {zones.length === 0 && <li className="text-sm text-faint">Aún no hay zonas (sala de musculación, estudio, pista…).</li>}
        {zones.map((z) => (
          <li key={z.id} className="flex items-center gap-2">
            <ActionForm action={renameZone.bind(null, z.id)} resetOnSuccess={false} className="flex flex-1 gap-2">
              <input name="name" defaultValue={z.name} className="input" aria-label={`Nombre de la zona ${z.name}`} />
              <SubmitButton variant="ghost" size="sm">Guardar</SubmitButton>
            </ActionForm>
            <ActionButton variant="danger" action={() => deleteZone(z.id)} confirm={{ title: `¿Eliminar «${z.name}»?`, message: 'Las actividades de esta zona quedarán sin zona.', confirmLabel: 'Eliminar' }}>Eliminar</ActionButton>
          </li>
        ))}
      </ul>
      <ActionForm action={createZone} className="flex gap-2 border-t border-line pt-4">
        <input name="name" className="input" placeholder="Nueva zona" aria-label="Nombre de la nueva zona" required />
        <SubmitButton variant="ghost">Añadir</SubmitButton>
      </ActionForm>
    </Card>
  );
}
