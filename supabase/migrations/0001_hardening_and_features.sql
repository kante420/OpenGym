-- =============================================================================
-- Forza GymFit · Migración 0001
-- Seguridad (RLS multi-centro), facturación atómica y nuevas funciones.
--
-- Puede repetirse mientras NO se hayan aplicado 0002/0003 (después, se niega a ejecutarse). Sólo AÑADE columnas/tablas y
-- sustituye políticas y triggers de recibos (ver avisos al ejecutar).
--
-- ORDEN DE DESPLIEGUE:
--   1) Ejecuta esta migración en el SQL Editor de Supabase.
--   2) Ejecuta `node scripts/migrate-legacy-users.mjs` (crea cuentas Auth reales).
--   3) Despliega la nueva versión de la app.
--   4) Ejecuta 0009_drop_legacy_password.sql (borra las contraseñas en claro).
--
-- IMPORTANTE: al activar RLS, la versión antigua de la app (que usaba la clave
-- anon para todo) dejará de funcionar. Despliega la nueva a continuación.
-- =============================================================================

-- Protección: esta migración REVIERTE la facturación y la seguridad de las posteriores si se
-- repite después de ellas. Se niega a ejecutarse si 0002 o 0003 ya están aplicadas.
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'gyms' and column_name = 'status')
     or exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'member_billing' and column_name = 'charge_total') then
    raise exception 'Las migraciones 0002/0003 ya están aplicadas: NO repitas la 0001 (desharía la seguridad y la facturación).';
  end if;
end $$;

create schema if not exists app;
grant usage on schema app to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 1. Columnas nuevas (sólo se añaden; no se tocan las existentes)
-- -----------------------------------------------------------------------------
alter table public.gyms
  add column if not exists legal_name text,
  add column if not exists tax_id text,
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists contact_email text,
  add column if not exists vat_rate numeric(4,2) not null default 21,
  add column if not exists prices_include_vat boolean not null default true,
  add column if not exists receipt_prefix text not null default 'FG';

alter table public.profiles
  add column if not exists phone text,
  add column if not exists active boolean not null default true,
  add column if not exists created_at timestamptz not null default now();

alter table public.classes
  add column if not exists capacity integer check (capacity is null or capacity > 0),
  add column if not exists trainer_id uuid references public.profiles(id) on delete set null,
  add column if not exists active boolean not null default true;

alter table public.workout_logs
  add column if not exists structure jsonb,
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

alter table public.student_logs
  add column if not exists reps integer check (reps is null or reps > 0);

alter table public.payment_receipts
  add column if not exists base_amount numeric(10,2),
  add column if not exists vat_rate numeric(4,2),
  add column if not exists vat_amount numeric(10,2),
  add column if not exists period_start date,
  add column if not exists period_end date,
  add column if not exists voided_at timestamptz,
  add column if not exists void_reason text,
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

-- -----------------------------------------------------------------------------
-- 2. Tablas nuevas
-- -----------------------------------------------------------------------------
create table if not exists public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  measured_on date not null default (now() at time zone 'Europe/Madrid')::date,
  weight_kg numeric(5,2) not null check (weight_kg > 0 and weight_kg < 500),
  body_fat_pct numeric(4,1) check (body_fat_pct is null or (body_fat_pct > 0 and body_fat_pct < 80)),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists body_measurements_user_idx on public.body_measurements (user_id, measured_on desc);

create table if not exists public.receipt_counters (
  gym_id uuid not null references public.gyms(id) on delete cascade,
  year integer not null,
  last_number integer not null default 0,
  primary key (gym_id, year)
);

-- -----------------------------------------------------------------------------
-- 3. Limpieza de duplicados y claves únicas (evitan dobles inscripciones/cobros)
-- -----------------------------------------------------------------------------
delete from public.bookings a using public.bookings b
 where a.class_id = b.class_id and a.user_id = b.user_id and a.ctid > b.ctid;
create unique index if not exists bookings_class_user_uq on public.bookings (class_id, user_id);

delete from public.attendance_logs a using public.attendance_logs b
 where a.workout_log_id = b.workout_log_id and a.user_id = b.user_id and a.ctid > b.ctid;
create unique index if not exists attendance_log_user_uq on public.attendance_logs (workout_log_id, user_id);

delete from public.member_subscriptions a using public.member_subscriptions b
 where a.gym_id = b.gym_id and a.user_id = b.user_id and a.ctid > b.ctid;
create unique index if not exists member_subscriptions_user_uq on public.member_subscriptions (gym_id, user_id);

