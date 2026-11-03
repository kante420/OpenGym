import 'server-only';
import { createAdminSupabase } from './supabase/admin';

export interface GymLogoData { type: 'image/png' | 'image/jpeg'; buffer: Buffer; width: number; height: number }

export async function getGymLogo(gymId: string): Promise<GymLogoData | null> {
  const { data } = await createAdminSupabase().from('gym_logos').select('content_type, data_b64, width, height').eq('gym_id', gymId).maybeSingle();
  return data ? { type: data.content_type as GymLogoData['type'], buffer: Buffer.from(data.data_b64 as string, 'base64'), width: data.width as number, height: data.height as number } : null;
}

export async function getGymLogoBySlug(slug: string): Promise<GymLogoData | null> {
  const { data } = await createAdminSupabase().from('gyms').select('id').eq('subdomain', slug).maybeSingle();
  return data ? getGymLogo(data.id as string) : null;
}

/** Logo listo para jsPDF (acepta PNG y JPEG). */
export async function loadPdfLogo(gymId: string) {
  const l = await getGymLogo(gymId);
  return l ? { dataUrl: `data:${l.type};base64,${l.buffer.toString('base64')}`, format: l.type === 'image/png' ? ('PNG' as const) : ('JPEG' as const), width: l.width, height: l.height } : null;
}
export type PdfLogo = NonNullable<Awaited<ReturnType<typeof loadPdfLogo>>>;
