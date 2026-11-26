-- Roadmap details now ask for state and country (dropdowns) instead of a
-- free-text location. Phone reuses the existing users.phone column.
-- The old location column is kept for earlier answers. Safe to run more than once.
alter table public.users
  add column if not exists country text,
  add column if not exists state text;