create unique index if not exists profiles_gym_username_uq on public.profiles (gym_id, lower(username));
create index if not exists bookings_user_idx on public.bookings (user_id);
create index if not exists workout_logs_class_date_idx on public.workout_logs (class_id, log_date desc);
create index if not exists student_logs_user_idx on public.student_logs (user_id, exercise_name);
create index if not exists payment_receipts_gym_date_idx on public.payment_receipts (gym_id, payment_date desc);

-- -----------------------------------------------------------------------------
-- 4. Funciones auxiliares (esquema `app`, no expuesto por la API REST)
-- -----------------------------------------------------------------------------
create or replace function app.today() returns date
language sql stable as $$ select (now() at time zone 'Europe/Madrid')::date $$;

create or replace function app.gym_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select gym_id from public.profiles where id = auth.uid() and active
$$;

create or replace function app.user_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create or replace function app.is_admin() returns boolean
language sql stable as $$ select coalesce(app.user_role() = 'ADMINISTRADOR', false) $$;

create or replace function app.is_staff() returns boolean
language sql stable as $$ select coalesce(app.user_role() in ('ADMINISTRADOR', 'ENTRENADOR'), false) $$;

grant execute on function app.today(), app.gym_id(), app.user_role(), app.is_admin(), app.is_staff()
  to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. Row Level Security: se eliminan TODAS las políticas previas (una política
--    permisiva antigua anularía cualquier restricción nueva) y se recrean.
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
  p record;
  tables text[] := array[
    'gyms','profiles','zones','classes','bookings','exercises','workout_logs',
    'attendance_logs','student_logs','discount_rules','member_subscriptions',
    'payment_receipts','body_measurements','receipt_counters'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security', t);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      raise notice 'Eliminando política antigua % en %', p.policyname, t;
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
  end loop;
end $$;

-- gyms
create policy gyms_select on public.gyms for select to authenticated using (id = app.gym_id());
create policy gyms_update on public.gyms for update to authenticated
  using (id = app.gym_id() and app.is_admin()) with check (id = app.gym_id() and app.is_admin());

-- profiles (las escrituras se hacen sólo desde el servidor con service_role)
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or (gym_id = app.gym_id() and app.is_staff()));

-- zones
create policy zones_select on public.zones for select to authenticated using (gym_id = app.gym_id());
create policy zones_write on public.zones for all to authenticated
  using (gym_id = app.gym_id() and app.is_admin()) with check (gym_id = app.gym_id() and app.is_admin());

-- classes
create policy classes_select on public.classes for select to authenticated using (gym_id = app.gym_id());
create policy classes_write on public.classes for all to authenticated
  using (gym_id = app.gym_id() and app.is_admin()) with check (gym_id = app.gym_id() and app.is_admin());

-- discount_rules
create policy discount_rules_select on public.discount_rules for select to authenticated
  using (gym_id = app.gym_id()); -- no es sensible y member_billing la necesita para el socio
create policy discount_rules_write on public.discount_rules for all to authenticated
  using (gym_id = app.gym_id() and app.is_admin()) with check (gym_id = app.gym_id() and app.is_admin());

-- exercises (gym_id nulo = catálogo global de sólo lectura)
create policy exercises_select on public.exercises for select to authenticated
  using (gym_id = app.gym_id() or gym_id is null);
create policy exercises_insert on public.exercises for insert to authenticated
  with check (gym_id = app.gym_id() and app.is_staff());
create policy exercises_delete on public.exercises for delete to authenticated
  using (gym_id = app.gym_id() and app.is_staff());

-- bookings
create policy bookings_select on public.bookings for select to authenticated
  using (gym_id = app.gym_id() and (user_id = auth.uid() or app.is_staff()));
create policy bookings_delete on public.bookings for delete to authenticated
  using (gym_id = app.gym_id() and app.is_admin());

-- workout_logs (el cliente sólo ve rutinas de las clases en las que está inscrito)
create policy workout_logs_select on public.workout_logs for select to authenticated
  using (gym_id = app.gym_id() and (
    app.is_staff() or exists (
      select 1 from public.bookings b where b.class_id = workout_logs.class_id and b.user_id = auth.uid())));
create policy workout_logs_write on public.workout_logs for all to authenticated
  using (gym_id = app.gym_id() and app.is_staff()) with check (gym_id = app.gym_id() and app.is_staff());

-- attendance_logs / student_logs (no tienen gym_id: se deduce de la rutina)
create policy attendance_select on public.attendance_logs for select to authenticated
  using (user_id = auth.uid() or (app.is_staff() and exists (
    select 1 from public.workout_logs w where w.id = workout_log_id and w.gym_id = app.gym_id())));
