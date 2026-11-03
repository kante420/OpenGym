-- =============================================================================
-- OpenGym · Migración 0004
-- Logo y correo de envío por gimnasio, y herramientas del propietario (borrar un
-- gimnasio por completo, limpiar cuentas huérfanas). Idempotente. Ejecútala tras 0003.
-- =============================================================================

alter table public.gyms add column if not exists logo_updated_at timestamptz;

alter table public.signup_requests
  add column if not exists logo_b64 text,
  add column if not exists logo_type text,
  add column if not exists logo_w integer,
  add column if not exists logo_h integer;

-- Logo (se sirve por /api/logo/<código>). Sólo accesible desde el servidor.
create table if not exists public.gym_logos (
  gym_id uuid primary key references public.gyms(id) on delete cascade,
  content_type text not null,
  data_b64 text not null,
  width integer not null,
  height integer not null,
  updated_at timestamptz not null default now()
);

-- Cuenta SMTP del gimnasio para enviar sus recibos. La contraseña va CIFRADA (AES-256-GCM)
-- desde la aplicación; la base de datos nunca la ve en claro. Sólo accesible desde el servidor.
create table if not exists public.gym_mail_settings (
  gym_id uuid primary key references public.gyms(id) on delete cascade,
  provider text not null,
  host text not null,
  port integer not null,
  username text not null,
  password_enc text not null,
  from_name text,
  verified_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.gym_logos enable row level security;
alter table public.gym_mail_settings enable row level security;
revoke all on public.gym_logos, public.gym_mail_settings from anon, authenticated;

-- Identificar una cuenta de autenticación por su email (para limpiar restos de intentos anteriores)
create or replace function public.auth_user_id_by_email(p_email text) returns uuid
language sql stable security definer set search_path = '' as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1
$$;

-- Borrado completo de un gimnasio, en orden explícito (no depende de que existan claves
-- foráneas en cascada). Devuelve los ids de sus cuentas para borrarlas también de Auth.
create or replace function public.platform_delete_gym(p_gym_id uuid) returns uuid[]
language plpgsql security definer set search_path = '' as $$
declare v_ids uuid[];
begin
  select coalesce(array_agg(id), '{}') into v_ids from public.profiles where gym_id = p_gym_id;
  delete from public.attendance_logs where workout_log_id in (select id from public.workout_logs where gym_id = p_gym_id);
  delete from public.student_logs where workout_log_id in (select id from public.workout_logs where gym_id = p_gym_id);
  delete from public.workout_logs where gym_id = p_gym_id;
  delete from public.bookings where gym_id = p_gym_id;
  delete from public.body_measurements where gym_id = p_gym_id;
  delete from public.member_subscriptions where gym_id = p_gym_id;
  delete from public.payment_receipts where gym_id = p_gym_id;
  delete from public.receipt_counters where gym_id = p_gym_id;
  delete from public.discount_rules where gym_id = p_gym_id;
  delete from public.exercises where gym_id = p_gym_id;
  delete from public.classes where gym_id = p_gym_id;
  delete from public.zones where gym_id = p_gym_id;
  delete from public.password_resets where gym_id = p_gym_id;
  delete from public.gym_logos where gym_id = p_gym_id;
  delete from public.gym_mail_settings where gym_id = p_gym_id;
  delete from public.profiles where gym_id = p_gym_id;
  delete from public.gyms where id = p_gym_id;
  return v_ids;
end $$;

revoke execute on function public.auth_user_id_by_email(text), public.platform_delete_gym(uuid) from public, anon, authenticated;
grant execute on function public.auth_user_id_by_email(text), public.platform_delete_gym(uuid) to service_role;

-- La pantalla de acceso (pública) necesita saber si hay logo para mostrarlo
drop function if exists public.get_gym_public(text);
create function public.get_gym_public(p_subdomain text)
returns table (id uuid, name text, subdomain text, status text, logo_version bigint)
language sql stable security definer set search_path = '' as $$
  select g.id, g.name, g.subdomain, g.status, extract(epoch from g.logo_updated_at)::bigint
  from public.gyms g where g.subdomain = lower(p_subdomain) limit 1
$$;
grant execute on function public.get_gym_public(text) to anon, authenticated;

-- Resumen para el panel del propietario, ahora con los datos que se pueden editar
drop function if exists public.platform_overview();
create function public.platform_overview()
returns table (
  id uuid, name text, subdomain text, status text, max_members int, city text, province text, country text,
  director_name text, contact_email text, size_range text, created_at timestamptz, last_login_at timestamptz,
  signup_country text, signup_region text, signup_city text,
  members int, staff int, receipts int, sessions int,
  address text, postal_code text, phone text, website text, has_logo boolean
)
language sql stable security definer set search_path = '' as $$
  select g.id, g.name, g.subdomain, g.status, g.max_members, g.city, g.province, g.country,
         g.director_name, g.contact_email, g.size_range, g.created_at, g.last_login_at,
         g.signup_country, g.signup_region, g.signup_city,
         (select count(*) from public.profiles p where p.gym_id = g.id and p.role = 'CLIENTE' and p.active)::int,
         (select count(*) from public.profiles p where p.gym_id = g.id and p.role in ('ENTRENADOR', 'ADMINISTRADOR') and p.active)::int,
         (select count(*) from public.payment_receipts r where r.gym_id = g.id and r.voided_at is null)::int,
         (select count(*) from public.workout_logs w where w.gym_id = g.id)::int,
         g.address, g.postal_code, g.phone, g.website, (g.logo_updated_at is not null)
  from public.gyms g order by g.created_at desc
$$;
revoke execute on function public.platform_overview() from public, anon, authenticated;
grant execute on function public.platform_overview() to service_role;
