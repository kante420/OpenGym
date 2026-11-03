\pset format unaligned
\pset tuples_only on
insert into gyms (id,name,subdomain) values ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','Gym A','gym-a'),('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22','Gym B','gym-b');
insert into profiles (id,gym_id,full_name,username,email,role) values
 ('11111111-1111-4111-8111-111111111111','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','Admin A','admin','a@a.test','ADMINISTRADOR'),
 ('33333333-3333-4333-8333-333333333333','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','Cliente A','cli','c@a.test','CLIENTE'),
 ('22222222-2222-4222-8222-222222222222','b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22','Admin B','admin','b@b.test','ADMINISTRADOR'),
 ('44444444-4444-4444-8444-444444444444','b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22','Cliente B','cli','d@b.test','CLIENTE');
insert into auth.users (id,email) values ('33333333-3333-4333-8333-333333333333','cli@gym-a.gym.local'),('44444444-4444-4444-8444-444444444444','cli@gym-b.gym.local');
insert into classes (id,gym_id,title,price) values ('c1000000-0000-4000-8000-000000000001','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','Judo',40),('c2000000-0000-4000-8000-000000000002','b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22','Yoga',30);
insert into bookings (gym_id,class_id,user_id) values ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','c1000000-0000-4000-8000-000000000001','33333333-3333-4333-8333-333333333333'),('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22','c2000000-0000-4000-8000-000000000002','44444444-4444-4444-8444-444444444444');
insert into workout_logs (id,gym_id,class_id,title,log_date) values ('d1000000-0000-4000-8000-000000000001','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','c1000000-0000-4000-8000-000000000001','WOD','2026-10-19'),('d2000000-0000-4000-8000-000000000002','b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22','c2000000-0000-4000-8000-000000000002','WOD','2026-10-19');
insert into attendance_logs (workout_log_id,user_id) values ('d1000000-0000-4000-8000-000000000001','33333333-3333-4333-8333-333333333333'),('d2000000-0000-4000-8000-000000000002','44444444-4444-4444-8444-444444444444');
insert into student_logs (workout_log_id,user_id,exercise_name,weight_kg) values ('d1000000-0000-4000-8000-000000000001','33333333-3333-4333-8333-333333333333','Sentadilla',100),('d2000000-0000-4000-8000-000000000002','44444444-4444-4444-8444-444444444444','Sentadilla',90);
insert into payment_receipts (gym_id,user_id,amount,payment_date,concept,receipt_code) values ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','33333333-3333-4333-8333-333333333333',40,'2026-10-01','x','A-1'),('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22','44444444-4444-4444-8444-444444444444',30,'2026-10-01','x','B-1');
insert into member_subscriptions (gym_id,user_id,status) values ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','33333333-3333-4333-8333-333333333333','AL_DIA'),('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22','44444444-4444-4444-8444-444444444444','AL_DIA');
insert into body_measurements (gym_id,user_id,weight_kg) values ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','33333333-3333-4333-8333-333333333333',70),('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22','44444444-4444-4444-8444-444444444444',65);
insert into gym_logos (gym_id,content_type,data_b64,width,height) values ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','image/png','AAAA',2,2);
insert into gym_mail_settings (gym_id,provider,host,port,username,password_enc) values ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','gmail','smtp.gmail.com',465,'a@gmail.com','v1:x');
update gyms set logo_updated_at = now() where subdomain='gym-a';
create or replace function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub',u,false) $$;

