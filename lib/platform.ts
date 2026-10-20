import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { headers } from 'next/headers';
import { createAdminSupabase } from './supabase/admin';

export const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');
export const newToken = () => randomBytes(32).toString('base64url');

/** URL pública de la plataforma (para los enlaces de los emails). */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  return vercel ? `https://${vercel}` : 'http://localhost:3000';
}

/** Datos de la conexión. La IP sólo se guarda como hash (límite de intentos); la ubicación es aproximada (cabeceras de Vercel). */
export async function clientInfo() {
  const h = await headers();
  const ip = (h.get('x-forwarded-for') ?? h.get('x-real-ip') ?? '').split(',')[0].trim() || 'unknown';
  const salt = process.env.SIGNUP_SALT ?? 'opengym';
  let city: string | null = null;
  try { city = decodeURIComponent(h.get('x-vercel-ip-city') ?? '') || null; } catch { city = null; }
  return {
    ip,
    ipHash: createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32),
    country: h.get('x-vercel-ip-country'),
    region: h.get('x-vercel-ip-country-region'),
    city,
    userAgent: h.get('user-agent')?.slice(0, 200) ?? null,
  };
}

/** Cloudflare Turnstile (gratuito). Sin clave configurada sólo se admite fuera de producción. */
export async function verifyCaptcha(token: string | null, ip: string): Promise<{ ok: boolean; reason?: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    if (process.env.NODE_ENV !== 'production' || process.env.ALLOW_SIGNUP_WITHOUT_CAPTCHA === 'true') return { ok: true };
    return { ok: false, reason: 'El alta está desactivada temporalmente (falta configurar la protección anti-bots).' };
  }
  if (!token) return { ok: false, reason: 'Completa la verificación anti-bots.' };
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret, response: token, ...(ip !== 'unknown' ? { remoteip: ip } : {}) }),
    });
    const j = (await res.json()) as { success?: boolean };
    return j.success ? { ok: true } : { ok: false, reason: 'No hemos podido verificar que eres una persona. Inténtalo de nuevo.' };
  } catch {
    return { ok: false, reason: 'No se pudo comprobar la protección anti-bots. Inténtalo de nuevo.' };
  }
}

/** Solicitud de alta pendiente (para la pantalla de verificación). */
export async function previewSignup(token: string) {
  const admin = createAdminSupabase();
  const { data } = await admin.from('signup_requests').select('gym_name, slug, verified_at, expires_at').eq('token_hash', hashToken(token)).maybeSingle();
  if (!data) return { state: 'invalid' as const };
  if (data.verified_at) return { state: 'done' as const, slug: data.slug as string, name: data.gym_name as string };
  if (new Date(data.expires_at as string).getTime() < Date.now()) return { state: 'expired' as const };
  return { state: 'ok' as const, slug: data.slug as string, name: data.gym_name as string };
}

export async function previewReset(token: string) {
  const admin = createAdminSupabase();
  const { data } = await admin.from('password_resets').select('gym_id, used_at, expires_at').eq('token_hash', hashToken(token)).maybeSingle();
  if (!data || data.used_at || new Date(data.expires_at as string).getTime() < Date.now()) return null;
  return data as { gym_id: string };
}
