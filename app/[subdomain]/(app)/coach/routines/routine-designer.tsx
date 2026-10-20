'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Presentation, Trash2 } from 'lucide-react';
import { ActionForm, SubmitButton } from '@/components/ui/action';
import { Card, Field } from '@/components/ui/primitives';
import { publishRoutine } from '@/lib/actions/routines';
import type { RoutineBlock } from '@/lib/types';

const FIRST: RoutineBlock[] = [{ name: 'Calentamiento', exercises: [] }];

export function RoutineDesigner({ classes, catalog, defaultClass, defaultDate, base }: {
  classes: { id: string; title: string }[]; catalog: string[]; defaultClass: string; defaultDate: string; base: string;
}) {
  const router = useRouter();
  const presentAfter = useRef(false);
  const [blocks, setBlocks] = useState<RoutineBlock[]>(FIRST);
  const [draft, setDraft] = useState<Record<number, string>>({});

  const patch = (i: number, fn: (b: RoutineBlock) => RoutineBlock) => setBlocks((bs) => bs.map((b, k) => (k === i ? fn(b) : b)));
  const addExercise = (i: number) => {
    const name = (draft[i] ?? '').trim();
    if (!name) return;
    patch(i, (b) => ({ ...b, exercises: [...b.exercises, { name, sets: 3, reps: 10 }] }));
    setDraft((d) => ({ ...d, [i]: '' }));
  };

  return (
    <Card title="Nueva rutina">
      <ActionForm action={publishRoutine} className="space-y-6" onSuccess={(r) => {
        setBlocks(FIRST); setDraft({});
        if (presentAfter.current && r.data?.id) {
          presentAfter.current = false;
          document.documentElement.requestFullscreen().catch(() => {});
          router.push(`${base}/present/${r.data.id}`);
        }
      }}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Grupo"><select name="class_id" className="select" defaultValue={defaultClass} required><option value="" disabled>Elige grupo</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></Field>
          <Field label="Fecha"><input name="log_date" type="date" className="input" defaultValue={defaultDate} required /></Field>
          <Field label="Título"><input name="title" className="input" placeholder="Ej.: Tren inferior" required /></Field>
        </div>
        <input type="hidden" name="blocks" value={JSON.stringify(blocks)} />

        <div className="space-y-4">
          {blocks.map((b, i) => (
            <fieldset key={i} className="rounded-md border border-line bg-canvas/40 p-4">
              <legend className="sr-only">Bloque {i + 1}</legend>
              <div className="mb-3 flex gap-2">
                <input aria-label={`Nombre del bloque ${i + 1}`} className="input font-semibold" value={b.name} onChange={(e) => patch(i, (x) => ({ ...x, name: e.target.value }))} />
                {blocks.length > 1 && <button type="button" className="btn btn-danger btn-sm !h-10" aria-label={`Quitar bloque ${b.name}`} onClick={() => setBlocks((bs) => bs.filter((_, k) => k !== i))}><Trash2 className="size-4" /></button>}
              </div>
              {b.exercises.length > 0 && (
                <ul className="mb-3 space-y-2">
                  {b.exercises.map((e, k) => (
                    <li key={k} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2">
                      <span className="truncate text-sm">{e.name}</span>
                      <label className="flex items-center gap-1.5 text-xs text-muted">Series<input type="number" min={1} max={50} className="input !h-9 !w-16 text-center" value={e.sets} onChange={(ev) => patch(i, (x) => ({ ...x, exercises: x.exercises.map((y, j) => (j === k ? { ...y, sets: Math.max(1, Number(ev.target.value) || 1) } : y)) }))} /></label>
                      <label className="flex items-center gap-1.5 text-xs text-muted">Reps<input type="number" min={1} max={500} className="input !h-9 !w-16 text-center" value={e.reps} onChange={(ev) => patch(i, (x) => ({ ...x, exercises: x.exercises.map((y, j) => (j === k ? { ...y, reps: Math.max(1, Number(ev.target.value) || 1) } : y)) }))} /></label>
                      <button type="button" aria-label={`Quitar ${e.name}`} className="rounded p-2 text-faint hover:text-bad" onClick={() => patch(i, (x) => ({ ...x, exercises: x.exercises.filter((_, j) => j !== k) }))}><Trash2 className="size-4" /></button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <input list="catalog" className="input" placeholder="Añadir ejercicio (elige del catálogo o escribe)" aria-label={`Ejercicio para ${b.name}`} value={draft[i] ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, [i]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExercise(i); } }} />
                <button type="button" className="btn btn-ghost" onClick={() => addExercise(i)}><Plus className="size-4" />Añadir</button>
              </div>
            </fieldset>
          ))}
          <datalist id="catalog">{catalog.map((n) => <option key={n} value={n} />)}</datalist>
        </div>

        <div className="flex flex-wrap justify-between gap-3">
          <button type="button" className="btn btn-ghost" onClick={() => setBlocks((bs) => [...bs, { name: `Bloque ${bs.length + 1}`, exercises: [] }])}><Plus className="size-4" />Añadir bloque</button>
          <div className="flex flex-wrap gap-3">
            <SubmitButton variant="ghost" onClick={() => { presentAfter.current = true; }}><Presentation className="size-4" />Publicar y presentar</SubmitButton>
            <SubmitButton onClick={() => { presentAfter.current = false; }}>Publicar rutina</SubmitButton>
          </div>
        </div>
      </ActionForm>
    </Card>
  );
}
