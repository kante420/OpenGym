'use server';
import { z } from 'zod';
import { createAdminSupabase } from '../supabase/admin';
import { UserError } from '../auth';
import { emailLayout, explainEmailError, sendEmail } from '../email';
import { escapeHtml, loginEmail, normalizeUsername } from '../format';
import { clientInfo, hashToken, newToken, siteUrl, verifyCaptcha } from '../platform';
import { validateSlug } from '../slug';
import type { ActionResult } from '../types';
import { optStr, run, str } from './shared';

const SIZES = ['1-50', '51-150', '151-500', '500+'] as const;
const schema = z.object({
  gym_name: z.string().min(2, 'Escribe el nombre del gimnasio.').max(60),
  slug: z.string(),
  address: z.string().min(3, 'Indica la dirección del gimnasio.').max(120),
  postal_code: z.string().max(10).nullable(),
  city: z.string().min(2, 'Indica la ciudad.').max(60),
  province: z.string().max(60).nullable(),
  country: z.string().min(2, 'Indica el país.').max(60),
  phone: z.string().max(30).nullable(),
  website: z.string().max(120).nullable(),
  size_range: z.enum(SIZES, { error: 'Indica el tamaño aproximado.' }),
  director_name: z.string().min(3, 'Escribe el nombre del director o directora.').max(80),
  email: z.string().toLowerCase().email('El email no es válido.'),
  password: z.string().min(10, 'La contraseña debe tener al menos 10 caracteres.').max(72, 'La contraseña es demasiado larga.'),
  terms: z.literal('on', { error: 'Debes aceptar los términos y la política de privacidad.' }),
});

const since = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

async function slugTaken(slug: string): Promise<boolean> {
  const admin = createAdminSupabase();
  const [{ data: g }, { data: s }] = await Promise.all([
    admin.from('gyms').select('id').eq('subdomain', slug).limit(1),
    admin.from('signup_requests').select('id').eq('slug', slug).is('verified_at', null).gt('expires_at', new Date().toISOString()).limit(1),
  ]);
  return Boolean(g?.length || s?.length);
}

/** Comprobación en vivo del código mientras se escribe en el formulario. */
export async function checkSlug(slug: string): Promise<{ ok: boolean; message: string }> {
  const bad = validateSlug(slug);
  if (bad) return { ok: false, message: bad };
  return (await slugTaken(slug)) ? { ok: false, message: 'Ese código ya está en uso. Prueba con otro.' } : { ok: true, message: 'Disponible' };
}

