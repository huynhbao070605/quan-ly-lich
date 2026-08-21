alter table public.tasks
  add constraint tasks_focus_fields_consistent
  check (
    (focus_date is null and focus_position is null)
    or (
      focus_date is not null
      and focus_position is not null
      and focus_position between 1 and 3
    )
  );

create unique index tasks_user_focus_position_unique
  on public.tasks (user_id, focus_date, focus_position)
  where focus_date is not null;

create or replace function public.set_task_focus(
  p_task_id uuid,
  p_focus_date date,
  p_focus_position integer
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_focus_position not between 1 and 3 then
    raise exception 'Focus position must be between 1 and 3.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended((select auth.uid())::text || ':' || p_focus_date::text, 0)
  );

  update public.tasks
  set
    focus_date = p_focus_date,
    focus_position = p_focus_position
  where id = p_task_id
    and user_id = (select auth.uid());

  if not found then
    raise exception 'Task not found or not owned by current user.';
  end if;
end;
$$;

create or replace function public.remove_task_focus(p_task_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.tasks
  set
    focus_date = null,
    focus_position = null
  where id = p_task_id
    and user_id = (select auth.uid());

  if not found then
    raise exception 'Task not found or not owned by current user.';
  end if;
end;
$$;

create or replace function public.reorder_task_focus(
  p_focus_date date,
  p_task_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_existing_ids uuid[];
begin
  if cardinality(p_task_ids) > 3 then
    raise exception 'A day can contain at most three focus tasks.';
  end if;

  if cardinality(p_task_ids) <> (
    select count(distinct task_id)
    from unnest(p_task_ids) as submitted(task_id)
  ) then
    raise exception 'Focus task IDs must be unique.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended((select auth.uid())::text || ':' || p_focus_date::text, 0)
  );

  select coalesce(array_agg(id order by focus_position), '{}'::uuid[])
  into v_existing_ids
  from public.tasks
  where user_id = (select auth.uid())
    and focus_date = p_focus_date;

  if cardinality(v_existing_ids) <> cardinality(p_task_ids)
    or exists (
      select task_id from unnest(v_existing_ids) as existing(task_id)
      except
      select task_id from unnest(p_task_ids) as submitted(task_id)
    ) then
    raise exception 'Submitted tasks do not match the current focus set.';
  end if;

  update public.tasks
  set
    focus_date = null,
    focus_position = null
  where user_id = (select auth.uid())
    and focus_date = p_focus_date;

  update public.tasks as tasks
  set
    focus_date = p_focus_date,
    focus_position = ordered.position
  from (
    select task_id, ordinality::integer as position
    from unnest(p_task_ids) with ordinality as submitted(task_id, ordinality)
  ) as ordered
  where tasks.id = ordered.task_id
    and tasks.user_id = (select auth.uid());
end;
$$;

create or replace function public.sync_task_tags(
  p_task_id uuid,
  p_tag_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.tasks
    where id = p_task_id
      and user_id = (select auth.uid())
  ) then
    raise exception 'Task not found or not owned by current user.';
  end if;

  if cardinality(p_tag_ids) <> (
    select count(distinct id)
    from public.tags
    where id = any(p_tag_ids)
      and user_id = (select auth.uid())
  ) then
    raise exception 'Tag not found or not owned by current user.';
  end if;

  delete from public.task_tags
  where task_id = p_task_id;

  insert into public.task_tags (task_id, tag_id)
  select p_task_id, tag_id
  from unnest(p_tag_ids) as selected(tag_id);
end;
$$;

revoke all on function public.set_task_focus(uuid, date, integer) from public;
revoke all on function public.remove_task_focus(uuid) from public;
revoke all on function public.reorder_task_focus(date, uuid[]) from public;
revoke all on function public.sync_task_tags(uuid, uuid[]) from public;

grant execute on function public.set_task_focus(uuid, date, integer) to authenticated;
grant execute on function public.remove_task_focus(uuid) to authenticated;
grant execute on function public.reorder_task_focus(date, uuid[]) to authenticated;
grant execute on function public.sync_task_tags(uuid, uuid[]) to authenticated;
