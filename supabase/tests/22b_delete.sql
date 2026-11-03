\pset format unaligned
\pset tuples_only on
create or replace function pg_temp.counts(g uuid, u uuid) returns text language sql as $$
 select 'gyms:'||(select count(*) from gyms where id=g)||' perfiles:'||(select count(*) from profiles where gym_id=g)||' clases:'||(select count(*) from classes where gym_id=g)||' reservas:'||(select count(*) from bookings where gym_id=g)||' recibos:'||(select count(*) from payment_receipts where gym_id=g)||' suscripciones:'||(select count(*) from member_subscriptions where gym_id=g)||' sesiones:'||(select count(*) from workout_logs where gym_id=g)||' marcas:'||(select count(*) from student_logs where user_id=u)||' asistencia:'||(select count(*) from attendance_logs where user_id=u)||' pesos:'||(select count(*) from body_measurements where gym_id=g)||' logos:'||(select count(*) from gym_logos where gym_id=g)||' correo:'||(select count(*) from gym_mail_settings where gym_id=g) $$;
\echo 'ANTES  A: ' 
select pg_temp.counts('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','33333333-3333-4333-8333-333333333333');
set role service_role; select 'cuentas devueltas: '||array_length(platform_delete_gym('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'), 1); reset role;
\echo 'DESPUÉS A (todo debe ser 0):'
select pg_temp.counts('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','33333333-3333-4333-8333-333333333333');
\echo 'DESPUÉS B (debe seguir intacto, todo 1 salvo perfiles 2):'
select pg_temp.counts('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22','44444444-4444-4444-8444-444444444444');
