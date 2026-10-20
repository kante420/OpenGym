import { connection } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

/** Comprobación de vida: una consulta mínima. Un aviso diario (GitHub Actions) evita que Supabase pause el proyecto gratuito. */
export async function GET() {
  await connection();
  try {
    const { error } = await createAdminSupabase().from('gyms').select('id', { count: 'exact', head: true }).limit(1);
    return Response.json({ ok: !error }, { status: error ? 503 : 200 });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
