-- Emulación mínima de Supabase
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
grant usage on schema public to anon, authenticated;

-- Esquema "legado" inferido del código original
create table public.gyms (id uuid primary key default gen_random_uuid(), name text, subdomain text unique);
create table public.profiles (id uuid primary key, gym_id uuid references gyms(id), full_name text, username text, email text, password text, role text, dni text, birth_date date);
create table public.zones (id uuid primary key default gen_random_uuid(), gym_id uuid references gyms(id), name text);
create table public.classes (id uuid primary key default gen_random_uuid(), gym_id uuid references gyms(id), zone_id uuid references zones(id) on delete set null, title text, price float8 default 0, days_of_week text, schedule_time text, start_time timestamptz not null, end_time timestamptz not null);
create table public.bookings (id uuid primary key default gen_random_uuid(), gym_id uuid, class_id uuid references classes(id) on delete cascade, user_id uuid references profiles(id) on delete cascade);
create table public.exercises (id uuid primary key default gen_random_uuid(), gym_id uuid, name text);
create table public.workout_logs (id uuid primary key default gen_random_uuid(), gym_id uuid, class_id uuid references classes(id) on delete cascade, title text, description text, log_date date, is_completed boolean default false);
create table public.attendance_logs (id uuid primary key default gen_random_uuid(), workout_log_id uuid references workout_logs(id) on delete cascade, user_id uuid, attended boolean, created_at timestamptz default now());
create table public.student_logs (id uuid primary key default gen_random_uuid(), workout_log_id uuid references workout_logs(id) on delete cascade, user_id uuid, exercise_name text, weight_kg numeric, created_at timestamptz default now());
create table public.discount_rules (id uuid primary key default gen_random_uuid(), gym_id uuid, min_classes int, discount_percentage numeric);
create table public.member_subscriptions (id uuid primary key default gen_random_uuid(), gym_id uuid, user_id uuid references profiles(id) on delete cascade, status text, monthly_total numeric, renewal_date date, last_payment_date date);
create table public.payment_receipts (id uuid primary key default gen_random_uuid(), gym_id uuid, user_id uuid, amount numeric, payment_date date, concept text, payment_method text, receipt_code text, created_at timestamptz default now());
-- Trigger antiguo de numeración (debe ser sustituido por la migración)
create sequence legacy_rcpt_seq;
create function legacy_assign_code() returns trigger language plpgsql as $$ begin new.receipt_code := 'FG-' || lpad(nextval('legacy_rcpt_seq')::text, 7, '0'); return new; end $$;
create trigger trg_legacy_code before insert on payment_receipts for each row execute function legacy_assign_code();
-- Política permisiva antigua (debe desaparecer)
alter table public.profiles enable row level security;
create policy "allow all" on public.profiles for all to anon using (true) with check (true);
grant all on all tables in schema public to anon, authenticated, service_role;