create policy attendance_write on public.attendance_logs for all to authenticated
  using (app.is_staff() and exists (
    select 1 from public.workout_logs w where w.id = workout_log_id and w.gym_id = app.gym_id()))
  with check (app.is_staff() and exists (
    select 1 from public.workout_logs w where w.id = workout_log_id and w.gym_id = app.gym_id()));

create policy student_logs_select on public.student_logs for select to authenticated
  using (user_id = auth.uid() or (app.is_staff() and exists (
    select 1 from public.workout_logs w where w.id = workout_log_id and w.gym_id = app.gym_id())));
create policy student_logs_write on public.student_logs for all to authenticated
  using (app.is_staff() and exists (
    select 1 from public.workout_logs w where w.id = workout_log_id and w.gym_id = app.gym_id()))
  with check (app.is_staff() and exists (
    select 1 from public.workout_logs w where w.id = workout_log_id and w.gym_id = app.gym_id()));

-- cobros: lectura (admin o el propio socio). Las escrituras sólo vía funciones RPC.
create policy subscriptions_select on public.member_subscriptions for select to authenticated
  using (gym_id = app.gym_id() and (app.is_admin() or user_id = auth.uid()));
create policy receipts_select on public.payment_receipts for select to authenticated
  using (gym_id = app.gym_id() and (app.is_admin() or user_id = auth.uid()));

-- body_measurements
create policy body_select on public.body_measurements for select to authenticated
  using (gym_id = app.gym_id() and (user_id = auth.uid() or app.is_staff()));
create policy body_insert on public.body_measurements for insert to authenticated
  with check (gym_id = app.gym_id() and (user_id = auth.uid() or app.is_staff()));
create policy body_delete on public.body_measurements for delete to authenticated
  using (gym_id = app.gym_id() and (user_id = auth.uid() or app.is_admin()));

-- receipt_counters: sin políticas => sólo accesible desde funciones security definer

-- Privilegios: nada para anon salvo lo explícitamente concedido más abajo
revoke all on public.gyms, public.profiles, public.zones, public.classes, public.bookings,
  public.exercises, public.workout_logs, public.attendance_logs, public.student_logs,
  public.discount_rules, public.member_subscriptions, public.payment_receipts,
  public.body_measurements, public.receipt_counters from anon;
revoke insert, update, delete on public.profiles, public.member_subscriptions,
  public.payment_receipts from authenticated;
revoke all on public.receipt_counters from authenticated;

-- Privilegios explícitos (no dependen de los valores por defecto del proyecto);
-- las políticas RLS de arriba restringen después fila a fila.
grant select on public.gyms, public.profiles, public.zones, public.classes, public.bookings,
  public.exercises, public.workout_logs, public.attendance_logs, public.student_logs,
  public.discount_rules, public.member_subscriptions, public.payment_receipts,
  public.body_measurements to authenticated;
grant update on public.gyms to authenticated;
grant insert, update, delete on public.zones, public.classes, public.discount_rules,
  public.workout_logs, public.attendance_logs, public.student_logs to authenticated;
grant insert, delete on public.exercises, public.body_measurements to authenticated;
grant delete on public.bookings to authenticated;

-- -----------------------------------------------------------------------------
-- 6. Recibos: numeración correlativa por centro y año (sin huecos por rollback)
--    Se eliminan triggers antiguos que asignaban receipt_code (p. ej. "FG-000000X").
-- -----------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select t.tgname
    from pg_trigger t
    where t.tgrelid = 'public.payment_receipts'::regclass
      and not t.tgisinternal
      and pg_get_functiondef(t.tgfoid) ilike '%receipt_code%'
  loop
    raise notice 'Eliminando trigger antiguo de numeración: %', r.tgname;
    execute format('drop trigger %I on public.payment_receipts', r.tgname);
  end loop;
end $$;

create unique index if not exists payment_receipts_code_uq
  on public.payment_receipts (gym_id, receipt_code) where receipt_code is not null;

-- -----------------------------------------------------------------------------
-- 7. Vista de facturación: lo que debe pagar cada socio, calculado en el servidor
--    (sustituye al cálculo en el navegador que además ESCRIBÍA en cada lectura)
-- -----------------------------------------------------------------------------
create or replace view public.member_billing with (security_invoker = true) as
select
  p.id as user_id,
  p.gym_id,
  p.full_name,
  p.username,
  p.email,
  p.dni,
  p.phone,
  p.active,
  coalesce(c.class_count, 0)::int as class_count,
  coalesce(c.base_total, 0)::numeric(10,2) as base_total,
  coalesce(d.pct, 0)::numeric(5,2) as discount_pct,
  round(coalesce(c.base_total, 0) * (1 - coalesce(d.pct, 0) / 100.0), 2)::numeric(10,2) as total_due,
  s.id as subscription_id,
  s.last_payment_date,
  s.renewal_date,
  case
    when coalesce(c.class_count, 0) = 0 then 'SIN_ACTIVIDAD'
    when s.last_payment_date is null then 'PENDIENTE'
    when s.renewal_date > app.today() then 'AL_DIA'
    else 'VENCIDO'
  end as billing_status
