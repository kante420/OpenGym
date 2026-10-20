\set ON_ERROR_STOP off
\pset format unaligned
\pset tuples_only on
create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', uid, false); end $$;

\echo '--- T1 anon: no ve profiles (política allow all eliminada)'
set role anon; select count(*) from public.profiles; reset role;
\echo '--- T2 anon: get_gym_public funciona'
set role anon; select name from public.get_gym_public('forzagym'); reset role;

\echo '--- T3 admin A: ve 4 perfiles de su centro (no los de B)'
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
set role authenticated; select count(*) from public.profiles; select count(*) from public.classes; reset role;

\echo '--- T4 cliente Miguel: sólo se ve a sí mismo; no ve recibos ajenos'
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
set role authenticated; select count(*) from public.profiles; select count(*) from public.payment_receipts; select count(*) from public.discount_rules; reset role;

\echo '--- T5 cliente NO puede modificar su rol (debe fallar con permiso denegado)'
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
set role authenticated; update public.profiles set role='ADMINISTRADOR' where id = auth.uid(); reset role;

\echo '--- T6 cliente NO puede llamar register_payment'
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
set role authenticated; select public.register_payment('33333333-3333-3333-3333-333333333333','Efectivo'); reset role;

\echo '--- T7 facturación Miguel: 2 clases, 70 -> 30% => 49.00, PENDIENTE (esperado 2|70.00|30.00|49.00|PENDIENTE)'
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
set role authenticated; select class_count||'|'||base_total||'|'||discount_pct||'|'||total_due||'|'||billing_status from public.member_billing where username='miguel'; reset role;

\echo '--- T8 admin B NO puede cobrar a un socio del centro A'
select pg_temp.as_user('55555555-5555-5555-5555-555555555555');
set role authenticated; select public.register_payment('33333333-3333-3333-3333-333333333333','Efectivo'); reset role;

\echo '--- T9 admin A cobra a Miguel (esperado FG-2026-000001, total 49.00, base 40.50, IVA 8.50)'
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
set role authenticated; select receipt_code||'|'||amount||'|'||base_amount||'|'||vat_amount||'|'||period_start||'|'||period_end from public.register_payment('33333333-3333-3333-3333-333333333333','Bizum'); reset role;
\echo '--- T10 segundo cobro inmediato debe fallar (ya al día)'
set role authenticated; select public.register_payment('33333333-3333-3333-3333-333333333333','Bizum'); reset role;
\echo '--- T11 estado tras cobro (esperado AL_DIA)'
set role authenticated; select billing_status||'|'||renewal_date from public.member_billing where username='miguel'; reset role;
\echo '--- T12 Miguel ve su recibo; Lucia (otro cliente) no ve nada'
select pg_temp.as_user('33333333-3333-3333-3333-333333333333'); set role authenticated; select count(*) from public.payment_receipts; reset role;
select pg_temp.as_user('44444444-4444-4444-4444-444444444444'); set role authenticated; select count(*) from public.payment_receipts; reset role;

\echo '--- T13 anular recibo: vuelve a PENDIENTE; se puede cobrar de nuevo con el siguiente número'
select pg_temp.as_user('11111111-1111-1111-1111-111111111111'); set role authenticated;
select public.void_receipt((select id from public.payment_receipts where receipt_code='FG-2026-000001'), 'Error de importe');
select billing_status from public.member_billing where username='miguel';
select receipt_code from public.register_payment('33333333-3333-3333-3333-333333333333','Efectivo'); reset role;

\echo '--- T14 aforo: capacidad 1 en Yoga; inscribir a Lucia ok, a otro falla'
update public.classes set capacity = 1 where title='Yoga';
select pg_temp.as_user('11111111-1111-1111-1111-111111111111'); set role authenticated;
select public.enroll_member('c2000000-0000-0000-0000-000000000002','44444444-4444-4444-4444-444444444444'); reset role;
\echo '(Yoga ya tiene a Miguel => completa; Lucia debe fallar con aforo)'

\echo '--- T15 inscribir socio de otro centro: debe fallar'
select pg_temp.as_user('11111111-1111-1111-1111-111111111111'); set role authenticated;
select public.enroll_member('c1000000-0000-0000-0000-000000000001','66666666-6666-6666-6666-666666666666'); reset role;

\echo '--- T16 finish_session como entrenador (atómico) y cliente lo ve'
insert into public.workout_logs (id,gym_id,class_id,title,log_date) values ('d1000000-0000-0000-0000-000000000001','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','c1000000-0000-0000-0000-000000000001','WOD','2026-10-16');
select pg_temp.as_user('22222222-2222-2222-2222-222222222222'); set role authenticated;
select public.finish_session('d1000000-0000-0000-0000-000000000001',
  '[{"user_id":"33333333-3333-3333-3333-333333333333","attended":true}]',
  '[{"user_id":"33333333-3333-3333-3333-333333333333","exercise_name":"Sentadilla","weight_kg":100,"reps":5},{"user_id":"33333333-3333-3333-3333-333333333333","exercise_name":"Press","weight_kg":0,"reps":5}]'); reset role;
select pg_temp.as_user('33333333-3333-3333-3333-333333333333'); set role authenticated;
select 'marcas visibles para Miguel: '||count(*) from public.student_logs; reset role;
select pg_temp.as_user('44444444-4444-4444-4444-444444444444'); set role authenticated;
select 'marcas visibles para Lucia (esperado 0): '||count(*) from public.student_logs; reset role;
\echo '--- T17 cliente NO puede insertar marcas directamente'
select pg_temp.as_user('44444444-4444-4444-4444-444444444444'); set role authenticated;
insert into public.student_logs (workout_log_id,user_id,exercise_name,weight_kg) values ('d1000000-0000-0000-0000-000000000001','44444444-4444-4444-4444-444444444444','Sentadilla',300); reset role;
\echo '--- T18 cliente SÍ registra su peso corporal; no puede registrar el de otro'
select pg_temp.as_user('44444444-4444-4444-4444-444444444444'); set role authenticated;
insert into public.body_measurements (gym_id,user_id,weight_kg) values ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','44444444-4444-4444-4444-444444444444',62.5);
insert into public.body_measurements (gym_id,user_id,weight_kg) values ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','33333333-3333-3333-3333-333333333333',99); reset role;
\echo '--- T19 entrenador/cliente no pueden ver reglas de otro centro ni cobrar; coach no cobra'
select pg_temp.as_user('22222222-2222-2222-2222-222222222222'); set role authenticated;
select public.register_payment('44444444-4444-4444-4444-444444444444','Efectivo'); reset role;
