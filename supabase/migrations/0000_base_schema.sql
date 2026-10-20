-- =============================================================================
-- OpenGym · Migración 0000 · Esquema base
-- Crea las tablas de partida en un proyecto Supabase NUEVO. Si ya existen (proyecto
-- anterior), no hace nada. Orden: 0000 → 0001 → 0002 → 0003 → (despliegue) → 0009.
-- =============================================================================
create table if not exists public.gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subdomain text not null unique
);

create table if not exists public.profiles (
  id uuid primary key,
  gym_id uuid not null references public.gyms(id) on delete cascade,
  full_name text not null,
  username text not null,
  email text,
  role text not null check (role in ('ADMINISTRADOR', 'ENTRENADOR', 'CLIENTE')),
  dni text,
  birth_date date
);

create table if not exists public.zones (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  name text not null
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  zone_id uuid references public.zones(id) on delete set null,
  title text not null,
  price numeric(10,2) not null default 0,
  days_of_week text,
  schedule_time text,
  start_time timestamptz default now(),
  end_time timestamptz default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade
);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid references public.gyms(id) on delete cascade,
  name text not null
);

create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null,
  description text,
  log_date date not null,
  is_completed boolean not null default false
);

create table if not exists public.attendance_logs (
  id uuid primary key default gen_random_uuid(),
  workout_log_id uuid not null references public.workout_logs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  attended boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.student_logs (
  id uuid primary key default gen_random_uuid(),
  workout_log_id uuid not null references public.workout_logs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  exercise_name text not null,
  weight_kg numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists public.discount_rules (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  min_classes integer not null,
  discount_percentage numeric not null
);

create table if not exists public.member_subscriptions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text,
  monthly_total numeric,
  renewal_date date,
  last_payment_date date
);

create table if not exists public.payment_receipts (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  amount numeric not null,
  payment_date date not null default current_date,
  concept text,
  payment_method text,
  receipt_code text,
  created_at timestamptz not null default now()
);
