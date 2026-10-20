import 'server-only';
import { createServerSupabase } from './supabase/server';
import { UserError } from './auth';

/** Cuentas con acceso al panel del propietario (variable SUPERADMIN_EMAILS, separadas por comas). */
export const superAdminEmails = () => (process.env.SUPERADMIN_EMAILS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

export async function getSuperAdmin() {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser(); // validado contra el servidor de autenticación
  const email = data.user?.email?.toLowerCase();
  return email && superAdminEmails().includes(email) ? { email } : null;
}

export async function requireSuperAdmin() {
  const sa = await getSuperAdmin();
  if (!sa) throw new UserError('No autorizado.');
  return sa;
}
