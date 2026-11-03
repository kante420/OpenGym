import 'server-only';
import nodemailer from 'nodemailer';
import { createAdminSupabase } from './supabase/admin';
import { decryptSecret, encryptSecret } from './crypto';

export { MAIL_PRESETS } from './mail-presets';
export type { MailPreset } from './mail-presets';
import { MAIL_PRESETS, type MailPreset } from './mail-presets';

export interface SmtpConfig { host: string; port: number; user: string; pass: string; fromName?: string }

/** Comprueba usuario y contraseña contra el servidor SMTP sin enviar nada. */
export async function verifySmtp(cfg: SmtpConfig) {
  await nodemailer.createTransport({
    host: cfg.host, port: cfg.port, secure: cfg.port === 465, auth: { user: cfg.user, pass: cfg.pass },
    connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000,
  }).verify();
}

export async function loadGymSmtp(gymId: string): Promise<SmtpConfig | null> {
  const { data } = await createAdminSupabase().from('gym_mail_settings').select('host, port, username, password_enc, from_name').eq('gym_id', gymId).maybeSingle();
  if (!data) return null;
  try {
    return { host: data.host as string, port: data.port as number, user: data.username as string, pass: decryptSecret(data.password_enc as string), fromName: (data.from_name as string) || undefined };
  } catch (e) {
    console.error('[gym-mail] no se pudo descifrar la contraseña guardada', e);
    return null;
  }
}

/** Estado para mostrar en Ajustes. Nunca devuelve la contraseña. */
export async function getGymMailStatus(gymId: string) {
  const { data } = await createAdminSupabase().from('gym_mail_settings').select('provider, username, from_name, verified_at').eq('gym_id', gymId).maybeSingle();
  return data ? { provider: data.provider as MailPreset, username: data.username as string, fromName: (data.from_name as string | null) ?? '', verifiedAt: data.verified_at as string | null } : null;
}

export async function saveGymMail(gymId: string, v: { provider: MailPreset; username: string; password: string; fromName: string }) {
  const p = MAIL_PRESETS[v.provider];
  const { error } = await createAdminSupabase().from('gym_mail_settings').upsert({
    gym_id: gymId, provider: v.provider, host: p.host, port: p.port, username: v.username,
    password_enc: encryptSecret(v.password), from_name: v.fromName || null, verified_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }, { onConflict: 'gym_id' });
  if (error) throw new Error(error.message);
}

export async function removeGymMail(gymId: string) {
  await createAdminSupabase().from('gym_mail_settings').delete().eq('gym_id', gymId);
}
