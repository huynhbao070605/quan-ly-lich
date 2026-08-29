create table public.recurrence_series (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_task_id uuid references public.tasks(id) on delete set null,
  frequency public.recurrence_frequency not null,
  interval integer not null default 1 check (interval >= 1),
  weekdays smallint[],
  month_day smallint check (month_day between 1 and 31),
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.recurrence_series (
  id,
  user_id,
  source_task_id,
  frequency,
  interval,
  weekdays,
  month_day,
  starts_at,
  ends_at,
  created_at,
  updated_at
)
select
  recurrence.id,
  recurrence.user_id,
  recurrence.root_task_id,
  recurrence.frequency,
  recurrence.interval,
  recurrence.weekdays,
  recurrence.month_day,
  coalesce(
    source_task.recurrence_instance_at,
    source_task.start_at,
    source_task.due_at,
    recurrence.next_occurrence_at,
    recurrence.created_at
  ) as starts_at,
  recurrence.ends_at,
  recurrence.created_at,
  recurrence.updated_at
from public.task_recurrences as recurrence
left join public.tasks as source_task
  on source_task.id = recurrence.root_task_id;

alter table public.tasks
  add column recurrence_series_id uuid references public.recurrence_series(id) on delete set null,
  add column occurrence_start_at timestamptz,
  add column recurrence_exception boolean not null default false;

update public.tasks
set
  recurrence_series_id = recurrence_id,
  occurrence_start_at = recurrence_instance_at
where recurrence_id is not null;

create unique index tasks_recurrence_series_occurrence_start_at_key
  on public.tasks (recurrence_series_id, occurrence_start_at)
  where recurrence_series_id is not null and occurrence_start_at is not null;

create index recurrence_series_user_id_starts_at_idx
  on public.recurrence_series (user_id, starts_at);

create trigger recurrence_series_set_updated_at
before update on public.recurrence_series
for each row execute function public.set_updated_at();

alter table public.recurrence_series enable row level security;

create policy "recurrence_series_owner" on public.recurrence_series
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter table public.tasks
  drop constraint if exists tasks_recurrence_id_fkey;

drop table public.task_recurrences;
