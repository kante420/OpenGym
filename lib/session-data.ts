import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { exerciseNames, getBlocks } from './routine';
import type { RoutineBlock, StudentLog, WorkoutLog } from './types';

export interface SessionData {
  log: WorkoutLog;
  blocks: RoutineBlock[];
  exercises: string[];
  students: { id: string; name: string }[];
  initialAttendance: Record<string, boolean>;
  initialMarks: Record<string, { w: string; r: string }>;
  /** Último peso y récord de cada alumno en cada ejercicio (sin contar esta sesión). */
  history: Record<string, Record<string, { last: number; max: number }>>;
}

/** Todo lo que necesitan la sesión en vivo y el modo presentación de una rutina. */
export async function loadSessionData(supabase: SupabaseClient, gymId: string, id: string): Promise<SessionData | null> {
  const { data: raw } = await supabase.from('workout_logs').select('*, classes(title)').eq('id', id).eq('gym_id', gymId).maybeSingle();
  if (!raw) return null;
  const log = raw as WorkoutLog;

  const [bRes, aRes, mRes] = await Promise.all([
    supabase.from('bookings').select('user_id, profiles(id, full_name)').eq('class_id', log.class_id),
    supabase.from('attendance_logs').select('user_id, attended').eq('workout_log_id', id),
    supabase.from('student_logs').select('*').eq('workout_log_id', id),
  ]);
  const students = ((bRes.data ?? []) as unknown as { user_id: string; profiles: { id: string; full_name: string } | null }[])
    .filter((b) => b.profiles)
    .map((b) => ({ id: b.profiles!.id, name: b.profiles!.full_name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  const existing = (aRes.data ?? []) as { user_id: string; attended: boolean }[];
  const initialAttendance = Object.fromEntries(students.map((s) => [s.id, existing.length ? existing.find((a) => a.user_id === s.id)?.attended ?? true : true]));
  const blocks = getBlocks(log);
  const initialMarks = Object.fromEntries(((mRes.data ?? []) as StudentLog[]).map((m) => [`${m.exercise_name}|${m.user_id}`, { w: String(m.weight_kg), r: m.reps ? String(m.reps) : '' }]));

  const ids = students.map((s) => s.id);
  const { data: past } = ids.length
    ? await supabase.from('student_logs').select('user_id, exercise_name, weight_kg, created_at, workout_log_id').in('user_id', ids).neq('workout_log_id', id).order('created_at')
    : { data: [] };
  const history: SessionData['history'] = {};
  for (const p of (past ?? []) as Pick<StudentLog, 'user_id' | 'exercise_name' | 'weight_kg'>[]) {
    const e = (history[p.user_id] ??= {});
    const kg = Number(p.weight_kg);
    e[p.exercise_name] = { last: kg, max: Math.max(e[p.exercise_name]?.max ?? 0, kg) };
  }

  return { log, blocks, exercises: exerciseNames(blocks), students, initialAttendance, initialMarks, history };
}
