-- Enable UUID and extensions
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (Corresponds to users table, keeping same structure and id matching fingerprint templates)
create table if not exists public.profiles (
  id serial primary key,
  auth_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  phone text unique not null,
  email text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  
  -- Fine-grained permissions
  add_user boolean not null default false,
  see_users boolean not null default false,
  see_all_logs boolean not null default false,
  add_device boolean not null default false,
  update_password boolean not null default false,
  see_all_presence boolean not null default false,

  added_by integer references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 2. Devices Table (ESP32 terminals)
create table if not exists public.devices (
  id serial primary key,
  device_name text not null,
  mac_address text unique not null,
  placed_on text not null,
  added_by integer references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 3. Attendance Records Table
create table if not exists public.attendees (
  id serial primary key,
  user_id integer not null references public.profiles(id) on delete cascade,
  att_date date not null default current_date,
  in_time timestamptz not null default now(),
  out_time timestamptz,
  device_id integer references public.devices(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint unique_user_daily_attendance unique (user_id, att_date)
);

-- 4. Enrollment Queue (For real-time ESP32 biometric scanning coordination)
create table if not exists public.enrollment_queue (
  id serial primary key,
  device_id integer not null references public.devices(id) on delete cascade,
  user_id integer not null references public.profiles(id) on delete cascade,
  status text not null default 'PENDING' check (status in ('PENDING', 'SCANNING', 'COMPLETED', 'FAILED')),
  current_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Audit Footprints Table (Security and operational log tracking)
create table if not exists public.footprints (
  id serial primary key,
  user_id integer references public.profiles(id) on delete set null,
  type text not null,
  details jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Realtime Publications
alter publication supabase_realtime add table public.attendees;
alter publication supabase_realtime add table public.enrollment_queue;

-- Default sample device and admin profile seed
insert into public.profiles (id, name, phone, email, status, add_user, see_users, see_all_logs, add_device, update_password, see_all_presence)
values (1, 'Zahid Sir', '01700000000', 'zahid@ugv.edu.bd', 'ACTIVE', true, true, true, true, true, true)
on conflict (id) do nothing;

insert into public.devices (id, device_name, mac_address, placed_on, added_by)
values (1, 'Main Gate Terminal 1', 'AA:BB:CC:DD:EE:01', 'Faculty Building Entrance', 1)
on conflict (id) do nothing;

-- Fix serial sequence counters after explicit id insertion
select setval('profiles_id_seq', (select max(id) from public.profiles));
select setval('devices_id_seq', (select max(id) from public.devices));

