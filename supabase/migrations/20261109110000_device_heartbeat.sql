-- Add heartbeat and live tracking to devices
alter table if exists public.devices add column if not exists last_seen_at timestamptz;
alter table if exists public.devices add column if not exists ip_address text;

-- Add devices to Supabase Realtime publication
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'devices'
  ) then
    alter publication supabase_realtime add table public.devices;
  end if;
end $$;

