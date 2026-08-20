create type public.task_status as enum ('TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED');
create type public.task_priority as enum ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
create type public.notification_type as enum ('REMINDER', 'DUE_TODAY', 'OVERDUE', 'RECURRING_CREATED');
create type public.recurrence_frequency as enum ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  avatar_url text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  color text,
  icon text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  color text,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  description text,
  status public.task_status not null default 'TODO',
  priority public.task_priority not null default 'MEDIUM',
  start_at timestamptz,
  due_at timestamptz,
  all_day boolean not null default false,
  important boolean not null default false,
  urgent boolean not null default false,
  eisenhower_override boolean not null default false,
  focus_date date,
  focus_position integer,
  kanban_position numeric not null default 0,
  recurrence_id uuid,
  recurrence_instance_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recurrence_id, recurrence_instance_at)
);

create table public.task_tags (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (task_id, tag_id)
);

create table public.subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  completed boolean not null default false,
  position numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  offset_minutes integer not null check (offset_minutes >= 0),
  remind_at timestamptz not null,
  triggered_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.task_recurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  root_task_id uuid not null references public.tasks(id) on delete cascade,
  frequency public.recurrence_frequency not null,
  interval integer not null default 1 check (interval >= 1),
  weekdays smallint[],
  month_day smallint check (month_day between 1 and 31),
  ends_at timestamptz,
  next_occurrence_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks
  add constraint tasks_recurrence_id_fkey
  foreign key (recurrence_id)
  references public.task_recurrences(id)
  on delete set null;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  type public.notification_type not null,
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  default_priority public.task_priority not null default 'MEDIUM',
  default_reminder_offsets_minutes integer[] not null default '{}',
  week_start smallint not null default 1 check (week_start in (0, 1)),
  default_task_view text not null default 'list',
  notify_reminder boolean not null default true,
  notify_due_today boolean not null default true,
  notify_overdue boolean not null default true,
  notify_recurring boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_user_id_status_idx on public.tasks (user_id, status);
create index tasks_user_id_due_at_idx on public.tasks (user_id, due_at);
create index tasks_user_id_project_id_idx on public.tasks (user_id, project_id);
create index notifications_user_id_read_at_created_at_idx
  on public.notifications (user_id, read_at, created_at desc);
create index task_reminders_pending_idx
  on public.task_reminders (user_id, remind_at)
  where triggered_at is null;

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create trigger subtasks_set_updated_at
before update on public.subtasks
for each row execute function public.set_updated_at();

create trigger task_recurrences_set_updated_at
before update on public.task_recurrences
for each row execute function public.set_updated_at();

create trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();
