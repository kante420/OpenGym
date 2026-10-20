\pset format unaligned
\pset tuples_only on
create or replace function pg_temp.as_admin() returns void language sql as $$ select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false) $$;
create or replace function pg_temp.today(d date) returns void language plpgsql as $f$ begin
  execute format('create or replace function app.today() returns date language sql stable as $b$ select %L::date $b$', d); end $f$;
select pg_temp.as_admin();

\echo '== T1 vencimiento antiguo 2026-11-17 normalizado al día 1 siguiente (esperado 2026-12-01)'
select renewal_date from member_subscriptions where user_id='44444444-4444-4444-4444-444444444444';

select pg_temp.today('2026-10-17');
\echo '== T2 vista con IVA incluido 21% (Miguel: 70 -30% = 49.00) esperado 49.00|40.50|8.50|49.00|21.00'
set role authenticated;
select total_due||'|'||charge_base||'|'||charge_vat||'|'||charge_total||'|'||vat_rate from member_billing where username='miguel';
reset role;

\echo '== T3 Tarjeta ya no es válida (debe fallar)'
set role authenticated; select public.register_payment('33333333-3333-3333-3333-333333333333','Tarjeta'); reset role;

\echo '== T4 primer cobro el 17-oct (esperado 01/10→31/10, importes 49.00/40.50/8.50, renovación 2026-11-01)'
set role authenticated;
select receipt_code||'|'||period_start||'|'||period_end||'|'||amount||'|'||base_amount||'|'||vat_amount||'|'||payment_method from public.register_payment('33333333-3333-3333-3333-333333333333','Bizum');
select 'renovación: '||renewal_date||' · estado: '||billing_status from member_billing where username='miguel';
reset role;

select pg_temp.today('2026-10-31');
\echo '== T5 31-oct sigue AL_DIA; 1-nov pasa a VENCIDO'
set role authenticated; select billing_status from member_billing where username='miguel'; reset role;
select pg_temp.today('2026-11-01');
set role authenticated; select billing_status from member_billing where username='miguel'; reset role;

\echo '== T6 cobro el 2-nov (esperado 01/11→30/11, renovación 2026-12-01, Transferencia)'
select pg_temp.today('2026-11-02');
set role authenticated;
select receipt_code||'|'||period_start||'|'||period_end from public.register_payment('33333333-3333-3333-3333-333333333333','Transferencia');
select 'renovación: '||renewal_date from member_billing where username='miguel';
reset role;

\echo '== T7 cobro con retraso: el 20-ene-2027 (renovación era 2026-12-01). Esperado 01/01/2027→31/01/2027, renovación 2027-02-01'
select pg_temp.today('2027-01-20');
set role authenticated;
select receipt_code||'|'||period_start||'|'||period_end||'|'||payment_method from public.register_payment('33333333-3333-3333-3333-333333333333','Efectivo');
select 'renovación: '||renewal_date from member_billing where username='miguel';
reset role;

\echo '== T8 anular el último: vuelve al vencimiento anterior (esperado 2026-12-01, estado VENCIDO el 20-ene)'
set role authenticated;
select public.void_receipt((select id from payment_receipts where receipt_code like 'FG-2027-%' limit 1), 'Prueba');
select 'renovación: '||renewal_date||' · estado: '||billing_status from member_billing where username='miguel';
reset role;

\echo '== T9 IVA no incluido en precios (gym con 21%): Lucia 30€ => esperado base 30.00, IVA 6.30, total 36.30'
update gyms set prices_include_vat=false where id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
insert into bookings (gym_id,class_id,user_id) values ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','c2000000-0000-0000-0000-000000000002','44444444-4444-4444-4444-444444444444') on conflict do nothing;
set role authenticated;
select charge_base||'|'||charge_vat||'|'||charge_total from member_billing where username='lucia';
reset role;
update gyms set prices_include_vat=true where id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

\echo '== T10 socio ve su propia cuota con IVA y sin poder cobrar'
select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',false);
set role authenticated; select charge_total||'|'||billing_status from member_billing; select public.register_payment('33333333-3333-3333-3333-333333333333','Bizum'); reset role;

\echo '== T11 recibos anteriores con Tarjeta siguen siendo legibles'
insert into payment_receipts (gym_id,user_id,amount,payment_date,concept,payment_method,receipt_code) values ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','33333333-3333-3333-3333-333333333333',10,'2026-01-01','antiguo','Tarjeta','OLD-1');
select count(*)||' recibo(s) con Tarjeta conservado(s)' from payment_receipts where payment_method='Tarjeta';
