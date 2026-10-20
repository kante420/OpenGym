'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Check, Maximize, Minimize, PanelRightClose, PanelRightOpen, X } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { finishSession } from '@/lib/actions/routines';
import type { RoutineBlock } from '@/lib/types';

type Student = { id: string; name: string };
type History = Record<string, Record<string, { last: number; max: number }>>;
type Draft = { typed: Record<string, string>; absent: Record<string, boolean> };

const num = (s: string) => parseFloat(s.replace(',', '.'));
const fmt = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');
const key = (sid: string, ex: string) => `${sid}|${ex}`;
function readDraft(k: string): Draft | null {
  try { const raw = localStorage.getItem(k); return raw ? (JSON.parse(raw) as Draft) : null; } catch { return null; }
}

/** Agranda la letra hasta el máximo con el que TODO el contenido sigue cabiendo (sin scroll). */
function useFitFont(ref: RefObject<HTMLDivElement | null>, signature: string) {
  const fit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    let lo = 11, hi = 72;
    while (hi - lo > 0.5) {
      const mid = (lo + hi) / 2;
      el.style.fontSize = `${mid}px`;
      if (el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1) lo = mid; else hi = mid;
    }
    el.style.fontSize = `${lo}px`;
  }, [ref]);
  useLayoutEffect(() => { fit(); }, [fit, signature]);
  useEffect(() => {
    const host = ref.current?.parentElement;
    if (!host) return;
    const ro = new ResizeObserver(() => fit());
    ro.observe(host);
    return () => ro.disconnect();
  }, [fit, ref]);
}

