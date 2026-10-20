-- =============================================================================
-- Forza GymFit · Migración 0002
-- · Las cuotas vencen el día 1 de cada mes (periodo = mes natural).
-- · Sólo se admiten Efectivo, Bizum y Transferencia.
-- · La vista member_billing calcula también base imponible, IVA y total a cobrar
--   (una única fuente de verdad: lo que se muestra es exactamente lo que se factura).
-- Idempotente. Ejecútala justo después de 0001.
-- =============================================================================

-- 1) Normalizar vencimientos existentes al día 1 (se redondea HACIA ARRIBA al día 1
--    siguiente, para que nadie pase a «vencido» de golpe por el cambio de criterio).
update public.member_subscriptions
   set renewal_date = (date_trunc('month', renewal_date) + interval '1 month')::date
 where renewal_date is not null and extract(day from renewal_date) <> 1;

-- 2) Vista de facturación con IVA (se añaden columnas al final; las anteriores no cambian)
create or replace view public.member_billing with (security_invoker = true) as
select
  b.*,
  g.vat_rate::numeric(4,2) as vat_rate,
  (case when g.prices_include_vat then round(b.total_due / (1 + g.vat_rate / 100), 2) else b.total_due end)::numeric(10,2) as charge_base,
  ((case when g.prices_include_vat then b.total_due else round(b.total_due * (1 + g.vat_rate / 100), 2) end)
   - (case when g.prices_include_vat then round(b.total_due / (1 + g.vat_rate / 100), 2) else b.total_due end))::numeric(10,2) as charge_vat,
  (case when g.prices_include_vat then b.total_due else round(b.total_due * (1 + g.vat_rate / 100), 2) end)::numeric(10,2) as charge_total
from (
  select
    p.id as user_id, p.gym_id, p.full_name, p.username, p.email, p.dni, p.phone, p.active,
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
    from public.bookings bk
    join public.classes cl on cl.id = bk.class_id and cl.active
    where bk.user_id = p.id
  ) c on true
  left join lateral (
    select max(r.discount_percentage)::numeric as pct
    from public.discount_rules r
    where r.gym_id = p.gym_id and r.min_classes <= coalesce(c.class_count, 0)
  ) d on true
  left join public.member_subscriptions s on s.user_id = p.id and s.gym_id = p.gym_id
  where p.role = 'CLIENTE'
) b
join public.gyms g on g.id = b.gym_id;

grant select on public.member_billing to authenticated;

-- 3) Registrar cobro: periodo = mes natural; vence el día 1 del mes siguiente
create or replace function public.register_payment(p_user_id uuid, p_method text)
returns public.payment_receipts
language plpgsql security definer set search_path = '' as $$
declare
  v_gym uuid := app.gym_id();
  v_gymrow public.gyms%rowtype;
  v_bill public.member_billing%rowtype;
  v_month date := date_trunc('month', app.today())::date;
  v_start date;
  v_end date;
  v_year int := extract(year from app.today());
  v_num int;
  v_receipt public.payment_receipts%rowtype;
begin
  if not app.is_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  if p_method not in ('Efectivo', 'Bizum', 'Transferencia') then
    raise exception 'Método de pago no válido: usa Efectivo, Bizum o Transferencia';
  end if;

  select * into v_gymrow from public.gyms where id = v_gym;
  select * into v_bill from public.member_billing where user_id = p_user_id and gym_id = v_gym;
  if not found then raise exception 'Socio no encontrado'; end if;
  if v_bill.billing_status = 'SIN_ACTIVIDAD' or v_bill.total_due <= 0 then
    raise exception 'El socio no tiene actividades con importe a cobrar';
  end if;
  if v_bill.billing_status = 'AL_DIA' then
    raise exception 'El socio ya está al día hasta el %', to_char(v_bill.renewal_date - 1, 'DD/MM/YYYY');
  end if;

  -- Primer pago: mes en curso. Resto: el mes que toca (si se retrasó, el mes en curso).
  v_start := date_trunc('month', case when v_bill.last_payment_date is null then v_month
                                      else greatest(v_bill.renewal_date, v_month) end)::date;
  v_end := (v_start + interval '1 month' - interval '1 day')::date;

  insert into public.receipt_counters as rc (gym_id, year, last_number) values (v_gym, v_year, 1)
  on conflict (gym_id, year) do update set last_number = rc.last_number + 1
  returning last_number into v_num;

  insert into public.payment_receipts
    (gym_id, user_id, amount, base_amount, vat_rate, vat_amount, payment_date, concept,
     payment_method, receipt_code, period_start, period_end, created_by)
  values
    (v_gym, p_user_id, v_bill.charge_total, v_bill.charge_base, v_bill.vat_rate, v_bill.charge_vat, app.today(),
     'Cuota mensual · ' || to_char(v_start, 'DD/MM/YYYY') || ' – ' || to_char(v_end, 'DD/MM/YYYY'),
     p_method,
     v_gymrow.receipt_prefix || '-' || v_year || '-' || lpad(v_num::text, 6, '0'),
     v_start, v_end, auth.uid())
  returning * into v_receipt;

  insert into public.member_subscriptions as s
    (gym_id, user_id, status, monthly_total, last_payment_date, renewal_date)
  values (v_gym, p_user_id, 'AL_DIA', v_bill.charge_total, app.today(), (v_start + interval '1 month')::date)
  on conflict (gym_id, user_id) do update set
    status = 'AL_DIA', monthly_total = excluded.monthly_total,
    last_payment_date = excluded.last_payment_date, renewal_date = excluded.renewal_date;

  return v_receipt;
end $$;

-- 4) Anular recibo: al revertir, el vencimiento vuelve al día 1 que le correspondía
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
           renewal_date = (date_trunc('month', coalesce(v_prev.period_start, v_prev.payment_date)) + interval '1 month')::date
     where gym_id = v_r.gym_id and user_id = v_r.user_id;
  end if;
end $$;

revoke execute on function public.register_payment(uuid, text), public.void_receipt(uuid, text) from public, anon;
grant execute on function public.register_payment(uuid, text), public.void_receipt(uuid, text) to authenticated;
