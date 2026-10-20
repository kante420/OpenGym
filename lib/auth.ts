import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createServerSupabase } from './supabase/server';
import { gymPath, HOME_BY_ROLE } from './paths';
import type { Gym, Profile, Role } from './types';

export class UserError extends Error {}

/** Sesión + perfil + centro del usuario actual (una sola consulta por petición). */
export const getAuth = cache(async () => {
  const supabase = await createServerSupabase();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;

  // Perfil y centro en un solo viaje a la base de datos (antes eran dos, uno tras otro)
  let profile: Profile | null = null;
  let gym: Gym | null = null;
  const joined = await supabase.from('profiles').select('*, gyms(*)').eq('id', userId).maybeSingle();
  if (!joined.error && joined.data) {
    const { gyms, ...rest } = joined.data as Profile & { gyms: Gym | Gym[] | null };
    profile = rest as Profile;
    gym = (Array.isArray(gyms) ? gyms[0] : gyms) ?? null;
  } else {
    // Respaldo: si en tu base no existe la clave foránea profiles.gym_id → gyms
    const p = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle<Profile>();
    profile = p.data;
    if (profile) gym = (await supabase.from('gyms').select('*').eq('id', profile.gym_id).maybeSingle<Gym>()).data;
  }
  if (!profile || !profile.active || !gym) return null;
  if (gym.status && gym.status !== 'active') return null; // gimnasio suspendido por la plataforma

  const meta = (claims?.claims?.user_metadata ?? {}) as { must_change_password?: boolean };
  return { supabase, profile, gym, mustChangePassword: meta.must_change_password === true };
});

/** Para páginas: exige sesión, que el usuario pertenezca a ESTE centro y que tenga uno de los roles. */
export async function requirePage(subdomain: string, roles: Role[]) {
  const auth = await getAuth();
  if (!auth || auth.gym.subdomain !== subdomain) redirect(await gymPath(subdomain, '/login'));
  if (!roles.includes(auth.profile.role)) redirect(await gymPath(subdomain, HOME_BY_ROLE[auth.profile.role]));
  return auth;
}

/** Para Server Actions: igual, pero lanza un error legible en lugar de redirigir. */
export async function requireRole(roles: Role[]) {
  const auth = await getAuth();
  if (!auth) throw new UserError('Tu sesión ha caducado. Vuelve a iniciar sesión.');
  if (!roles.includes(auth.profile.role)) throw new UserError('No tienes permiso para realizar esta acción.');
  return auth;
}
