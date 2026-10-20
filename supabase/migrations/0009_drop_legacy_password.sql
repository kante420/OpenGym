-- Ejecutar SÓLO cuando la nueva versión esté desplegada y
-- `node scripts/migrate-legacy-users.mjs` haya terminado sin errores.
-- Elimina las contraseñas en texto plano de la tabla profiles.
alter table public.profiles drop column if exists password;
