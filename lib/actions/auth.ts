'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { createAdminSupabase } from '../supabase/admin';
import { createServerSupabase } from '../supabase/server';
import { gymPath, HOME_BY_ROLE } from '../paths';
import { getAuth } from '../auth';
import { escapeHtml, loginEmail, normalizeUsername } from '../format';
import type { ActionResult, Role } from '../types';
import { run, str } from './shared';
import { clientInfo, hashToken, newToken, siteUrl } from '../platform';
import { emailLayout, explainEmailError, sendEmail } from '../email';
import { UserError } from '../auth';

export async function signIn(subdomain: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const ident = str(fd, 'username');
  const password = String(fd.get('password') ?? '');
  if (!ident || !password) return { ok: false, error: 'Introduce tu usuario o email y la contraseña.' };

  const supabase = await createServerSupabase();
  const { data: gyms } = await supabase.rpc('get_gym_public', { p_subdomain: subdomain });
  const gym = Array.isArray(gyms) ? gyms[0] : null;
  if (!gym) return { ok: false, error: 'Este centro no existe.' };
  if (gym.status === 'suspended') return { ok: false, error: 'Este gimnasio está desactivado temporalmente. Contacta con OpenGym.' };

  // Se admite el usuario o el email de la cuenta (el administrador se registra con su email)
  let username: string;
  if (ident.includes('@')) {
    const { data: rows } = await createAdminSupabase().from('profiles').select('username').eq('gym_id', gym.id).ilike('email', ident.replace(/[%_\\]/g, '\\$&')).limit(2);
    if (!rows || rows.length !== 1) return { ok: false, error: 'Usuario o contraseña incorrectos.' };
    username = rows[0].username as string;
  } else username = normalizeUsername(ident);

  const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail(username, subdomain), password });
  // Mensaje único para usuario inexistente o clave errónea: no revela qué cuentas existen
  if (error || !data.user) return { ok: false, error: 'Usuario o contraseña incorrectos.' };

  const { data: profile } = await supabase.from('profiles').select('gym_id, role, active').eq('id', data.user.id).maybeSingle();
  if (!profile || profile.gym_id !== gym.id || !profile.active) {
    await supabase.auth.signOut();
    return { ok: false, error: 'Tu cuenta no tiene acceso a este centro o está desactivada.' };
  }
  try { await createAdminSupabase().from('gyms').update({ last_login_at: new Date().toISOString() }).eq('id', gym.id); } catch { /* informativo */ }
  redirect(await gymPath(subdomain, HOME_BY_ROLE[profile.role as Role]));
}

export async function signOut(subdomain: string) {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect(await gymPath(subdomain, '/login'));
}

export async function changePassword(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const auth = await getAuth();
    if (!auth) throw new UserError('Tu sesión ha caducado.');
    const current = String(fd.get('current') ?? '');
    const next = String(fd.get('next') ?? '');
    if (next.length < 8) throw new UserError('La nueva contraseña debe tener al menos 8 caracteres.');
    if (next !== String(fd.get('confirm') ?? '')) throw new UserError('Las contraseñas nuevas no coinciden.');
    if (next === current) throw new UserError('La nueva contraseña debe ser distinta de la actual.');

    // Verificar la contraseña actual con un cliente aislado (no toca la sesión en cookies)
    const probe = createClient((process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim(), (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim(), { auth: { persistSession: false } });
    const { data: u } = await auth.supabase.auth.getUser();
    const { error: probeErr } = await probe.auth.signInWithPassword({ email: u.user?.email ?? '', password: current });
    if (probeErr) throw new UserError('La contraseña actual no es correcta.');

    const { error } = await auth.supabase.auth.updateUser({ password: next, data: { must_change_password: false } });
    if (error) throw new UserError(error.message.includes('weak') ? 'La contraseña es demasiado débil.' : 'No se pudo cambiar la contraseña.');
    await auth.supabase.auth.refreshSession(); // el JWT nuevo ya no lleva must_change_password
    return { message: 'Contraseña actualizada.' };
  }, false);
}


