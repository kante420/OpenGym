-- Límite de intentos de inicio de sesión fallidos (fuerza bruta / enumeración).
-- Sólo se guarda el hash de la IP. Acceso únicamente desde el servidor (service role).
create table if not exists public.login_attempts (
  id bigint generated always as identity primary key,
  gym_id uuid not null references public.gyms(id) on delete cascade,
  ip_hash text not null,
  ident text not null,
  created_at timestamptz not null default now()
);

create index if not exists login_attempts_ip_idx on public.login_attempts (ip_hash, created_at desc);
create index if not exists login_attempts_ident_idx on public.login_attempts (gym_id, ident, created_at desc);

alter table public.login_attempts enable row level security;
revoke all on public.login_attempts from anon, authenticated;
