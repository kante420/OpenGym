'use server';
import { z } from 'zod';
import { requireRole, UserError } from '../auth';
import type { ActionResult } from '../types';
import { num, optStr, run, str, unwrap } from './shared';

const schema = z.object({
  name: z.string().min(2, 'Escribe el nombre comercial.').max(80),
  legal_name: z.string().max(120).nullable(),
  tax_id: z.string().max(20).nullable(),
  address: z.string().max(200).nullable(),
  phone: z.string().max(30).nullable(),
  contact_email: z.string().email('El email de contacto no es válido.').nullable(),
  vat_rate: z.number().min(0, 'El IVA no puede ser negativo.').max(30, 'El IVA no es válido.'),
  prices_include_vat: z.boolean(),
  receipt_prefix: z.string().regex(/^[A-Z0-9]{1,6}$/, 'El prefijo admite 1–6 letras o números en mayúsculas.'),
});

import { getTheme, type ColorThemeId } from '../theme';

export async function updateGymTheme(_p: ActionResult | null, fd: FormData) {
  return run(async () => {
    const { supabase, gym } = await requireRole(['ADMINISTRADOR']);
    const themeId = str(fd, 'color_theme') as ColorThemeId;
    const theme = getTheme(themeId);
    unwrap(await supabase.from('gyms').update({ color_theme: theme.id }).eq('id', gym.id));
    return { message: `Tema cambiado a «${theme.name}».` };
  });
}

export async function updateGymSettings(_p: ActionResult | null, fd: FormData) {
  return run(async () => {
    const { supabase, gym } = await requireRole(['ADMINISTRADOR']);
    const r = schema.safeParse({
      name: str(fd, 'name'),
      legal_name: optStr(fd, 'legal_name'),
      tax_id: optStr(fd, 'tax_id'),
      address: optStr(fd, 'address'),
      phone: optStr(fd, 'phone'),
      contact_email: optStr(fd, 'contact_email'),
      vat_rate: num(fd, 'vat_rate'),
      prices_include_vat: str(fd, 'prices_include_vat') === 'true',
      receipt_prefix: str(fd, 'receipt_prefix').toUpperCase(),
    });
    if (!r.success) throw new UserError(r.error.issues[0].message);
    unwrap(await supabase.from('gyms').update(r.data).eq('id', gym.id));
    return { message: 'Ajustes guardados. Los próximos recibos usarán estos datos.' };
  });
}

// ── Correo de envío de recibos (cuenta propia del gimnasio) ──────────────────
import { createAdminSupabase } from '../supabase/admin';
import { explainEmailError, sendEmail } from '../email';
import { loadGymSmtp, MAIL_PRESETS, removeGymMail, saveGymMail, verifySmtp, type MailPreset } from '../gym-mail';
import { processLogo } from '../logo';
import { escapeHtml } from '../format';

const mailSchema = z.object({
  provider: z.enum(['gmail', 'outlook', 'yahoo', 'icloud']),
  username: z.string().toLowerCase().email('Escribe la dirección de correo completa.'),
  password: z.string().min(8, 'Pega la contraseña de aplicación (no la contraseña normal de tu correo).').max(100),
  from_name: z.string().max(60),
});

export async function saveMailSettings(_p: ActionResult | null, fd: FormData) {
  return run(async () => {
    const { gym } = await requireRole(['ADMINISTRADOR']);
    const r = mailSchema.safeParse({ provider: str(fd, 'provider'), username: str(fd, 'username'), password: String(fd.get('password') ?? '').replace(/\s+/g, ''), from_name: str(fd, 'from_name') });
    if (!r.success) throw new UserError(r.error.issues[0].message);
    const p = MAIL_PRESETS[r.data.provider as MailPreset];
    try { await verifySmtp({ host: p.host, port: p.port, user: r.data.username, pass: r.data.password }); }
    catch (e) { throw new UserError(explainEmailError(e)); }
    try { await saveGymMail(gym.id, { provider: r.data.provider, username: r.data.username, password: r.data.password, fromName: r.data.from_name || gym.name }); }
    catch (e) { if (e instanceof UserError) throw e; console.error('[mail-save]', e); throw new UserError('No se pudo guardar la configuración de correo.'); }
    return { message: `Correo ${r.data.username} conectado y verificado. Los recibos saldrán desde esa cuenta.` };
  });
}

export async function sendTestMail() {
  return run(async () => {
    const { gym, profile } = await requireRole(['ADMINISTRADOR']);
    const smtp = await loadGymSmtp(gym.id);
    if (!smtp) throw new UserError('Primero conecta el correo del gimnasio.');
    const to = profile.email || gym.contact_email;
    if (!to) throw new UserError('Tu perfil no tiene email al que enviar la prueba.');
    try {
      await sendEmail({ to, subject: `Prueba de correo · ${gym.name}`, html: `<p>Este es un mensaje de prueba de <strong>${escapeHtml(gym.name)}</strong>. Si lo ves, tus recibos se enviarán desde esta cuenta.</p>`, fromName: gym.name }, smtp);
    } catch (e) { throw new UserError(explainEmailError(e)); }
    return { message: `Correo de prueba enviado a ${to}.` };
  }, false);
}

export async function removeMailSettings() {
  return run(async () => {
    const { gym } = await requireRole(['ADMINISTRADOR']);
    await removeGymMail(gym.id);
    return { message: 'Correo desconectado.' };
  });
}

// ── Logo ─────────────────────────────────────────────────────────────────────
export async function saveGymLogo(_p: ActionResult | null, fd: FormData) {
  return run(async () => {
    const { gym } = await requireRole(['ADMINISTRADOR']);
    const file = fd.get('logo');
    if (!(file instanceof File) || file.size === 0) throw new UserError('Elige una imagen.');
    const l = await processLogo(file);
    const admin = createAdminSupabase();
    unwrap(await admin.from('gym_logos').upsert({ gym_id: gym.id, content_type: l.type, data_b64: l.b64, width: l.width, height: l.height, updated_at: new Date().toISOString() }, { onConflict: 'gym_id' }));
    unwrap(await admin.from('gyms').update({ logo_updated_at: new Date().toISOString() }).eq('id', gym.id));
    return { message: 'Logo actualizado.' };
  });
}

export async function removeGymLogo() {
  return run(async () => {
    const { gym } = await requireRole(['ADMINISTRADOR']);
    const admin = createAdminSupabase();
    await admin.from('gym_logos').delete().eq('gym_id', gym.id);
    unwrap(await admin.from('gyms').update({ logo_updated_at: null }).eq('id', gym.id));
    return { message: 'Logo eliminado.' };
  });
}