from public.profiles p
left join lateral (
  select count(*) as class_count, sum(cl.price::numeric) as base_total
  from public.bookings b
  join public.classes cl on cl.id = b.class_id and cl.active
  where b.user_id = p.id
) c on true
left join lateral (
  select max(r.discount_percentage)::numeric as pct
  from public.discount_rules r
  where r.gym_id = p.gym_id and r.min_classes <= coalesce(c.class_count, 0)
) d on true
left join public.member_subscriptions s on s.user_id = p.id and s.gym_id = p.gym_id
where p.role = 'CLIENTE';

grant select on public.member_billing to authenticated;

-- -----------------------------------------------------------------------------
-- 8. Funciones RPC (todas comprueban rol y centro dentro de la propia función)
-- -----------------------------------------------------------------------------

-- Datos públicos mínimos del centro para la pantalla de login (sin sesión)
create or replace function public.get_gym_public(p_subdomain text)
returns table (id uuid, name text, subdomain text)
language sql stable security definer set search_path = '' as $$
  select g.id, g.name, g.subdomain from public.gyms g where g.subdomain = lower(p_subdomain) limit 1
$$;
grant execute on function public.get_gym_public(text) to anon, authenticated;

-- Registrar un cobro: calcula el importe en servidor, numera y actualiza la cuota
create or replace function public.register_payment(p_user_id uuid, p_method text)
returns public.payment_receipts
language plpgsql security definer set search_path = '' as $$
declare
  v_gym uuid := app.gym_id();
  v_gymrow public.gyms%rowtype;
  v_bill public.member_billing%rowtype;
  v_total numeric(10,2);
  v_base numeric(10,2);
  v_vat numeric(10,2);
  v_start date;
  v_year int := extract(year from app.today());
  v_num int;
  v_receipt public.payment_receipts%rowtype;
begin
  if not app.is_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  if p_method not in ('Efectivo', 'Bizum', 'Tarjeta', 'Transferencia') then
    raise exception 'Método de pago no válido';
  end if;

  select * into v_gymrow from public.gyms where id = v_gym;
  select * into v_bill from public.member_billing where user_id = p_user_id and gym_id = v_gym;
  if not found then raise exception 'Socio no encontrado'; end if;
  if v_bill.billing_status = 'SIN_ACTIVIDAD' or v_bill.total_due <= 0 then
    raise exception 'El socio no tiene actividades con importe a cobrar';
  end if;
  if v_bill.billing_status = 'AL_DIA' then
    raise exception 'El socio ya está al día hasta el %', to_char(v_bill.renewal_date, 'DD/MM/YYYY');
  end if;

  if v_gymrow.prices_include_vat then
    v_total := v_bill.total_due;
    v_base := round(v_total / (1 + v_gymrow.vat_rate / 100), 2);
  else
    v_base := v_bill.total_due;
    v_total := round(v_base * (1 + v_gymrow.vat_rate / 100), 2);
  end if;
  v_vat := v_total - v_base;

  v_start := case when v_bill.last_payment_date is null then app.today()
                  else greatest(v_bill.renewal_date, app.today()) end;

  insert into public.receipt_counters as rc (gym_id, year, last_number) values (v_gym, v_year, 1)
  on conflict (gym_id, year) do update set last_number = rc.last_number + 1
  returning last_number into v_num;

  insert into public.payment_receipts
    (gym_id, user_id, amount, base_amount, vat_rate, vat_amount, payment_date, concept,
     payment_method, receipt_code, period_start, period_end, created_by)
  values
    (v_gym, p_user_id, v_total, v_base, v_gymrow.vat_rate, v_vat, app.today(),
     'Cuota mensual · ' || to_char(v_start, 'DD/MM/YYYY') || ' – ' ||
       to_char((v_start + interval '1 month' - interval '1 day')::date, 'DD/MM/YYYY'),
     p_method,
     v_gymrow.receipt_prefix || '-' || v_year || '-' || lpad(v_num::text, 6, '0'),
     v_start, (v_start + interval '1 month' - interval '1 day')::date, auth.uid())
  returning * into v_receipt;

  insert into public.member_subscriptions as s
    (gym_id, user_id, status, monthly_total, last_payment_date, renewal_date)
  values (v_gym, p_user_id, 'AL_DIA', v_total, app.today(), (v_start + interval '1 month')::date)
  on conflict (gym_id, user_id) do update set
    status = 'AL_DIA', monthly_total = excluded.monthly_total,
    last_payment_date = excluded.last_payment_date, renewal_date = excluded.renewal_date;

  return v_receipt;
