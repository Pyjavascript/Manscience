-- Messages sent from the /contact form. Anyone (signed in or not) can
-- submit; nobody can read them through the public API. Safe to run more than once.
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 200),
  email text not null check (char_length(email) between 3 and 320),
  phone text not null check (char_length(phone) between 7 and 30),
  message text not null check (char_length(message) between 10 and 2000),
  status text not null default 'new',
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

drop policy if exists "Anyone can send a contact message" on public.contact_messages;
create policy "Anyone can send a contact message"
  on public.contact_messages
  for insert
  to anon, authenticated
  with check (true);