/** Paso 1: valida, protege contra altas masivas, reserva el código y envía el email de verificación. */
export async function requestGym(_p: ActionResult<{ email: string }> | null, fd: FormData): Promise<ActionResult<{ email: string }>> {
  return run<{ email: string }>(async () => {
    // Trampas para bots: campo oculto que una persona no rellena y tiempo mínimo de relleno
    const elapsed = Date.now() - Number(str(fd, 't0'));
    if (str(fd, 'company_website') !== '' || !Number.isFinite(elapsed)) throw new UserError('No hemos podido procesar el formulario. Recarga la página e inténtalo de nuevo.');
    // 2,5 s: un bot envía en menos de 1 s; una persona con autocompletado puede tardar poco más de 2
    if (elapsed < 2_500) throw new UserError('Has enviado el formulario demasiado rápido. Espera un par de segundos y vuelve a pulsar «Crear gimnasio».');
    if (elapsed > 6 * 3_600_000) throw new UserError('La página lleva mucho tiempo abierta. Recárgala e inténtalo de nuevo.');

    const parsed = schema.safeParse({
      gym_name: str(fd, 'gym_name'), slug: str(fd, 'slug').toLowerCase(), address: str(fd, 'address'), postal_code: optStr(fd, 'postal_code'),
      city: str(fd, 'city'), province: optStr(fd, 'province'), country: str(fd, 'country'), phone: optStr(fd, 'phone'), website: optStr(fd, 'website'),
      size_range: str(fd, 'size_range'), director_name: str(fd, 'director_name'), email: str(fd, 'email'), password: String(fd.get('password') ?? ''), terms: str(fd, 'terms'),
    });
    if (!parsed.success) throw new UserError(parsed.error.issues[0].message);
    const d = parsed.data;
    if (d.password !== String(fd.get('password2') ?? '')) throw new UserError('Las contraseñas no coinciden.');
    const bad = validateSlug(d.slug);
    if (bad) throw new UserError(bad);

    const info = await clientInfo();
    const captcha = await verifyCaptcha(str(fd, 'cf-turnstile-response') || null, info.ip);
    if (!captcha.ok) throw new UserError(captcha.reason ?? 'Verificación anti-bots fallida.');

    const admin = createAdminSupabase();
    // Limpieza perezosa de solicitudes caducadas sin verificar (y de sus cuentas provisionales)
    const { data: stale } = await admin.from('signup_requests').select('id, auth_user_id').is('verified_at', null).lt('expires_at', new Date().toISOString()).limit(25);
    for (const r of stale ?? []) {
      if (r.auth_user_id) await admin.auth.admin.deleteUser(r.auth_user_id as string);
      await admin.from('signup_requests').delete().eq('id', r.id);
    }

    // Límites de frecuencia (la IP sólo se compara por su hash)
    const count = async (col: 'ip_hash' | 'admin_email', val: string, h: number) =>
      (await admin.from('signup_requests').select('id', { count: 'exact', head: true }).eq(col, val).gte('created_at', since(h))).count ?? 0;
    if ((await count('ip_hash', info.ipHash, 1)) >= 3 || (await count('ip_hash', info.ipHash, 24)) >= 8) throw new UserError('Demasiados intentos desde tu conexión. Inténtalo de nuevo más tarde.');
    if ((await count('admin_email', d.email, 24)) >= 2) throw new UserError('Ya hemos enviado solicitudes a ese email. Revisa tu bandeja (y el spam) o espera 24 horas.');
    const { count: global } = await admin.from('signup_requests').select('id', { count: 'exact', head: true }).gte('created_at', since(1));
    if ((global ?? 0) >= 80) throw new UserError('Hay mucha demanda ahora mismo. Inténtalo de nuevo en un rato.');

    if (await slugTaken(d.slug)) throw new UserError('Ese código ya está en uso. Prueba con otro.');

    // La cuenta se crea ya (sin guardar la contraseña en nuestras tablas) pero no da acceso hasta verificar el email
    const username = normalizeUsername(d.email.split('@')[0]) || 'admin';
    const { data: created, error: aErr } = await admin.auth.admin.createUser({
      email: loginEmail(username, d.slug), password: d.password, email_confirm: true, user_metadata: { full_name: d.director_name, pending_signup: true },
    });
    if (aErr || !created.user) throw new UserError(aErr?.message?.toLowerCase().includes('password') ? 'La contraseña no es lo bastante segura.' : 'No se pudo crear la cuenta. Inténtalo de nuevo.');

    const token = newToken();
    const { error: iErr } = await admin.from('signup_requests').insert({
      token_hash: hashToken(token), slug: d.slug, gym_name: d.gym_name, address: d.address, postal_code: d.postal_code, city: d.city, province: d.province,
      country: d.country, phone: d.phone, website: d.website, size_range: d.size_range, director_name: d.director_name, admin_email: d.email,
      admin_username: username, auth_user_id: created.user.id, ip_hash: info.ipHash, geo_country: info.country, geo_region: info.region, geo_city: info.city,
      user_agent: info.userAgent, expires_at: new Date(Date.now() + 24 * 3_600_000).toISOString(),
    });
    if (iErr) {
      await admin.auth.admin.deleteUser(created.user.id);
      throw new UserError(iErr.code === '23505' ? 'Ese código acaba de ser reservado por otra persona. Prueba con otro.' : 'No se pudo registrar la solicitud. Inténtalo de nuevo.');
    }

    try {
      await sendEmail({
        to: d.email, subject: 'Confirma tu gimnasio en OpenGym',
        html: emailLayout(`Confirma «${d.gym_name}»`, `<p>Hola, ${escapeHtml(d.director_name)}. Para activar tu gimnasio <strong>${escapeHtml(d.gym_name)}</strong> en OpenGym, confirma que este email es tuyo.</p><p>Tu dirección será <strong>${escapeHtml(siteUrl().replace(/^https?:\/\//, ''))}/${escapeHtml(d.slug)}</strong>. El enlace caduca en 24 horas.</p><p style="color:#6b665b">Si no has creado ningún gimnasio, ignora este mensaje.</p>`, { label: 'Activar mi gimnasio', url: `${siteUrl()}/verificar?token=${token}` }),
      });
    } catch (e) {
      console.error('[signup-email]', e);
      await admin.from('signup_requests').delete().eq('token_hash', hashToken(token));
      await admin.auth.admin.deleteUser(created.user.id);
      throw new UserError(`No hemos podido enviar el email de confirmación. ${explainEmailError(e)}`);
    }
    return { message: 'Solicitud enviada.', data: { email: d.email } };
  }, false);
}

/** Paso 2: al confirmar el email se crea el gimnasio y su administrador. */
export async function confirmGym(token: string): Promise<ActionResult<{ slug: string }>> {
  return run<{ slug: string }>(async () => {
    const admin = createAdminSupabase();
    const { data: r } = await admin.from('signup_requests').select('*').eq('token_hash', hashToken(token)).maybeSingle();
    if (!r || r.verified_at || new Date(r.expires_at as string).getTime() < Date.now()) throw new UserError('El enlace no es válido o ha caducado. Crea el gimnasio de nuevo.');

    const { data: gym, error: gErr } = await admin.from('gyms').insert({
      name: r.gym_name, subdomain: r.slug, address: r.address, postal_code: r.postal_code, city: r.city, province: r.province, country: r.country,
      phone: r.phone, website: r.website, size_range: r.size_range, director_name: r.director_name, contact_email: r.admin_email,
      signup_country: r.geo_country, signup_region: r.geo_region, signup_city: r.geo_city, status: 'active',
    }).select('id').single();
    if (gErr || !gym) throw new UserError(gErr?.code === '23505' ? 'Ese código ya lo ha ocupado otro gimnasio. Crea la solicitud de nuevo con otro código.' : 'No se pudo crear el gimnasio. Inténtalo de nuevo.');

    const { error: pErr } = await admin.from('profiles').insert({
      id: r.auth_user_id, gym_id: gym.id, full_name: r.director_name, username: r.admin_username, email: r.admin_email, role: 'ADMINISTRADOR', active: true,
    });
    if (pErr) {
      await admin.from('gyms').delete().eq('id', gym.id);
      throw new UserError('No se pudo crear la cuenta de administrador. Inténtalo de nuevo.');
    }
    await admin.from('signup_requests').update({ verified_at: new Date().toISOString() }).eq('id', r.id);
    await admin.auth.admin.updateUserById(r.auth_user_id as string, { user_metadata: { full_name: r.director_name, pending_signup: false, must_change_password: false } });
    return { data: { slug: r.slug as string } };
  }, false);
}
