alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.tags enable row level security;
alter table public.tasks enable row level security;
alter table public.task_tags enable row level security;
alter table public.subtasks enable row level security;
alter table public.task_reminders enable row level security;
alter table public.task_recurrences enable row level security;
alter table public.notifications enable row level security;
alter table public.user_settings enable row level security;

create policy "profiles_owner" on public.profiles
  for all
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "projects_owner" on public.projects
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "tags_owner" on public.tags
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "tasks_owner" on public.tasks
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "task_reminders_owner" on public.task_reminders
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "task_recurrences_owner" on public.task_recurrences
  for all
  to authenticated
  using (
    (select auth.uid()) = user_id
    and (
      root_task_id is null
      or exists (
        select 1
        from public.tasks
        where tasks.id = task_recurrences.root_task_id
          and (select auth.uid()) = tasks.user_id
      )
    )
  )
  with check (
    (select auth.uid()) = user_id
    and (
      root_task_id is null
      or exists (
        select 1
        from public.tasks
        where tasks.id = task_recurrences.root_task_id
          and (select auth.uid()) = tasks.user_id
      )
    )
  );

create policy "notifications_owner" on public.notifications
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "user_settings_owner" on public.user_settings
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "task_tags_task_owner" on public.task_tags
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.tasks
      where tasks.id = task_tags.task_id
        and (select auth.uid()) = tasks.user_id
    )
  )
  with check (
    exists (
      select 1
      from public.tasks
      where tasks.id = task_tags.task_id
        and (select auth.uid()) = tasks.user_id
    )
  );

create policy "subtasks_task_owner" on public.subtasks
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.tasks
      where tasks.id = subtasks.task_id
        and (select auth.uid()) = tasks.user_id
    )
  )
  with check (
    exists (
      select 1
      from public.tasks
      where tasks.id = subtasks.task_id
        and (select auth.uid()) = tasks.user_id
    )
  );