export function Presenter({ logId, title, groupName, dateLabel, blocks, exercises, students, history, initialMarks, initialAttendance, homeHref }: {
  logId: string; title: string; groupName: string; dateLabel: string; blocks: RoutineBlock[]; exercises: string[]; students: Student[];
  history: History; initialMarks: Record<string, { w: string; r: string }>; initialAttendance: Record<string, boolean>; homeHref: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const draftKey = `forza:present:${logId}`;
  // El componente sólo se renderiza en el navegador, así que puede leer el borrador al crear el estado.
  const [draft] = useState(() => readDraft(draftKey));
  const [typed, setTyped] = useState<Record<string, string>>(() => ({
    ...Object.fromEntries(Object.entries(initialMarks).map(([k, v]) => [k, v.w])), ...draft?.typed,
  }));
  const [absent, setAbsent] = useState<Record<string, boolean>>(() => ({
    ...Object.fromEntries(students.map((s) => [s.id, initialAttendance[s.id] === false])), ...draft?.absent,
  }));
  const [activeId, setActiveId] = useState(students[0]?.id ?? '');
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth >= 768); // en móvil, la diapositiva ocupa toda la pantalla
  const [isFs, setIsFs] = useState(() => !!document.fullscreenElement);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const fitRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<HTMLUListElement>(null);

  const numOf = new Map(exercises.map((n, i) => [n, i + 1]));
  const hasStructure = blocks.some((b) => b.exercises.length > 0);
  useFitFont(fitRef, `${panelOpen}|${blocks.map((b) => b.name + b.exercises.map((e) => e.name + e.sets + e.reps).join()).join('|')}`);

  useEffect(() => { if (draft) toast('Hemos recuperado los pesos que tenías apuntados.', 'info'); }, [draft, toast]);
  // Borrador: sólo si hay algo distinto de lo ya guardado en la base de datos
  const dirty = (() => {
    const clean = (o: Record<string, string>) => JSON.stringify(Object.entries(o).filter(([, v]) => v.trim() !== '').sort(([a], [b]) => a.localeCompare(b)));
    const saved = Object.fromEntries(Object.entries(initialMarks).map(([k, v]) => [k, v.w]));
    return clean(typed) !== clean(saved) || students.some((s) => !!absent[s.id] !== (initialAttendance[s.id] === false));
  })();
  useEffect(() => {
    try { if (dirty) localStorage.setItem(draftKey, JSON.stringify({ typed, absent })); else localStorage.removeItem(draftKey); } catch { /* sin almacenamiento */ }
  }, [dirty, typed, absent, draftKey]);
  useEffect(() => {
    const on = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);

  const prevOf = (sid: string, ex: string) => history[sid]?.[ex]?.last;
  /** Qué ocurrirá con lo escrito: sube → se actualiza; igual → se mantiene; baja → se guarda lo escrito. */
  const statusOf = (sid: string, ex: string) => {
    const w = num(typed[key(sid, ex)] ?? '');
    if (!(w > 0)) return { kind: 'none' as const, delta: 0 };
    const p = prevOf(sid, ex);
    if (p === undefined) return { kind: 'first' as const, delta: 0 };
    if (w > p) return { kind: 'up' as const, delta: w - p };
    if (w < p) return { kind: 'down' as const, delta: w - p };
    return { kind: 'same' as const, delta: 0 };
  };
  const buildMarks = () => students.filter((s) => !absent[s.id]).flatMap((s) => exercises.flatMap((ex) => {
    const st = statusOf(s.id, ex);
    if (st.kind === 'none' || st.kind === 'same') return []; // sin cambios: se conserva el peso anterior
    const w = num(typed[key(s.id, ex)]);
    const init = initialMarks[key(s.id, ex)];
    const reps = init && num(init.w) === w && init.r ? Number(init.r) : null;
    return [{ user_id: s.id, exercise_name: ex, weight_kg: w, reps }];
  }));
  const countFor = (sid: string) => exercises.filter((ex) => { const k = statusOf(sid, ex).kind; return k !== 'none' && k !== 'same'; }).length;
  const total = buildMarks().length;

  const toggleFs = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
    catch { toast('Este navegador no permite la pantalla completa aquí.', 'info'); }
  };
  const leave = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); } catch { /* ya no está en pantalla completa */ }
    router.push(homeHref);
  };
  async function save() {
    setSaving(true);
    const res = await finishSession(logId, {
      attendance: students.map((s) => ({ user_id: s.id, attended: !absent[s.id] })),
      marks: buildMarks(),
    });
    setSaving(false);
    if (res.ok) {
      try { localStorage.removeItem(draftKey); } catch { /* nada */ }
      toast(res.message ?? 'Sesión guardada.', 'ok');
      await leave();
    } else { setConfirming(false); toast(res.error, 'bad'); }
  }

  const active = students.find((s) => s.id === activeId);

  return (
    <div className="fixed inset-0 z-50 flex bg-canvas text-fg max-md:flex-col">
      {/* ── Diapositiva ── */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col p-[min(3.2vmin,36px)]" aria-label="Rutina a presentar">
        <header className="mb-[min(2.4vmin,24px)] flex items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="text-[clamp(.8rem,1.9vmin,1.25rem)] font-semibold text-muted">{groupName}{groupName && ' · '}{dateLabel}</p>
            <h1 className="display truncate text-[clamp(2rem,7vmin,5.5rem)]">{title}</h1>
          </div>
          <div className="no-print flex shrink-0 gap-2 opacity-60 transition-opacity hover:opacity-100 focus-within:opacity-100">
            <button className="btn btn-ghost btn-sm" onClick={toggleFs} title={isFs ? 'Salir de pantalla completa' : 'Pantalla completa'}>{isFs ? <Minimize className="size-4" /> : <Maximize className="size-4" />}<span className="max-lg:hidden">{isFs ? 'Ventana' : 'Pantalla completa'}</span></button>
            <button className="btn btn-ghost btn-sm" onClick={() => setPanelOpen((o) => !o)} title="Mostrar u ocultar el panel de pesos">{panelOpen ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}<span className="max-lg:hidden">Pesos</span></button>
            <button className="btn btn-ghost btn-sm" onClick={leave} title="Volver (lo apuntado se conserva como borrador)"><X className="size-4" /><span className="max-lg:hidden">Salir</span></button>
          </div>
        </header>

        <div className="min-h-0 flex-1">
          {hasStructure ? (
            <div ref={fitRef} className="fit-cols">
              {blocks.filter((b) => b.exercises.length > 0).map((b, i) => (
                <div key={i} className="fit-block">
                  <h3>{b.name}</h3>
                  <ul>
                    {b.exercises.map((e, k) => (
                      <li key={k} className="fit-row">
                        <span className="fit-num">{numOf.get(e.name)}</span>
                        <span className="fit-name">{e.name}</span>
                        <span className="fit-pauta">{e.sets} × {e.reps}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : <p className="text-muted">Esta rutina no tiene ejercicios.</p>}
        </div>
      </section>

      {/* ── Panel de pesos ── */}
      {panelOpen && (
        <aside className="flex min-h-0 w-[clamp(290px,27vw,420px)] shrink-0 flex-col border-l border-line bg-panel max-md:max-h-[46%] max-md:w-full max-md:border-l-0 max-md:border-t" aria-label="Pesos de los alumnos">
          <div className="border-b border-line p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="display text-2xl">Pesos</h2>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
                <input type="checkbox" className="size-4 accent-[var(--color-gold)]" checked={!!absent[activeId]} onChange={(e) => setAbsent((a) => ({ ...a, [activeId]: e.target.checked }))} />
                No ha venido
              </label>
            </div>
            {students.length === 0 ? <p className="text-sm text-faint">No hay socios inscritos en este grupo.</p> : (
              <div role="tablist" aria-label="Alumnos" className="flex gap-1.5 overflow-x-auto pb-1">
                {students.map((s) => (
                  <button key={s.id} role="tab" aria-selected={s.id === activeId} onClick={() => setActiveId(s.id)} title={s.name}
                    className={`chip shrink-0 px-3.5 py-1.5 text-sm ${s.id === activeId ? 'chip-gold' : ''} ${absent[s.id] ? 'line-through opacity-50' : ''}`}>
                    {s.name.split(' ')[0]}{countFor(s.id) > 0 && <span className="num ml-1.5 opacity-80">{countFor(s.id)}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {active && (
              <>
                <p className="mb-3 text-xs leading-relaxed text-faint">
                  El número en gris es el último peso de <strong className="text-muted">{active.name.split(' ')[0]}</strong>. Escribe solo si ha subido; si no, déjalo vacío y se mantiene.
                </p>
                <ul ref={rowsRef} className={`space-y-2 ${absent[active.id] ? 'pointer-events-none opacity-40' : ''}`}>
                  {exercises.map((ex, i) => {
                    const p = prevOf(active.id, ex);
                    const st = statusOf(active.id, ex);
                    return (
                      <li key={ex} className="grid grid-cols-[1.6rem_1fr_6.2rem] items-center gap-2">
                        <span className="display text-right text-lg text-gold">{i + 1}</span>
                        <label htmlFor={`w-${i}`} className="min-w-0 truncate text-sm font-semibold" title={ex}>{ex}</label>
                        <div className="relative">
                          <input id={`w-${i}`} inputMode="decimal" autoComplete="off" value={typed[key(active.id, ex)] ?? ''}
                            placeholder={p !== undefined ? fmt(p) : ''}
                            onChange={(e) => setTyped((t) => ({ ...t, [key(active.id, ex)]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); rowsRef.current?.querySelectorAll('input')[i + 1]?.focus(); } }}
                            className="input num !h-10 pr-8 text-right text-base placeholder:text-fg/30" />
                          <span aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-faint">kg</span>
                        </div>
                        {st.kind !== 'none' && (
                          <p className="col-start-2 col-span-2 -mt-1 text-xs">
                            {st.kind === 'up' && <span className="inline-flex items-center gap-1 text-ok"><ArrowUp className="size-3" />+{fmt(st.delta)} kg · se actualiza</span>}
                            {st.kind === 'down' && <span className="inline-flex items-center gap-1 text-gold-hi"><ArrowDown className="size-3" />{fmt(st.delta)} kg · se guardará lo escrito</span>}
                            {st.kind === 'same' && <span className="text-faint">Igual que antes · se mantiene</span>}
                            {st.kind === 'first' && <span className="text-info">Primer registro</span>}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>

          <div className="border-t border-line p-3">
            <p className="mb-2 text-xs text-faint">{total === 0 ? 'Nada que actualizar todavía: se conservan los pesos anteriores.' : `${total} peso${total === 1 ? '' : 's'} nuevo${total === 1 ? '' : 's'} · el resto se mantiene`}</p>
            <button className="btn btn-primary w-full" onClick={() => setConfirming(true)}><Check className="size-4" />Terminar y guardar</button>
          </div>
        </aside>
      )}

      <Modal open={confirming} onClose={() => !saving && setConfirming(false)} title="Guardar la sesión"
        footer={<><button className="btn btn-ghost" disabled={saving} onClick={() => setConfirming(false)}>Seguir apuntando</button><button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? 'Guardando…' : 'Guardar y salir'}</button></>}>
        <p className="text-sm text-muted">Se actualizarán <strong className="text-fg">{total}</strong> peso{total === 1 ? '' : 's'}. Quien no tenga un peso nuevo conserva el anterior. Asistentes: {students.filter((s) => !absent[s.id]).length} de {students.length}.</p>
      </Modal>
    </div>
  );
}