end $$;

-- Anular un recibo (los recibos nunca se borran) y revertir la cuota si era el último
create or replace function public.void_receipt(p_receipt_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_r public.payment_receipts%rowtype;
  v_prev public.payment_receipts%rowtype;
begin
  if not app.is_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Indica el motivo de la anulación'; end if;

  select * into v_r from public.payment_receipts
   where id = p_receipt_id and gym_id = app.gym_id() for update;
  if not found then raise exception 'Recibo no encontrado'; end if;
  if v_r.voided_at is not null then raise exception 'El recibo ya está anulado'; end if;

  update public.payment_receipts set voided_at = now(), void_reason = trim(p_reason) where id = v_r.id;

  select * into v_prev from public.payment_receipts
   where gym_id = v_r.gym_id and user_id = v_r.user_id and voided_at is null
   order by payment_date desc, created_at desc limit 1;

  if not found then
    update public.member_subscriptions
       set status = 'PENDIENTE', last_payment_date = null, renewal_date = app.today()
     where gym_id = v_r.gym_id and user_id = v_r.user_id;
  elsif v_prev.created_at < v_r.created_at then
    update public.member_subscriptions
       set last_payment_date = v_prev.payment_date,
           renewal_date = (coalesce(v_prev.period_start, v_prev.payment_date) + interval '1 month')::date
     where gym_id = v_r.gym_id and user_id = v_r.user_id;
  end if;
end $$;

-- Inscribir respetando el aforo
create or replace function public.enroll_member(p_class_id uuid, p_user_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_class public.classes%rowtype;
  v_count int;
begin
  if not app.is_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  select * into v_class from public.classes where id = p_class_id and gym_id = app.gym_id() for update;
  if not found then raise exception 'Actividad no encontrada'; end if;
  if not exists (select 1 from public.profiles where id = p_user_id and gym_id = app.gym_id() and role = 'CLIENTE') then
    raise exception 'Socio no encontrado';
  end if;
  select count(*) into v_count from public.bookings where class_id = p_class_id;
  if v_class.capacity is not null and v_count >= v_class.capacity then
    raise exception 'La actividad está completa (% plazas)', v_class.capacity;
  end if;
  insert into public.bookings (gym_id, class_id, user_id) values (app.gym_id(), p_class_id, p_user_id)
  on conflict (class_id, user_id) do nothing;
end $$;

-- Cerrar una sesión: asistencia + marcas + estado, todo en una transacción
create or replace function public.finish_session(p_log_id uuid, p_attendance jsonb, p_marks jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not app.is_staff() then raise exception 'No autorizado' using errcode = '42501'; end if;
  if not exists (select 1 from public.workout_logs where id = p_log_id and gym_id = app.gym_id()) then
    raise exception 'Sesión no encontrada';
  end if;

  insert into public.attendance_logs (workout_log_id, user_id, attended)
  select p_log_id, x.user_id, x.attended
  from jsonb_to_recordset(coalesce(p_attendance, '[]'::jsonb)) as x(user_id uuid, attended boolean)
  where exists (select 1 from public.profiles p where p.id = x.user_id and p.gym_id = app.gym_id())
  on conflict (workout_log_id, user_id) do update set attended = excluded.attended;

  delete from public.student_logs where workout_log_id = p_log_id;
  insert into public.student_logs (workout_log_id, user_id, exercise_name, weight_kg, reps)
  select p_log_id, x.user_id, x.exercise_name, x.weight_kg, x.reps
  from jsonb_to_recordset(coalesce(p_marks, '[]'::jsonb))
       as x(user_id uuid, exercise_name text, weight_kg numeric, reps int)
  where x.weight_kg > 0
    and exists (select 1 from public.profiles p where p.id = x.user_id and p.gym_id = app.gym_id());

  update public.workout_logs set is_completed = true where id = p_log_id;
end $$;

revoke execute on function public.register_payment(uuid, text), public.void_receipt(uuid, text),
  public.enroll_member(uuid, uuid), public.finish_session(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.register_payment(uuid, text), public.void_receipt(uuid, text),
  public.enroll_member(uuid, uuid), public.finish_session(uuid, jsonb, jsonb) to authenticated;
