#!/usr/bin/env node
/**
 * Migra los usuarios antiguos (tabla `profiles` con contraseña en claro) a cuentas
 * reales de Supabase Auth, conservando el MISMO id para no romper reservas, marcas, etc.
 *
 * Uso (desde la raíz del proyecto, Node 20+):
 *   node --env-file=.env.local scripts/migrate-legacy-users.mjs            # simulación
 *   node --env-file=.env.local scripts/migrate-legacy-users.mjs --apply    # ejecuta
 *
 * Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
 * El email de acceso sigue la convención de la app: <usuario>@<centro>.gym.local
 * Los usuarios quedan marcados para cambiar contraseña en su primer acceso.
 */
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';

const apply = process.argv.includes('--apply');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.');
  process.exit(1);
}

const admin = createClient(url.trim(), key.trim(), { auth: { persistSession: false, autoRefreshToken: false } });

const loginEmail = (username, subdomain) => `${username.trim().toLowerCase()}@${subdomain}.gym.local`;
const randomPassword = () => randomBytes(9).toString('base64url');

async function listAllAuthUsers() {
  const map = new Map();
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    data.users.forEach((u) => map.set(u.id, u));
    if (data.users.length < 1000) break;
  }
  return map;
}

const { data: gyms, error: gErr } = await admin.from('gyms').select('id, subdomain');
if (gErr) throw gErr;
const gymSub = new Map(gyms.map((g) => [g.id, g.subdomain]));

// `password` sólo existe hasta ejecutar 0002_drop_legacy_password.sql
const { data: profiles, error: pErr } = await admin
  .from('profiles')
  .select('id, gym_id, username, full_name, role, password');
if (pErr) throw pErr;

const authUsers = await listAllAuthUsers();
const generated = [];
let created = 0, updated = 0, skipped = 0, failed = 0;

console.log(`${apply ? 'APLICANDO' : 'SIMULACIÓN'} · ${profiles.length} perfiles, ${authUsers.size} cuentas Auth existentes\n`);

for (const p of profiles) {
  const sub = gymSub.get(p.gym_id);
  if (!sub || !p.username) {
    console.log(`  ! ${p.id} sin centro o sin usuario: se omite`);
    skipped++;
    continue;
  }
  const email = loginEmail(p.username, sub);
  const existing = authUsers.get(p.id);

  try {
    if (existing) {
      if (existing.email === email) { skipped++; continue; }
      console.log(`  ~ ${p.username}@${sub}: actualizar email ${existing.email} → ${email}`);
      if (apply) {
        const { error } = await admin.auth.admin.updateUserById(p.id, { email, email_confirm: true });
        if (error) throw error;
      }
      updated++;
      continue;
    }

    const legacy = (p.password ?? '').toString();
    const usable = legacy.length >= 8 && legacy !== 'forzagym'; // la clave por defecto era pública
    const password = usable ? legacy : randomPassword();
    console.log(`  + ${p.username}@${sub} (${p.role}): crear cuenta ${usable ? '(conserva su contraseña)' : '(contraseña nueva)'}`);

    if (apply) {
      const { data, error } = await admin.auth.admin.createUser({
        id: p.id, // el servidor Auth admite id propio; se verifica justo debajo
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: p.full_name, must_change_password: true },
      });
      if (error) throw error;
      if (data.user.id !== p.id) {
        await admin.auth.admin.deleteUser(data.user.id);
        throw new Error(
          `Supabase ignoró el id solicitado (${data.user.id} ≠ ${p.id}). Se canceló este usuario; ` +
          'no continúes: hay que migrar con otro método (ver README, sección Migración).'
        );
      }
      if (!usable) generated.push({ username: p.username, centro: sub, password });
    }
    created++;
  } catch (e) {
    failed++;
    console.error(`  ✗ ${p.username}@${sub}: ${e.message}`);
    if (String(e.message).includes('ignoró el id')) break;
  }
}

console.log(`\nCreadas: ${created} · Email actualizado: ${updated} · Sin cambios/omitidas: ${skipped} · Errores: ${failed}`);

if (apply && generated.length) {
  mkdirSync('scripts/out', { recursive: true });
  const file = 'scripts/out/passwords-generadas.csv';
  writeFileSync(file, 'usuario,centro,contrasena_temporal\n' + generated.map((g) => `${g.username},${g.centro},${g.password}`).join('\n') + '\n', { mode: 0o600 });
  console.log(`\nContraseñas temporales (entrégalas en mano y borra el archivo): ${file}`);
}
if (!apply) console.log('\nNo se ha modificado nada. Repite con --apply para ejecutar.');
process.exit(failed ? 1 : 0);
