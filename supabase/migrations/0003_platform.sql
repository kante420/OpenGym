-- =============================================================================
-- OpenGym · Migración 0003 · Plataforma multicentro
-- Altas públicas con verificación, recuperación de contraseña, estado y límites por
-- centro, y datos para el panel del propietario. Idempotente. Ejecútala tras 0002.
-- =============================================================================

-- 1) Datos del centro y control de la plataforma
alter table public.gyms
  add column if not exists status text not null default 'active',
  add column if not exists max_members integer not null default 150,
  add column if not exists city text,
  add column if not exists province text,
  add column if not exists country text,
  add column if not exists postal_code text,
  add column if not exists director_name text,
  add column if not exists website text,
  add column if not exists size_range text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists last_login_at timestamptz,
  add column if not exists signup_country text,
  add column if not exists signup_region text,
  add column if not exists signup_city text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'gyms_status_check') then
    alter table public.gyms add constraint gyms_status_check check (status in ('active', 'suspended'));
  end if;
  -- «not valid»: se exige a las altas nuevas sin invalidar centros ya existentes
  if not exists (select 1 from pg_constraint where conname = 'gyms_subdomain_format') then
    alter table public.gyms add constraint gyms_subdomain_format check (subdomain ~ '^[a-z0-9][a-z0-9-]{0,28}[a-z0-9]$') not valid;
  end if;
end $$;

-- 2) Un centro suspendido deja de tener acceso a sus datos (también por la API)
create or replace function app.gym_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.gym_id from public.profiles p join public.gyms g on g.id = p.gym_id
   where p.id = auth.uid() and p.active and g.status = 'active'
$$;

create or replace function app.user_role() returns text
language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p join public.gyms g on g.id = p.gym_id
   where p.id = auth.uid() and p.active and g.status = 'active'
$$;

-- 3) Un administrador sólo puede editar los datos «de negocio» de su centro: NO el código,
--    el estado, el límite de socios ni los datos de alta (eso es de la plataforma).
revoke update on public.gyms from authenticated;
grant update (name, legal_name, tax_id, address, phone, contact_email, vat_rate, prices_include_vat,
              receipt_prefix, city, province, country, postal_code, director_name, website)
  on public.gyms to authenticated;

-- 4) Pantalla de acceso: datos públicos mínimos (ahora con estado)
drop function if exists public.get_gym_public(text);
create function public.get_gym_public(p_subdomain text)
returns table (id uuid, name text, subdomain text, status text)
language sql stable security definer set search_path = '' as $$
  select g.id, g.name, g.subdomain, g.status from public.gyms g where g.subdomain = lower(p_subdomain) limit 1
$$;
grant execute on function public.get_gym_public(text) to anon, authenticated;

-- 5) Solicitudes de alta (pendientes de verificar el email). Sólo accesible con service_role.
create table if not exists public.signup_requests (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  slug text not null,
  gym_name text not null,
  address text, postal_code text, city text, province text, country text, phone text, website text, size_range text,
  director_name text not null,
  admin_email text not null,
  admin_username text not null,
  auth_user_id uuid,
  ip_hash text,
  geo_country text, geo_region text, geo_city text,
  user_agent text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  verified_at timestamptz
);
create unique index if not exists signup_requests_pending_slug_uq on public.signup_requests (slug) where verified_at is null;
create index if not exists signup_requests_ip_idx on public.signup_requests (ip_hash, created_at desc);
create index if not exists signup_requests_email_idx on public.signup_requests (lower(admin_email), created_at desc);

create table if not exists public.password_resets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  gym_id uuid not null references public.gyms(id) on delete cascade,
  token_hash text not null unique,
  ip_hash text,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists password_resets_user_idx on public.password_resets (user_id, created_at desc);
create index if not exists password_resets_ip_idx on public.password_resets (ip_hash, created_at desc);

alter table public.signup_requests enable row level security;
alter table public.password_resets enable row level security;
revoke all on public.signup_requests, public.password_resets from anon, authenticated;

-- 6) Resumen para el panel del propietario (sólo recuentos: nunca nombres de socios ni importes)
drop function if exists public.platform_overview();
create function public.platform_overview()
returns table (
  id uuid, name text, subdomain text, status text, max_members int, city text, province text, country text,
  director_name text, contact_email text, size_range text, created_at timestamptz, last_login_at timestamptz,
  signup_country text, signup_region text, signup_city text,
  members int, staff int, receipts int, sessions int
)
language sql stable security definer set search_path = '' as $$
  select g.id, g.name, g.subdomain, g.status, g.max_members, g.city, g.province, g.country,
         g.director_name, g.contact_email, g.size_range, g.created_at, g.last_login_at,
         g.signup_country, g.signup_region, g.signup_city,
         (select count(*) from public.profiles p where p.gym_id = g.id and p.role = 'CLIENTE' and p.active)::int,
         (select count(*) from public.profiles p where p.gym_id = g.id and p.role in ('ENTRENADOR', 'ADMINISTRADOR') and p.active)::int,
         (select count(*) from public.payment_receipts r where r.gym_id = g.id and r.voided_at is null)::int,
         (select count(*) from public.workout_logs w where w.gym_id = g.id)::int
  from public.gyms g order by g.created_at desc
$$;

create or replace function public.platform_db_size() returns bigint
language sql stable security definer set search_path = '' as $$ select pg_database_size(current_database()) $$;

revoke execute on function public.platform_overview(), public.platform_db_size() from public, anon, authenticated;
grant execute on function public.platform_overview(), public.platform_db_size() to service_role;
