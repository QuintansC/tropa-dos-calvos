create extension if not exists pgcrypto;

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  recommender text not null,
  mood text not null check (mood in ('Debate forte', 'Leitura leve', 'Clássico', 'Surpresa')),
  reason text not null,
  is_read boolean not null default false,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.recommendations
add column if not exists is_read boolean not null default false;

create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  suggested_by text not null,
  pages integer check (pages is null or pages > 0),
  pitch text not null,
  votes integer not null default 1 check (votes >= 0),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.draw_history (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  discord_handle text not null default '',
  favorite_genre text not null default '',
  reading_style text not null default '',
  bio text not null default '',
  points integer not null default 0 check (points >= 0),
  streak integer not null default 0 check (streak >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reading_cycles (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid references public.recommendations(id) on delete set null,
  book_title text not null,
  book_author text not null,
  starts_on date,
  meeting_frequency text check (meeting_frequency in ('Semanal', 'Quinzenal', 'Mensal')),
  meeting_day text,
  weekly_goal_pages integer check (weekly_goal_pages is null or weekly_goal_pages > 0),
  reminder_day text,
  reminder_time text not null default '20:00',
  motivation_reward text not null default 'Check-in semanal vale pontos para o ranking',
  status text not null default 'planning' check (status in ('planning', 'active', 'finished')),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  configured_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.reading_cycles
add column if not exists starts_on date,
add column if not exists configured_at timestamptz;

alter table public.reading_cycles
alter column meeting_frequency drop not null,
alter column meeting_day drop not null,
alter column weekly_goal_pages drop not null,
alter column reminder_day drop not null,
alter column status set default 'planning';

alter table public.reading_cycles
drop constraint if exists reading_cycles_status_check;

alter table public.reading_cycles
add constraint reading_cycles_status_check
check (status in ('planning', 'active', 'finished'));

create table if not exists public.reading_checkins (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.reading_cycles(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pages_read integer not null check (pages_read >= 0),
  note text not null default '',
  points_awarded integer not null default 10 check (points_awarded >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.reading_participants (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.reading_cycles(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (cycle_id, user_id)
);

create unique index if not exists recommendations_title_author_unique
on public.recommendations (title, author);

create unique index if not exists suggestions_title_author_unique
on public.suggestions (title, author);

alter table public.recommendations enable row level security;
alter table public.suggestions enable row level security;
alter table public.members enable row level security;
alter table public.draw_history enable row level security;
alter table public.profiles enable row level security;
alter table public.reading_cycles enable row level security;
alter table public.reading_checkins enable row level security;
alter table public.reading_participants enable row level security;

drop policy if exists "public read recommendations" on public.recommendations;
drop policy if exists "public insert recommendations" on public.recommendations;
drop policy if exists "public delete recommendations" on public.recommendations;
drop policy if exists "authenticated read recommendations" on public.recommendations;
drop policy if exists "authenticated insert recommendations" on public.recommendations;
drop policy if exists "authenticated update recommendations" on public.recommendations;
drop policy if exists "authenticated delete recommendations" on public.recommendations;

create policy "authenticated read recommendations"
on public.recommendations for select
to authenticated
using (true);

create policy "authenticated insert recommendations"
on public.recommendations for insert
to authenticated
with check (created_by = auth.uid());

create policy "authenticated update recommendations"
on public.recommendations for update
to authenticated
using (true)
with check (true);

create policy "authenticated delete recommendations"
on public.recommendations for delete
to authenticated
using (true);

drop policy if exists "public read suggestions" on public.suggestions;
drop policy if exists "public insert suggestions" on public.suggestions;
drop policy if exists "public update suggestions" on public.suggestions;
drop policy if exists "public delete suggestions" on public.suggestions;
drop policy if exists "authenticated read suggestions" on public.suggestions;
drop policy if exists "authenticated insert suggestions" on public.suggestions;
drop policy if exists "authenticated update suggestions" on public.suggestions;
drop policy if exists "authenticated delete suggestions" on public.suggestions;

create policy "authenticated read suggestions"
on public.suggestions for select
to authenticated
using (true);

create policy "authenticated insert suggestions"
on public.suggestions for insert
to authenticated
with check (created_by = auth.uid());

create policy "authenticated update suggestions"
on public.suggestions for update
to authenticated
using (true)
with check (true);

create policy "authenticated delete suggestions"
on public.suggestions for delete
to authenticated
using (true);

drop policy if exists "public read members" on public.members;
drop policy if exists "public insert members" on public.members;
drop policy if exists "public delete members" on public.members;
drop policy if exists "authenticated read members" on public.members;
drop policy if exists "authenticated insert members" on public.members;
drop policy if exists "authenticated delete members" on public.members;

create policy "authenticated read members"
on public.members for select
to authenticated
using (true);

create policy "authenticated insert members"
on public.members for insert
to authenticated
with check (created_by = auth.uid());

create policy "authenticated delete members"
on public.members for delete
to authenticated
using (true);

drop policy if exists "public read draw history" on public.draw_history;
drop policy if exists "public insert draw history" on public.draw_history;
drop policy if exists "authenticated read draw history" on public.draw_history;
drop policy if exists "authenticated insert draw history" on public.draw_history;

create policy "authenticated read draw history"
on public.draw_history for select
to authenticated
using (true);

create policy "authenticated insert draw history"
on public.draw_history for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "authenticated read profiles" on public.profiles;
drop policy if exists "authenticated insert own profile" on public.profiles;
drop policy if exists "authenticated update own profile" on public.profiles;

create policy "authenticated read profiles"
on public.profiles for select
to authenticated
using (true);

create policy "authenticated insert own profile"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy "authenticated update own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "authenticated read reading cycles" on public.reading_cycles;
drop policy if exists "authenticated insert reading cycles" on public.reading_cycles;
drop policy if exists "authenticated update reading cycles" on public.reading_cycles;

create policy "authenticated read reading cycles"
on public.reading_cycles for select
to authenticated
using (true);

create policy "authenticated insert reading cycles"
on public.reading_cycles for insert
to authenticated
with check (created_by = auth.uid());

create policy "authenticated update reading cycles"
on public.reading_cycles for update
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated read reading checkins" on public.reading_checkins;
drop policy if exists "authenticated insert own reading checkins" on public.reading_checkins;

create policy "authenticated read reading checkins"
on public.reading_checkins for select
to authenticated
using (true);

create policy "authenticated insert own reading checkins"
on public.reading_checkins for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "authenticated read reading participants" on public.reading_participants;
drop policy if exists "authenticated insert own reading participants" on public.reading_participants;
drop policy if exists "authenticated delete own reading participants" on public.reading_participants;

create policy "authenticated read reading participants"
on public.reading_participants for select
to authenticated
using (true);

create policy "authenticated insert own reading participants"
on public.reading_participants for insert
to authenticated
with check (user_id = auth.uid());

create policy "authenticated delete own reading participants"
on public.reading_participants for delete
to authenticated
using (user_id = auth.uid());

create or replace function public.increment_suggestion_vote(target_id uuid)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.suggestions
  set votes = votes + 1
  where id = target_id;
$$;
