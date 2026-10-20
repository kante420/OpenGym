insert into gyms (id,name,subdomain) values ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','Forza GymFit','forzagym'),('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22','Otro Gym','otrogym');
insert into profiles (id,gym_id,full_name,username,role,password) values
 ('11111111-1111-1111-1111-111111111111','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','Admin','admin','ADMINISTRADOR','x'),
 ('22222222-2222-2222-2222-222222222222','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','Hugo','hugo','ENTRENADOR','x'),
 ('33333333-3333-3333-3333-333333333333','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','Miguel','miguel','CLIENTE','x'),
 ('44444444-4444-4444-4444-444444444444','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','Lucia','lucia','CLIENTE','x'),
 ('55555555-5555-5555-5555-555555555555','b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22','Admin Otro','adminotro','ADMINISTRADOR','x'),
 ('66666666-6666-6666-6666-666666666666','b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22','Cliente Otro','clienteotro','CLIENTE','x');
insert into classes (id,gym_id,title,price,start_time,end_time) values
 ('c1000000-0000-0000-0000-000000000001','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','Crossfit',40,now(),now()),
 ('c2000000-0000-0000-0000-000000000002','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','Yoga',30,now(),now()),
 ('c3000000-0000-0000-0000-000000000003','b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22','Boxeo',50,now(),now());
-- duplicado de inscripción (debe limpiarse)
insert into bookings (gym_id,class_id,user_id) values
 ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','c1000000-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333'),
 ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','c1000000-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333'),
 ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','c2000000-0000-0000-0000-000000000002','33333333-3333-3333-3333-333333333333'),
 ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22','c3000000-0000-0000-0000-000000000003','66666666-6666-6666-6666-666666666666');
insert into discount_rules (gym_id,min_classes,discount_percentage) values ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',2,30);
