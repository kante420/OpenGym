'use server';
import { z } from 'zod';
import { requireRole, UserError } from '../auth';
import { WEEKDAYS } from '../format';
import type { ActionResult } from '../types';
import { num, optStr, run, str, unwrap } from './shared';

const ADMIN = ['ADMINISTRADOR'] as const;

// ── Zonas ────────────────────────────────────────────────────────────────────
export async function createZone(_p: ActionResult | null, fd: FormData) {
  return run(async () => {
    const { supabase, profile } = await requireRole([...ADMIN]);
    const name = str(fd, 'name');
    if (!name) throw new UserError('Escribe el nombre de la zona.');
    unwrap(await supabase.from('zones').insert({ gym_id: profile.gym_id, name }));
    return { message: `Zona «${name}» creada.` };
  });
}

export async function renameZone(id: string, _p: ActionResult | null, fd: FormData) {
  return run(async () => {
    const { supabase, profile } = await requireRole([...ADMIN]);
    const name = str(fd, 'name');
    if (!name) throw new UserError('El nombre no puede estar vacío.');
    unwrap(await supabase.from('zones').update({ name }).eq('id', id).eq('gym_id', profile.gym_id));
    return { message: 'Zona actualizada.' };
  });
}

export async function deleteZone(id: string) {
  return run(async () => {
    const { supabase, profile } = await requireRole([...ADMIN]);
    unwrap(await supabase.from('zones').delete().eq('id', id).eq('gym_id', profile.gym_id));
    return { message: 'Zona eliminada.' };
  });
}

// ── Actividades ──────────────────────────────────────────────────────────────
const classSchema = z.object({
  title: z.string().min(2, 'Escribe el nombre de la actividad.').max(80),
  price: z.number({ error: 'El precio no es válido.' }).min(0, 'El precio no puede ser negativo.').max(10000),
  days: z.array(z.enum(WEEKDAYS)).min(1, 'Elige al menos un día de la semana.'),
  start: z.string().regex(/^\d{2}:\d{2}$/, 'Indica la hora de inicio.'),
  end: z.string().regex(/^\d{2}:\d{2}$/, 'Indica la hora de fin.'),
  capacity: z.number().int().min(1, 'El aforo debe ser al menos 1.').max(500).nullable(),
  zone_id: z.guid().nullable(),
  trainer_id: z.guid().nullable(),
});

function parseClass(fd: FormData) {
  const cap = str(fd, 'capacity');
  const r = classSchema.safeParse({
    title: str(fd, 'title'),
    price: num(fd, 'price') || 0,
    days: fd.getAll('days').map(String),
    start: str(fd, 'start'),
    end: str(fd, 'end'),
    capacity: cap ? Number(cap) : null,
    zone_id: optStr(fd, 'zone_id'),
    trainer_id: optStr(fd, 'trainer_id'),
  });
  if (!r.success) throw new UserError(r.error.issues[0].message);
  const c = r.data;
  if (c.end <= c.start) throw new UserError('La hora de fin debe ser posterior a la de inicio.');
  const days = WEEKDAYS.filter((d) => c.days.includes(d));
  return {
    title: c.title,
    price: c.price,
    capacity: c.capacity,
    zone_id: c.zone_id,
    trainer_id: c.trainer_id,
    days_of_week: days.join(', '),
    schedule_time: `${c.start} - ${c.end}`,
  };
}

export async function createClass(_p: ActionResult | null, fd: FormData) {
  return run(async () => {
    const { supabase, profile } = await requireRole([...ADMIN]);
    const c = parseClass(fd);
    const now = new Date().toISOString(); // start_time/end_time son columnas heredadas obligatorias
    unwrap(await supabase.from('classes').insert({ gym_id: profile.gym_id, ...c, start_time: now, end_time: now }));
    return { message: `Actividad «${c.title}» creada.` };
  });
}

export async function updateClass(id: string, _p: ActionResult | null, fd: FormData) {
  return run(async () => {
    const { supabase, profile } = await requireRole([...ADMIN]);
    const c = parseClass(fd);
    if (c.capacity !== null) {
      const { count } = await supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('class_id', id);
      if ((count ?? 0) > c.capacity) throw new UserError(`Ya hay ${count} inscritos: el aforo no puede ser menor.`);
    }
    unwrap(await supabase.from('classes').update(c).eq('id', id).eq('gym_id', profile.gym_id));
    return { message: 'Actividad actualizada.' };
  });
}

export async function setClassActive(id: string, active: boolean) {
  return run(async () => {
    const { supabase, profile } = await requireRole([...ADMIN]);
    unwrap(await supabase.from('classes').update({ active }).eq('id', id).eq('gym_id', profile.gym_id));
    return { message: active ? 'Actividad reactivada.' : 'Actividad archivada. Deja de contar para las cuotas.' };
  });
}

export async function deleteClass(id: string) {
  return run(async () => {
    const { supabase, profile } = await requireRole([...ADMIN]);
    const { count } = await supabase.from('workout_logs').select('id', { count: 'exact', head: true }).eq('class_id', id);
    if (count) throw new UserError(`Tiene ${count} sesiones registradas. Archívala para conservar el histórico.`);
    unwrap(await supabase.from('classes').delete().eq('id', id).eq('gym_id', profile.gym_id));
    return { message: 'Actividad eliminada.' };
  });
}

// ── Inscripciones ────────────────────────────────────────────────────────────
export async function enrollMember(_p: ActionResult | null, fd: FormData) {
  return run(async () => {
    const { supabase } = await requireRole([...ADMIN]);
    const classId = str(fd, 'class_id');
    const userId = str(fd, 'user_id');
    if (!classId || !userId) throw new UserError('Elige una actividad y un socio.');
    unwrap(await supabase.rpc('enroll_member', { p_class_id: classId, p_user_id: userId }));
    return { message: 'Socio inscrito.' };
  });
}

export async function unenrollMember(classId: string, userId: string) {
  return run(async () => {
    const { supabase, profile } = await requireRole([...ADMIN]);
    unwrap(await supabase.from('bookings').delete().eq('class_id', classId).eq('user_id', userId).eq('gym_id', profile.gym_id));
    return { message: 'Socio dado de baja de la actividad.' };
  });
}

