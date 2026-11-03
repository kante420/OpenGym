'use server';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '../supabase/server';
import { createAdminSupabase } from '../supabase/admin';
import { UserError } from '../auth';
import { requireSuperAdmin, superAdminEmails } from '../superadmin';
import type { ActionResult } from '../types';
import { z } from 'zod';
import { num, optStr, run, str, unwrap } from './shared';

export async function superAdminSignIn(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const email = str(fd, 'email').toLowerCase();
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password: String(fd.get('password') ?? '') });
  if (error || !superAdminEmails().includes(email)) {
    if (!error) await supabase.auth.signOut(); // credenciales válidas pero sin permiso de propietario
    return { ok: false, error: 'Email o contraseña incorrectos.' };
  }
  redirect('/superadmin');
}

export async function superAdminSignOut() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect('/superadmin');
}

export async function setGymStatus(gymId: string, status: 'active' | 'suspended') {
  return run(async () => {
    await requireSuperAdmin();
    unwrap(await createAdminSupabase().from('gyms').update({ status }).eq('id', gymId));
    return { message: status === 'suspended' ? 'Gimnasio suspendido: sus usuarios ya no pueden entrar.' : 'Gimnasio reactivado.' };
  }, '/superadmin');
}

export async function setGymLimit(gymId: string, _p: ActionResult | null, fd: FormData) {
  return run(async () => {
    await requireSuperAdmin();
    const n = Math.round(num(fd, 'max_members'));
    if (!(n >= 1 && n <= 100000)) throw new UserError('El límite debe estar entre 1 y 100000.');
    unwrap(await createAdminSupabase().from('gyms').update({ max_members: n }).eq('id', gymId));
    return { message: 'Límite actualizado.' };
  }, '/superadmin');
}

export async function purgeExpiredSignups() {
  return run(async () => {
    await requireSuperAdmin();
    const admin = createAdminSupabase();
    const { data: stale } = await admin.from('signup_requests').select('id, auth_user_id').is('verified_at', null).lt('expires_at', new Date().toISOString()).limit(200);
    for (const r of stale ?? []) {
      if (r.auth_user_id) await admin.auth.admin.deleteUser(r.auth_user_id as string);
      await admin.from('signup_requests').delete().eq('id', r.id);
    }
    return { message: `${stale?.length ?? 0} solicitudes caducadas eliminadas.` };
  }, '/superadmin');
}

// ── Editar y borrar gimnasios (sólo propietario) ─────────────────────────────

const editSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.').max(60),
  director_name: z.string().max(80).nullable(),
  contact_email: z.string().email('El email de contacto no es válido.').nullable(),
  address: z.string().max(120).nullable(),
  postal_code: z.string().max(10).nullable(),
  city: z.string().max(60).nullable(),
  province: z.string().max(60).nullable(),
  country: z.string().max(60).nullable(),
  phone: z.string().max(30).nullable(),
  website: z.string().max(120).nullable(),
  size_range: z.enum(['1-50', '51-150', '151-500', '500+']).nullable(),
});

export async function updateGymAsOwner(gymId: string, _p: ActionResult | null, fd: FormData) {
  return run(async () => {
    await requireSuperAdmin();
    const r = editSchema.safeParse({
      name: str(fd, 'name'), director_name: optStr(fd, 'director_name'), contact_email: optStr(fd, 'contact_email')?.toLowerCase() ?? null,
      address: optStr(fd, 'address'), postal_code: optStr(fd, 'postal_code'), city: optStr(fd, 'city'), province: optStr(fd, 'province'),
      country: optStr(fd, 'country'), phone: optStr(fd, 'phone'), website: optStr(fd, 'website'), size_range: optStr(fd, 'size_range'),
    });
    if (!r.success) throw new UserError(r.error.issues[0].message);
    unwrap(await createAdminSupabase().from('gyms').update(r.data).eq('id', gymId));
    return { message: 'Datos del gimnasio actualizados.' };
  }, '/superadmin');
}

/** Borra el gimnasio con TODOS sus datos y sus cuentas. Irreversible: exige escribir el código del gimnasio. */
export async function deleteGymAsOwner(gymId: string, _p: ActionResult | null, fd: FormData) {
  return run(async () => {
    await requireSuperAdmin();
    const admin = createAdminSupabase();
    const { data: gym } = await admin.from('gyms').select('subdomain, name').eq('id', gymId).maybeSingle();
    if (!gym) throw new UserError('El gimnasio ya no existe.');
    if (str(fd, 'confirm').toLowerCase() !== gym.subdomain) throw new UserError(`Escribe exactamente «${gym.subdomain}» para confirmar el borrado.`);
    const { data: ids, error } = await admin.rpc('platform_delete_gym', { p_gym_id: gymId });
    if (error) { console.error('[delete-gym]', error.message); throw new UserError('No se pudo borrar el gimnasio. Revisa la consola del servidor.'); }
    let failed = 0;
    for (const id of (ids ?? []) as string[]) {
      const { error: dErr } = await admin.auth.admin.deleteUser(id);
      if (dErr) { failed++; console.error('[delete-gym-auth]', id, dErr.message); }
    }
    return { message: `«${gym.name}» eliminado${failed ? ` (${failed} cuentas de acceso no se pudieron borrar; quedan huérfanas y se limpian solas al reutilizar el código)` : ' por completo'}.` };
  }, '/superadmin');
}
