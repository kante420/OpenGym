'use client';
import { useState } from 'react';
import { Copy, X } from 'lucide-react';
import { ActionForm, SubmitButton } from '@/components/ui/action';
import { Modal } from '@/components/ui/modal';
import { Card, Field } from '@/components/ui/primitives';
import { createExercise, deleteExercise, duplicateRoutine } from '@/lib/actions/routines';
import { ActionButton } from '@/components/ui/action';

export function DuplicateButton({ id, title, defaultDate }: { id: string; title: string; defaultDate: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}><Copy className="size-3.5" />Duplicar</button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Duplicar «${title}»`}>
        <ActionForm action={duplicateRoutine.bind(null, id)} onSuccess={() => setOpen(false)} className="space-y-4">
          <Field label="Fecha de la copia"><input name="log_date" type="date" className="input" defaultValue={defaultDate} required /></Field>
          <div className="flex justify-end gap-3"><button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button><SubmitButton>Duplicar</SubmitButton></div>
        </ActionForm>
      </Modal>
    </>
  );
}

export function CatalogManager({ exercises }: { exercises: { id: string; name: string; own: boolean }[] }) {
  return (
    <Card title="Catálogo de ejercicios">
      <ActionForm action={createExercise} className="mb-4 flex gap-2">
        <input name="name" className="input" placeholder="Nuevo ejercicio" aria-label="Nombre del ejercicio" required />
        <SubmitButton variant="ghost">Añadir</SubmitButton>
      </ActionForm>
      {exercises.length === 0 ? <p className="text-sm text-faint">El catálogo está vacío. Añade los ejercicios que usas para elegirlos al diseñar rutinas.</p> : (
        <ul className="flex flex-wrap gap-2">
          {exercises.map((e) => (
            <li key={e.id} className="flex items-center gap-1 rounded-md bg-panel2 py-1 pl-3 text-sm" style={{ paddingRight: e.own ? 4 : 12 }}>
              {e.name}
              {e.own && <ActionButton size="sm" variant="ghost" className="!h-6 !border-0 !px-1.5 text-faint hover:text-bad" title={`Eliminar ${e.name}`} action={deleteExercise.bind(null, e.id)} confirm={{ title: `¿Eliminar «${e.name}»?`, message: 'Se quita del catálogo. Las rutinas ya publicadas no cambian.', confirmLabel: 'Eliminar' }}><X className="size-3.5" /></ActionButton>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
