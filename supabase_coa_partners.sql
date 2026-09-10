-- ==============================================================================
-- SISTEM RAKAN AGENSI COA - ZAIMROSLI.MY
-- Skrip Penciptaan Jadual & Polisi Keselamatan Supabase (PostgreSQL)
-- ==============================================================================

-- 1. Cipta Jadual coa_partners
create table if not exists public.coa_partners (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text not null,
  agency text not null,
  ren_number text not null,
  phone text not null,
  agent_code text unique not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Cipta Indeks Carian Pantas
create index if not exists idx_coa_partners_agent_code on public.coa_partners(agent_code);
create index if not exists idx_coa_partners_status on public.coa_partners(status);

-- 3. Aktifkan Row Level Security (RLS)
alter table public.coa_partners enable row level security;

-- 4. Polisi Keselamatan (RLS Policies)

-- A. Membenarkan capaian umum membaca data rakan ejen (untuk semakan pendaftaran kod unik & paparan co-branded landing page)
drop policy if exists "Allow public read for agent verification" on public.coa_partners;
create policy "Allow public read for agent verification"
  on public.coa_partners for select
  using (true);

-- B. Membenarkan ejen memasukkan rekod profil sendiri semasa pendaftaran
drop policy if exists "Allow user insert own profile" on public.coa_partners;
create policy "Allow user insert own profile"
  on public.coa_partners for insert
  with check (auth.uid() = id);

-- C. Membenarkan ejen mengemaskini maklumat profil mereka sendiri
drop policy if exists "Allow user update own profile" on public.coa_partners;
create policy "Allow user update own profile"
  on public.coa_partners for update
  using (auth.uid() = id);

-- D. Membenarkan Superadmin (Zaim Rosli) menguruskan semua rekod (luluskan / tolak / padam)
drop policy if exists "Allow superadmin full access" on public.coa_partners;
create policy "Allow superadmin full access"
  on public.coa_partners for all
  using (auth.email() = 'huzaimrosli@gmail.com');

-- 5. Trigger untuk auto-kemaskini updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_set_timestamp on public.coa_partners;
create trigger trigger_set_timestamp
  before update on public.coa_partners
  for each row
  execute function public.handle_updated_at();
