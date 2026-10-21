-- Research Digest blogs ticked as "needs fixing" in the admin dashboard.
-- A row means the Webflow blog item with that id needs fixing; deleting the row clears it.
create table if not exists public.blog_fix_flags (
  blog_id text primary key,
  created_at timestamptz not null default now()
);

alter table public.blog_fix_flags enable row level security;

-- The dashboard talks to Supabase with the public key, like the other admin tables.
create policy "Dashboard can manage blog fix flags"
  on public.blog_fix_flags
  for all
  to anon, authenticated
  using (true)
  with check (true);
