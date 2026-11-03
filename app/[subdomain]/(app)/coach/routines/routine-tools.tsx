'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, RefreshCw, X } from 'lucide-react';
import { ActionForm, SubmitButton } from '@/components/ui/action';
import { Modal } from '@/components/ui/modal';
import { Card, Field } from '@/components/ui/primitives';
import { createExercise, deleteExercise, duplicateRoutine } from '@/lib/actions/routines';
import { ActionButton } from '@/components/ui/action';

export function DuplicateButton({ id, title, defaultDate, classes, defaultClassId, base, isReuse }: {
  id: string;
  title: string;
  defaultDate?: string;
  classes?: { id: string; title: string }[];
  defaultClassId?: string;
  base?: string;
  isReuse?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [editAfter, setEditAfter] = useState(false);

  return (
    <>
      <button
        type="button"
        className={isReuse ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
        onClick={() => setOpen(true)}
      >
        {isReuse ? <RefreshCw className="size-3.5" /> : <Copy className="size-3.5" />}
        {isReuse ? 'Reutilizar' : 'Duplicar'}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={isReuse ? `Reutilizar «${title}»` : `Duplicar «${title}»`}>
        <ActionForm
          action={duplicateRoutine.bind(null, id)}
          onSuccess={(res) => {
            setOpen(false);
            if (editAfter && res.data?.id && base) {
              router.push(`${base}/coach/routines?edit=${res.data.id}&tab=designer`);
            }
          }}
          className="space-y-4"
        >
          {classes && classes.length > 0 && (
            <Field label="Asignar a la clase / grupo">
              <select name="class_id" className="select" defaultValue={defaultClassId ?? ''} required>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Fecha programada">
            <input name="log_date" type="date" className="input" defaultValue={defaultDate ?? ''} required />
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <div className="flex gap-2">
              {base && (
                <SubmitButton
                  variant="ghost"
                  onClick={() => setEditAfter(true)}
                >
                  Asignar y editar
                </SubmitButton>
              )}
              <SubmitButton onClick={() => setEditAfter(false)}>
                {isReuse ? 'Asignar rutina' : 'Duplicar'}
              </SubmitButton>
            </div>
          </div>
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
