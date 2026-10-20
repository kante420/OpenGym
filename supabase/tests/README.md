# Tests de la migración (PostgreSQL local, sin Supabase)

Reproducen el esquema antiguo (con un trigger de numeración y una política `allow all` que la migración
debe neutralizar), cargan datos con duplicados y comprueban RLS, aislamiento entre centros y cobros.

```bash
createdb forzatest
psql -v ON_ERROR_STOP=1 -q -d forzatest -f supabase/tests/00_legacy_fixture.sql
psql -v ON_ERROR_STOP=1 -q -d forzatest -f supabase/tests/01_seed.sql
psql -v ON_ERROR_STOP=1 -q -d forzatest -f supabase/migrations/0001_hardening_and_features.sql
psql -d forzatest -f supabase/tests/02_behavior.sql   # lee los comentarios «esperado» de cada prueba
psql -d forzatest -f supabase/tests/03_t18.sql
psql -d forzatest -f supabase/tests/04_client_bill.sql
```
No ejecutes `00_legacy_fixture.sql` ni `01_seed.sql` contra tu proyecto real de Supabase.

## Facturación por mes natural (migración 0002)
Si los roles `anon`/`authenticated` ya existen en tu Postgres local, usa `00b_fixture_without_roles.sql` en lugar del primer fichero.
`10_billing_pre_0002.sql` deja una suscripción con el criterio antiguo (vence el día 17) **antes** de aplicar `0002`;
`11_billing_first_of_month.sql` simula distintas fechas (1-nov, cobro con retraso en enero…) y comprueba periodos, IVA y anulaciones.

## Plataforma multicentro (migraciones 0000–0003)
Base nueva: `20_supabase_emulation.sql` (emula `auth` de Supabase) → `0000`, `0001`, `0002`, `0003` → `21_platform_security.sql`.
Comprueba: un administrador no puede subirse el límite de socios ni cambiar código o estado de su gimnasio; un gimnasio suspendido
pierde el acceso; `signup_requests` y `password_resets` no son accesibles por la API; `platform_overview` solo para `service_role`;
formato de código y unicidad de solicitudes pendientes.
