#!/usr/bin/env node
/**
 * Da de alta un centro nuevo con su primer administrador.
 *   node --env-file=.env.local scripts/create-gym.mjs --name "Forza GymFit" --subdomain forzagym \
 *        --admin-user admin --admin-name "Ana López" --admin-email ana@correo.com   (herramienta de desarrollo)
 * Imprime la contraseña temporal del administrador (se le pedirá cambiarla al entrar).
 */
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';

const arg = (k) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : undefined; };
const adminEmail = arg('admin-email')?.toLowerCase();
const name = arg('name'), subdomain = arg('subdomain')?.toLowerCase(), adminUser = arg('admin-user')?.toLowerCase(), adminName = arg('admin-name');
if (!name || !subdomain || !adminUser || !adminName || !/^[a-z0-9-]{2,30}$/.test(subdomain)) {
  console.error('Uso: --name "Centro" --subdomain codigo --admin-user usuario --admin-name "Nombre Apellido"\n(subdomain: 2–30 caracteres a-z, 0-9 o guion)');
  process.exit(1);
}
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL.trim(), process.env.SUPABASE_SERVICE_ROLE_KEY.trim(), { auth: { persistSession: false } });

const { data: gym, error: gErr } = await admin.from('gyms').insert({ name, subdomain, contact_email: adminEmail ?? null }).select('id').single();
if (gErr) { console.error('No se pudo crear el centro:', gErr.message); process.exit(1); }

const password = randomBytes(9).toString('base64url');
const { data: user, error: uErr } = await admin.auth.admin.createUser({
  email: `${adminUser}@${subdomain}.gym.local`, password, email_confirm: true,
  user_metadata: { full_name: adminName, must_change_password: true },
});
if (uErr) { await admin.from('gyms').delete().eq('id', gym.id); console.error('No se pudo crear el administrador:', uErr.message); process.exit(1); }

const { error: pErr } = await admin.from('profiles').insert({ id: user.user.id, gym_id: gym.id, full_name: adminName, username: adminUser, role: 'ADMINISTRADOR', active: true, email: adminEmail ?? null });
if (pErr) { await admin.auth.admin.deleteUser(user.user.id); await admin.from('gyms').delete().eq('id', gym.id); console.error('No se pudo crear el perfil:', pErr.message); process.exit(1); }

console.log(`Centro «${name}» creado.\n  Acceso: /gym/${subdomain}/login\n  Usuario: ${adminUser}\n  Contraseña temporal: ${password}`);
