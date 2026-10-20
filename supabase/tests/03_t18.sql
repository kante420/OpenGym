\pset format unaligned
\pset tuples_only on
select set_config('request.jwt.claim.sub','44444444-4444-4444-4444-444444444444',false);
set role authenticated;
insert into public.body_measurements (gym_id,user_id,weight_kg) values ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','44444444-4444-4444-4444-444444444444',62.5);
\echo '-- ^ propio: debe insertar. Ahora el de otro (debe fallar por RLS):'
insert into public.body_measurements (gym_id,user_id,weight_kg) values ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','33333333-3333-3333-3333-333333333333',99);
select 'filas visibles para Lucia: '||count(*) from public.body_measurements;
\echo '-- Cliente intenta cambiar el IVA del centro (debe afectar 0 filas):'
update public.gyms set vat_rate = 0;
reset role;
