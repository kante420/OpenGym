\pset format unaligned
\pset tuples_only on
insert into gyms (id,name,subdomain) values ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','Gym A','gym-a'),('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22','Gym B','gym-b');
insert into profiles (id,gym_id,full_name,username,email,role) values
 ('11111111-1111-4111-8111-111111111111','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','Admin A','admin','a@a.test','ADMINISTRADOR'),
 ('22222222-2222-4222-8222-222222222222','b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22','Admin B','admin','b@b.test','ADMINISTRADOR'),
 ('33333333-3333-4333-8333-333333333333','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','Cliente A','cli','c@a.test','CLIENTE');
create or replace function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub',u,false) $$;

\echo '== T1 admin A intenta subirse el límite de socios (debe fallar: permission denied)'
select pg_temp.as_user('11111111-1111-4111-8111-111111111111'); set role authenticated;
update gyms set max_members = 99999 where id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
\echo '== T2 cambiar su código o su estado (deben fallar) y su nombre (debe funcionar: UPDATE 1)'
update gyms set subdomain='hack' where id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
update gyms set status='active' where id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
update gyms set name='Gym A renombrado' where id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
\echo '== T2b y NO puede tocar el centro B (UPDATE 0)'
update gyms set name='pwned' where id='b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22';
reset role;

\echo '== T3 suspender el centro A: nadie de A ve nada; B sigue igual'
update gyms set status='suspended' where subdomain='gym-a';
select pg_temp.as_user('11111111-1111-4111-8111-111111111111'); set role authenticated;
select 'admin A (suspendido) ve perfiles: '||count(*) from profiles; select 'admin A ve gyms: '||count(*) from gyms; reset role;
select pg_temp.as_user('33333333-3333-4333-8333-333333333333'); set role authenticated; select 'cliente A (suspendido) ve perfiles: '||count(*) from profiles; reset role;
select pg_temp.as_user('22222222-2222-4222-8222-222222222222'); set role authenticated; select 'admin B (activo) ve perfiles: '||count(*) from profiles; reset role;
set role anon; select 'get_gym_public → '||status from get_gym_public('gym-a'); reset role;
update gyms set status='active' where subdomain='gym-a';
select pg_temp.as_user('11111111-1111-4111-8111-111111111111'); set role authenticated; select 'tras reactivar, admin A ve perfiles: '||count(*) from profiles; reset role;

\echo '== T4 solicitudes de alta y recuperaciones NO son accesibles por la API (anon y authenticated: permission denied)'
set role anon; select count(*) from signup_requests; reset role;
select pg_temp.as_user('11111111-1111-4111-8111-111111111111'); set role authenticated; select count(*) from signup_requests; select count(*) from password_resets; reset role;

\echo '== T5 platform_overview: sólo service_role'
set role anon; select * from platform_overview(); reset role;
select pg_temp.as_user('11111111-1111-4111-8111-111111111111'); set role authenticated; select * from platform_overview(); select platform_db_size(); reset role;
set role service_role; select subdomain||' · socios '||members||' · staff '||staff from platform_overview() order by subdomain; select 'tamaño BD > 0: '||(platform_db_size() > 0); reset role;

\echo '== T6 formato del código: «Bad Slug» rechazado, «ok-gym» aceptado'
insert into gyms (name,subdomain) values ('x','Bad Slug');
insert into gyms (name,subdomain) values ('x','ok-gym');

\echo '== T7 dos solicitudes pendientes con el mismo código: la segunda debe fallar'
insert into signup_requests (token_hash,slug,gym_name,director_name,admin_email,admin_username,expires_at) values ('h1','nuevo','N','D','d@d.test','d',now()+interval '1 day');
insert into signup_requests (token_hash,slug,gym_name,director_name,admin_email,admin_username,expires_at) values ('h2','nuevo','N2','D2','e@e.test','e',now()+interval '1 day');
update signup_requests set verified_at=now() where token_hash='h1';
insert into signup_requests (token_hash,slug,gym_name,director_name,admin_email,admin_username,expires_at) values ('h3','nuevo','N3','D3','f@f.test','f',now()+interval '1 day');
select 'tras verificar la primera, la tercera sí entra: '||count(*) from signup_requests where slug='nuevo';
