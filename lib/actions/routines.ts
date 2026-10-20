'use server';
import { z } from 'zod';
import { requireRole, UserError } from '../auth';
import { blocksToDescription } from '../routine';
import type { ActionResult } from '../types';
import { run, str, unwrap } from './shared';

const STAFF = ['ADMINISTRADOR', 'ENTRENADOR'] as const;

export async function createExercise(_p: ActionResult | null, fd: FormData) {
  return run(async () => {
    const { supabase, profile } = await requireRole([...STAFF]);
    const name = str(fd, 'name');
    if (name.length < 2) throw new UserError('Escribe el nombre del ejercicio.');
    const { data: dup } = await supabase.from('exercises').select('id').ilike('name', name.replace(/[%_\\]/g, '\\$&')).or(`gym_id.eq.${profile.gym_id},gym_id.is.null`).limit(1);
    if (dup?.length) throw new UserError('Ese ejercicio ya está en el catálogo.');
    unwrap(await supabase.from('exercises').insert({ gym_id: profile.gym_id, name }));
    return { message: `«${name}» añadido al catálogo.` };
  });
}

export async function deleteExercise(id: string) {
  return run(async () => {
    const { supabase, profile } = await requireRole([...STAFF]);
    unwrap(await supabase.from('exercises').delete().eq('id', id).eq('gym_id', profile.gym_id));
    return { message: 'Ejercicio eliminado del catálogo.' };
  });
}

const routineSchema = z.object({
  class_id: z.guid('Elige un grupo.'),
  title: z.string().min(2, 'Ponle un título a la rutina.').max(100),
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Elige la fecha.'),
  blocks: z.array(z.object({
    name: z.string().min(1).max(80),
    exercises: z.array(z.object({ name: z.string().min(1), sets: z.number().int().min(1).max(50), reps: z.number().int().min(1).max(500) })),
  })).min(1).refine((b) => b.some((x) => x.exercises.length), 'Añade al menos un ejercicio.'),
});

export async function publishRoutine(_p: ActionResult<{ id: string }> | null, fd: FormData) {
  return run<{ id: string }>(async () => {
    const { supabase, profile } = await requireRole([...STAFF]);
    let blocks: unknown;
    try { blocks = JSON.parse(str(fd, 'blocks')); } catch { throw new UserError('La estructura de la rutina no es válida.'); }
    const r = routineSchema.safeParse({ class_id: str(fd, 'class_id'), title: str(fd, 'title'), log_date: str(fd, 'log_date'), blocks });
    if (!r.success) throw new UserError(r.error.issues[0].message);
    const { class_id, title, log_date, blocks: b } = r.data;
    const created = unwrap(await supabase.from('workout_logs').insert({
      gym_id: profile.gym_id, class_id, title, log_date, structure: b, description: blocksToDescription(b),
      is_completed: false, created_by: profile.id,
    }).select('id').single()) as { id: string };
    return { message: `Rutina «${title}» publicada.`, data: { id: created.id } };
  });
}

export async function deleteRoutine(id: string) {
  return run(async () => {
    const { supabase, profile } = await requireRole([...STAFF]);
    unwrap(await supabase.from('workout_logs').delete().eq('id', id).eq('gym_id', profile.gym_id));
    return { message: 'Rutina eliminada.' };
  });
}

export async function duplicateRoutine(id: string, _p: ActionResult | null, fd: FormData) {
  return run(async () => {
    const { supabase, profile } = await requireRole([...STAFF]);
    const date = str(fd, 'log_date');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new UserError('Elige la fecha de la copia.');
    const { data: src } = await supabase.from('workout_logs').select('*').eq('id', id).eq('gym_id', profile.gym_id).maybeSingle();
    if (!src) throw new UserError('Rutina no encontrada.');
    unwrap(await supabase.from('workout_logs').insert({
      gym_id: profile.gym_id, class_id: src.class_id, title: src.title, description: src.description,
      structure: src.structure, log_date: date, is_completed: false, created_by: profile.id,
    }));
    return { message: 'Rutina duplicada.' };
  });
}

// ── Sesión en vivo ───────────────────────────────────────────────────────────
const sessionSchema = z.object({
  attendance: z.array(z.object({ user_id: z.guid(), attended: z.boolean() })),
  marks: z.array(z.object({ user_id: z.guid(), exercise_name: z.string().min(1), weight_kg: z.number().min(0).max(1000), reps: z.number().int().min(1).max(500).nullable() })),
});

export async function finishSession(logId: string, payload: unknown): Promise<ActionResult> {
  return run(async () => {
    const { supabase } = await requireRole([...STAFF]);
    const r = sessionSchema.safeParse(payload);
    if (!r.success) throw new UserError('Los datos de la sesión no son válidos.');
    unwrap(await supabase.rpc('finish_session', { p_log_id: logId, p_attendance: r.data.attendance, p_marks: r.data.marks }));
    return { message: 'Sesión cerrada: asistencia y marcas guardadas.' };
  });
}

// ── Peso corporal ────────────────────────────────────────────────────────────
export async function addMeasurement(_p: ActionResult | null, fd: FormData) {
  return run(async () => {
    const { supabase, profile } = await requireRole(['CLIENTE', 'ENTRENADOR', 'ADMINISTRADOR']);
    const targetId = profile.role === 'CLIENTE' ? profile.id : str(fd, 'user_id') || profile.id;
    const weight = Number(str(fd, 'weight_kg').replace(',', '.'));
    const fat = str(fd, 'body_fat_pct');
    if (!(weight > 20 && weight < 400)) throw new UserError('Introduce un peso válido en kg.');
    const body_fat_pct = fat ? Number(fat.replace(',', '.')) : null;
    if (body_fat_pct !== null && !(body_fat_pct > 2 && body_fat_pct < 70)) throw new UserError('El % de grasa no es válido.');
    unwrap(await supabase.from('body_measurements').insert({
      gym_id: profile.gym_id, user_id: targetId, weight_kg: weight, body_fat_pct, note: str(fd, 'note') || null,
      ...(str(fd, 'measured_on') ? { measured_on: str(fd, 'measured_on') } : {}),
    }));
    return { message: 'Medición guardada.' };
  });
}

export async function deleteMeasurement(id: string) {
  return run(async () => {
    const { supabase } = await requireRole(['CLIENTE', 'ADMINISTRADOR']);
    unwrap(await supabase.from('body_measurements').delete().eq('id', id));
    return { message: 'Medición eliminada.' };
  });
}
