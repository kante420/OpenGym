import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Cliente con service_role: se salta RLS. Úsalo SÓLO en Server Actions tras haber
 * verificado el rol del usuario y filtrando siempre por su gym_id.
 */
export function createAdminSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor.');
  return createClient((process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
