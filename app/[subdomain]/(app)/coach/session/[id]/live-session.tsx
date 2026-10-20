'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Minus, Plus } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { Avatar } from '@/components/ui/primitives';
import { finishSession } from '@/lib/actions/routines';
import type { RoutineBlock } from '@/lib/types';

interface Student { id: string; name: string }
type Mark = { w: string; r: string };
type History = Record<string, Record<string, { last: number; max: number }>>;
type Draft = { attendance: Record<string, boolean>; marks: Record<string, Mark>; step: 'attendance' | 'marks' };

function readDraft(key: string): Draft | null {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as Draft) : null; } catch { return null; }
}

export function LiveSession({ logId, title, groupName, blocks, exercises, students, initialAttendance, initialMarks, history, homeHref }: {
  logId: string; title: string; groupName: string; blocks: RoutineBlock[]; exercises: string[]; students: Student[];
  initialAttendance: Record<string, boolean>; initialMarks: Record<string, Mark>; history: History; homeHref: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const draftKey = `forza:session:${logId}`;
  // Este componente sólo se renderiza en el navegador (ver live-session-loader), así que
  // puede leer el borrador local al crear el estado sin provocar desajustes de hidratación.
  const [draft] = useState(() => readDraft(draftKey));
  const [step, setStep] = useState<'attendance' | 'marks'>(draft?.step ?? 'attendance');
  const [attendance, setAttendance] = useState<Record<string, boolean>>({ ...initialAttendance, ...draft?.attendance });
  const [marks, setMarks] = useState<Record<string, Mark>>({ ...initialMarks, ...draft?.marks });
  const [exIdx, setExIdx] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (draft) toast('Hemos recuperado el borrador de esta sesión.', 'info'); }, [draft, toast]);
  // Guardado continuo: si se cierra el navegador a mitad de sesión no se pierde lo apuntado
  useEffect(() => {
    try { localStorage.setItem(draftKey, JSON.stringify({ attendance, marks, step })); } catch { /* sin almacenamiento */ }
  }, [attendance, marks, step, draftKey]);

  const present = useMemo(() => students.filter((s) => attendance[s.id]), [students, attendance]);
  const exercise = exercises[exIdx];
  const prescription = useMemo(() => {
    const m = new Map<string, string>();
    blocks.forEach((b) => b.exercises.forEach((e) => m.set(e.name, `${e.sets} × ${e.reps}`)));
    return m;
  }, [blocks]);
  const key = (ex: string, uid: string) => `${ex}|${uid}`;
  const setMark = (ex: string, uid: string, patch: Partial<Mark>) => setMarks((m) => ({ ...m, [key(ex, uid)]: { ...(m[key(ex, uid)] ?? { w: '', r: '' }), ...patch } }));
  const step25 = (ex: string, uid: string, d: number) => {
    const cur = parseFloat((marks[key(ex, uid)]?.w ?? '').replace(',', '.')) || history[uid]?.[ex]?.last || 0;
    setMark(ex, uid, { w: String(Math.max(0, Math.round((cur + d) * 10) / 10)) });
  };
  const filledFor = (ex: string) => present.filter((s) => parseFloat((marks[key(ex, s.id)]?.w ?? '').replace(',', '.')) > 0).length;

  async function submit() {
    setSaving(true);
    const payload = {
      attendance: students.map((s) => ({ user_id: s.id, attended: !!attendance[s.id] })),
      marks: present.flatMap((s) => exercises.flatMap((ex) => {
        const m = marks[key(ex, s.id)];
        const w = parseFloat((m?.w ?? '').replace(',', '.'));
        const r = parseInt(m?.r ?? '', 10);
        return w > 0 ? [{ user_id: s.id, exercise_name: ex, weight_kg: w, reps: r > 0 ? r : null }] : [];
      })),
    };
    const res = await finishSession(logId, payload);
    setSaving(false);
    if (res.ok) {
      try { localStorage.removeItem(draftKey); } catch { /* nada */ }
      toast(res.message ?? 'Sesión cerrada.', 'ok');
      router.push(homeHref);
    } else { setConfirming(false); toast(res.error, 'bad'); }
  }

  if (students.length === 0) {
    return <div className="card card-pad text-center"><p className="display text-3xl">Este grupo no tiene socios inscritos</p><p className="mt-2 text-sm text-muted">Inscríbelos desde Actividades en el panel de administración.</p></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm text-muted">{groupName}</p><h1 className="display text-4xl">{title}</h1></div>
        <ol className="flex items-center gap-2 text-sm font-semibold" aria-label="Pasos">
          <li className={`chip ${step === 'attendance' ? 'chip-gold' : 'chip-ok'}`}>1 · Asistencia</li>
          <li className={`chip ${step === 'marks' ? 'chip-gold' : ''}`}>2 · Marcas</li>
        </ol>
      </div>

      {step === 'attendance' && (
        <>
          <p className="text-sm text-muted">Toca a quien <strong className="text-fg">no</strong> haya venido. Por defecto está todo el grupo.</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {students.map((s) => {
              const on = !!attendance[s.id];
              return (
                <li key={s.id}>
                  <button onClick={() => setAttendance((a) => ({ ...a, [s.id]: !on }))} aria-pressed={on}
                    className={`flex min-h-16 w-full items-center gap-4 rounded-md border px-4 py-3 text-left transition-colors ${on ? 'border-gold/60 bg-gold/10' : 'border-line bg-panel opacity-60'}`}>
                    <Avatar name={s.name} size={40} />
                    <span className="flex-1 text-lg font-semibold">{s.name}</span>
                    <span className={`chip ${on ? 'chip-ok' : 'chip-bad'}`}>{on ? 'Presente' : 'Ausente'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted">{present.length} de {students.length} presentes</p>
            <button className="btn btn-primary btn-lg" onClick={() => setStep('marks')} disabled={present.length === 0}>Continuar a marcas</button>
          </div>
        </>
      )}

      {step === 'marks' && (
        <>
          <div role="tablist" aria-label="Ejercicios" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {exercises.map((ex, i) => (
              <button key={ex} role="tab" aria-selected={i === exIdx} onClick={() => setExIdx(i)}
                className={`chip shrink-0 px-5 py-2 text-sm ${i === exIdx ? 'chip-gold' : ''}`}>
                {ex} <span className="num opacity-70">{filledFor(ex)}/{present.length}</span>
              </button>
            ))}
          </div>

          <div className="flex items-baseline justify-between">
            <h2 className="display text-3xl">{exercise}</h2>
            {prescription.get(exercise) && <p className="text-sm text-muted">Pauta: <strong className="num text-fg">{prescription.get(exercise)}</strong></p>}
          </div>

          <ul className="space-y-3">
            {present.map((s) => {
              const h = history[s.id]?.[exercise];
              const m = marks[key(exercise, s.id)] ?? { w: '', r: '' };
              return (
                <li key={s.id} className="card card-pad">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="flex items-center gap-3"><Avatar name={s.name} /><span className="font-semibold">{s.name}</span></span>
                    {h ? <button className="text-xs text-muted hover:text-gold-hi" onClick={() => setMark(exercise, s.id, { w: String(h.last) })}>Última {h.last} kg · récord {h.max} kg</button> : <span className="text-xs text-faint">Primera vez</span>}
                  </div>
                  <div className="flex items-stretch gap-2">
                    <button aria-label={`Restar 2,5 kg a ${s.name}`} className="btn btn-ghost !h-14 !w-14 !p-0" onClick={() => step25(exercise, s.id, -2.5)}><Minus className="size-5" /></button>
                    <label className="relative flex-1">
                      <span className="sr-only">Peso de {s.name} en {exercise}, kg</span>
                      <input inputMode="decimal" value={m.w} onChange={(e) => setMark(exercise, s.id, { w: e.target.value })} placeholder="0"
                        className="input display num !h-14 text-center !text-3xl" />
                      <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-faint">kg</span>
                    </label>
                    <button aria-label={`Sumar 2,5 kg a ${s.name}`} className="btn btn-ghost !h-14 !w-14 !p-0" onClick={() => step25(exercise, s.id, 2.5)}><Plus className="size-5" /></button>
                    <label className="w-24">
                      <span className="sr-only">Repeticiones de {s.name}</span>
                      <input inputMode="numeric" value={m.r} onChange={(e) => setMark(exercise, s.id, { r: e.target.value })} placeholder="reps" className="input num !h-14 text-center" />
                    </label>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="sticky bottom-20 z-20 flex items-center justify-between gap-3 rounded-md border border-line bg-panel/95 p-3 backdrop-blur lg:bottom-4">
            <button className="btn btn-ghost" onClick={() => setStep('attendance')}>Asistencia</button>
            <div className="flex gap-2">
              {exIdx < exercises.length - 1 && <button className="btn btn-ghost" onClick={() => setExIdx((i) => i + 1)}>Siguiente ejercicio</button>}
              <button className="btn btn-primary" onClick={() => setConfirming(true)}><Check className="size-4" />Cerrar sesión</button>
            </div>
          </div>
        </>
      )}

      <Modal open={confirming} onClose={() => !saving && setConfirming(false)} title="Cerrar la sesión"
        footer={<><button className="btn btn-ghost" disabled={saving} onClick={() => setConfirming(false)}>Seguir apuntando</button><button className="btn btn-primary" disabled={saving} onClick={submit}>{saving ? 'Guardando…' : 'Guardar y cerrar'}</button></>}>
        <p className="text-sm text-muted">Se guardarán la asistencia ({present.length} presentes de {students.length}) y las marcas de {exercises.length} ejercicio{exercises.length === 1 ? '' : 's'}. Podrás reabrirla y corregir después.</p>
      </Modal>
    </div>
  );
}
