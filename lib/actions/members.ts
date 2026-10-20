'use server';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { requireRole, UserError } from '../auth';
import { createAdminSupabase } from '../supabase/admin';
import { loginEmail, normalizeUsername } from '../format';
import type { ActionResult } from '../types';
import { optStr, run, str, unwrap } from './shared';

const tempPassword = () => randomBytes(8).toString('base64url');

const memberSchema = z.object({
  full_name: z.string().min(2, 'Escribe el nombre completo.').max(120),
  username: z.string().min(3, 'El usuario debe tener al menos 3 caracteres.').max(40),
  role: z.enum(['ENTRENADOR', 'CLIENTE']),
  email: z.string().email('El email no es válido.').nullable(),
  phone: z.string().max(30).nullable(),
  dni: z.string().max(20).nullable(),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de nacimiento no válida.').nullable(),
});

function parseMember(fd: FormData) {
  const r = memberSchema.safeParse({
    full_name: str(fd, 'full_name'),
    username: normalizeUsername(str(fd, 'username')),
    role: str(fd, 'role') || 'CLIENTE',
    email: optStr(fd, 'email'),
    phone: optStr(fd, 'phone'),
    dni: optStr(fd, 'dni'),
    birth_date: optStr(fd, 'birth_date'),
  });
  if (!r.success) throw new UserError(r.error.issues[0].message);
  return r.data;
}

export async function createMember(_p: ActionResult<{ username: string; password: string }> | null, fd: FormData) {
  return run<{ username: string; password: string }>(async () => {
    const { profile, gym } = await requireRole(['ADMINISTRADOR']);
    const m = parseMember(fd);
    const admin = createAdminSupabase();
    if (m.role === 'CLIENTE') {
      const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('gym_id', gym.id).eq('role', 'CLIENTE').eq('active', true);
      if ((count ?? 0) >= gym.max_members) throw new UserError(`Has alcanzado el límite de ${gym.max_members} socios activos de tu plan gratuito. Desactiva alguno o contacta con OpenGym para ampliarlo.`);
    }
    const password = tempPassword();

    const { data: created, error } = await admin.auth.admin.createUser({
      email: loginEmail(m.username, gym.subdomain),
      password,
      email_confirm: true,
      user_metadata: { full_name: m.full_name, must_change_password: true },
    });
    if (error || !created.user) {
      throw new UserError(error?.message?.includes('already') ? `El usuario «${m.username}» ya existe.` : 'No se pudo crear la cuenta.');
    }
    const { error: pErr } = await admin.from('profiles').insert({ id: created.user.id, gym_id: profile.gym_id, ...m });
    if (pErr) {
      await admin.auth.admin.deleteUser(created.user.id); // sin perfil la cuenta no sirve: se revierte
      throw new UserError(pErr.code === '23505' ? `El usuario «${m.username}» ya existe.` : 'No se pudo guardar el perfil.');
    }
    return { message: `${m.full_name} dado de alta.`, data: { username: m.username, password } };
  });
}

/** Comprueba que el objetivo es del mismo centro y no es un administrador. */
async function targetOf(id: string, gymId: string) {
  const admin = createAdminSupabase();
  const { data } = await admin.from('profiles').select('id, role, full_name').eq('id', id).eq('gym_id', gymId).maybeSingle();
  if (!data) throw new UserError('Socio no encontrado.');
  if (data.role === 'ADMINISTRADOR') throw new UserError('Las cuentas de administrador no se gestionan desde aquí.');
  return { admin, target: data as { id: string; role: string; full_name: string } };
}

export async function updateMember(id: string, _p: ActionResult | null, fd: FormData) {
  return run(async () => {
    const { profile } = await requireRole(['ADMINISTRADOR']);
    const { admin } = await targetOf(id, profile.gym_id);
    const { full_name, role, email, phone, dni, birth_date } = parseMember(fd);
    const fields = { full_name, role, email, phone, dni, birth_date };
    unwrap(await admin.from('profiles').update(fields).eq('id', id).eq('gym_id', profile.gym_id));
    return { message: 'Datos actualizados.' };
  });
}

export async function setMemberActive(id: string, active: boolean) {
  return run(async () => {
    const { profile } = await requireRole(['ADMINISTRADOR']);
    if (id === profile.id) throw new UserError('No puedes desactivar tu propia cuenta.');
    const { admin, target } = await targetOf(id, profile.gym_id);
    unwrap(await admin.from('profiles').update({ active }).eq('id', id).eq('gym_id', profile.gym_id));
    await admin.auth.admin.updateUserById(id, { ban_duration: active ? 'none' : '876000h' });
    return { message: active ? `${target.full_name} reactivado.` : `${target.full_name} desactivado. Ya no puede acceder.` };
  });
}

export async function resetMemberPassword(id: string): Promise<ActionResult<{ password: string }>> {
  return run<{ password: string }>(async () => {
    const { profile } = await requireRole(['ADMINISTRADOR']);
    const { admin } = await targetOf(id, profile.gym_id);
    const password = tempPassword();
    const { error } = await admin.auth.admin.updateUserById(id, { password, user_metadata: { must_change_password: true } });
    if (error) throw new UserError('No se pudo restablecer la contraseña.');
    return { message: 'Contraseña temporal generada.', data: { password } };
  });
}

export async function deleteMember(id: string) {
  return run(async () => {
    const { profile } = await requireRole(['ADMINISTRADOR']);
    if (id === profile.id) throw new UserError('No puedes eliminar tu propia cuenta.');
    const { admin, target } = await targetOf(id, profile.gym_id);
    const { count } = await admin.from('payment_receipts').select('id', { count: 'exact', head: true }).eq('user_id', id);
    if (count) throw new UserError('Tiene recibos emitidos y deben conservarse. Desactívalo en lugar de eliminarlo.');
    unwrap(await admin.from('profiles').delete().eq('id', id).eq('gym_id', profile.gym_id));
    await admin.auth.admin.deleteUser(id);
    return { message: `${target.full_name} eliminado.` };
  });
}
