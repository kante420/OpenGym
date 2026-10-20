\pset format unaligned
\pset tuples_only on
select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',false);
set role authenticated;
\echo 'Miguel ve su propia cuota (esperado 2|49.00) y sólo 1 fila:'
select class_count||'|'||total_due from public.member_billing;
select 'filas: '||count(*) from public.member_billing;
\echo 'Miguel no puede escribir reglas de descuento (debe fallar):'
insert into public.discount_rules(gym_id,min_classes,discount_percentage) values ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',2,90);
reset role;
