-- Roadmaps are now stored in user_roadmap_results (one row per user), but
-- practitioner_roadmap_assignments.roadmap_id still pointed at the old
-- user_roadmap_mapped table. Any user whose roadmap only exists in the new
-- table could not be assigned to a practitioner (foreign key violation).
-- Safe to run more than once.

do $$
declare
  fk_name text;
begin
  for fk_name in
    select conname
    from pg_constraint
    where conrelid = 'public.practitioner_roadmap_assignments'::regclass
      and contype = 'f'
      and confrelid = 'public.user_roadmap_mapped'::regclass
  loop
    execute format(
      'alter table public.practitioner_roadmap_assignments drop constraint %I',
      fk_name
    );
  end loop;
end $$;

alter table public.practitioner_roadmap_assignments
  drop constraint if exists practitioner_roadmap_assignments_roadmap_id_fkey;

-- user_roadmap_results.user_id is text, so roadmap_id has to match it.
-- Existing uuid values convert to their usual text form.
alter table public.practitioner_roadmap_assignments
  alter column roadmap_id type text using roadmap_id::text;

-- NOT VALID skips checking existing assignments, which may reference
-- roadmaps that were never copied to the new table; new rows are checked.
alter table public.practitioner_roadmap_assignments
  add constraint practitioner_roadmap_assignments_roadmap_id_fkey
  foreign key (roadmap_id)
  references public.user_roadmap_results (user_id)
  on delete cascade
  not valid;
