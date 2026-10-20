'use server';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '../supabase/server';
import { createAdminSupabase } from '../supabase/admin';
import { UserError } from '../auth';
import { requireSuperAdmin, superAdminEmails } from '../superadmin';
import type { ActionResult } from '../types';
import { num, run, str, unwrap } from './shared';

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
