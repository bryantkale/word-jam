create table if not exists public.word_lookups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  word text not null,
  pronunciation text,
  part_of_speech text,
  definition text not null,
  examples text[] not null default '{}',
  looked_up_at timestamptz not null default now()
);

create index if not exists word_lookups_user_looked_up_at_idx
  on public.word_lookups (user_id, looked_up_at desc);

alter table public.word_lookups enable row level security;

grant select, insert on public.word_lookups to authenticated;
revoke all on public.word_lookups from anon;

drop policy if exists "Users can read their own word lookups" on public.word_lookups;
drop policy if exists "Users can add their own word lookups" on public.word_lookups;

create policy "Users can read their own word lookups"
  on public.word_lookups for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), true) = false
  );

create policy "Users can add their own word lookups"
  on public.word_lookups for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), true) = false
  );
