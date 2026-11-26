-- Basic details collected on the first step of the roadmap
-- (name already lives in users.name). Safe to run more than once.
alter table public.users
  add column if not exists gender text,
  add column if not exists age smallint,
  add column if not exists location text;

alter table public.users
  drop constraint if exists users_age_range;

alter table public.users
  add constraint users_age_range check (age is null or age between 1 and 120);
