-- Migration for Server-Side Fingerprint Template Storage
create table if not exists public.fingerprint_templates (
  id serial primary key,
  user_id integer not null references public.profiles(id) on delete cascade,
  template_data text not null,
  finger_index integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_fingerprint_templates_user_id on public.fingerprint_templates(user_id);

alter table public.fingerprint_templates enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'fingerprint_templates' and policyname = 'Allow all on fingerprint_templates'
  ) then
    create policy "Allow all on fingerprint_templates" on public.fingerprint_templates for all using (true) with check (true);
  end if;
end $$;