// ── Recuperar contraseña (por email) ─────────────────────────────────────────
export async function requestPasswordReset(subdomain: string, _p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const email = str(fd, 'email').toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new UserError('Escribe un email válido.');
    const admin = createAdminSupabase();
    const info = await clientInfo();
    const since = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

    const { count: ipCount } = await admin.from('password_resets').select('id', { count: 'exact', head: true }).eq('ip_hash', info.ipHash).gte('created_at', since(1));
    if ((ipCount ?? 0) >= 5) throw new UserError('Demasiados intentos. Inténtalo de nuevo en una hora.');

    const generic = { message: 'Si existe una cuenta con ese email, te hemos enviado un enlace para crear una contraseña nueva.' };
    const { data: gym } = await admin.from('gyms').select('id, name, status').eq('subdomain', subdomain).maybeSingle();
    if (!gym || gym.status !== 'active') return generic;
    const { data: rows } = await admin.from('profiles').select('id, full_name').eq('gym_id', gym.id).eq('active', true).ilike('email', email.replace(/[%_\\]/g, '\\$&')).limit(2);
    if (!rows || rows.length !== 1) return generic; // misma respuesta exista o no la cuenta
    const user = rows[0] as { id: string; full_name: string };

    const { count: userCount } = await admin.from('password_resets').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', since(1));
    if ((userCount ?? 0) >= 3) return generic;

    const token = newToken();
    await admin.from('password_resets').insert({ user_id: user.id, gym_id: gym.id, token_hash: hashToken(token), ip_hash: info.ipHash, expires_at: new Date(Date.now() + 3_600_000).toISOString() });
    const url = `${siteUrl()}/${subdomain}/restablecer?token=${token}`;
    try {
      await sendEmail({ to: email, fromName: gym.name as string, subject: `Restablece tu contraseña · ${gym.name}`,
        html: emailLayout('Restablece tu contraseña', `<p>Hola, ${escapeHtml(user.full_name)}. Alguien ha pedido crear una contraseña nueva para tu cuenta en <strong>${escapeHtml(gym.name as string)}</strong>.</p><p>El enlace caduca en 1 hora. Si no has sido tú, ignora este mensaje: tu contraseña no cambiará.</p>`, { label: 'Crear contraseña nueva', url }) });
    } catch (e) { console.error('[reset-email]', explainEmailError(e)); }
    return generic;
  }, false);
}

export async function resetPassword(subdomain: string, token: string, _p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const next = String(fd.get('next') ?? '');
    if (next.length < 10) throw new UserError('La contraseña debe tener al menos 10 caracteres.');
    if (next !== String(fd.get('confirm') ?? '')) throw new UserError('Las contraseñas no coinciden.');
    const admin = createAdminSupabase();
    const { data: row } = await admin.from('password_resets').select('id, user_id, gym_id, used_at, expires_at').eq('token_hash', hashToken(token)).maybeSingle();
    if (!row || row.used_at || new Date(row.expires_at as string).getTime() < Date.now()) throw new UserError('El enlace no es válido o ha caducado. Pide uno nuevo.');
    const { data: gym } = await admin.from('gyms').select('id').eq('subdomain', subdomain).maybeSingle();
    if (!gym || gym.id !== row.gym_id) throw new UserError('El enlace no es válido.');
    const { error } = await admin.auth.admin.updateUserById(row.user_id as string, { password: next, user_metadata: { must_change_password: false } });
    if (error) throw new UserError('No se pudo cambiar la contraseña.');
    await admin.from('password_resets').update({ used_at: new Date().toISOString() }).eq('user_id', row.user_id).is('used_at', null);
    return { message: 'Contraseña actualizada. Ya puedes entrar.' };
  }, false);
}
