create or replace function public.remove_task_focus(p_task_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_focus_date date;
  v_remaining_task_ids uuid[];
begin
  select focus_date
  into v_focus_date
  from public.tasks
  where id = p_task_id
    and user_id = (select auth.uid());

  if not found then
    raise exception 'Task not found or not owned by current user.';
  end if;

  if v_focus_date is null then
    return;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended((select auth.uid())::text || ':' || v_focus_date::text, 0)
  );

  update public.tasks
  set
    focus_date = null,
    focus_position = null
  where id = p_task_id
    and user_id = (select auth.uid())
    and focus_date = v_focus_date;

  if not found then
    raise exception 'Task focus changed while it was being removed.';
  end if;

  select coalesce(array_agg(id order by focus_position), '{}'::uuid[])
  into v_remaining_task_ids
  from public.tasks
  where user_id = (select auth.uid())
    and focus_date = v_focus_date;

  update public.tasks
  set
    focus_date = null,
    focus_position = null
  where user_id = (select auth.uid())
    and focus_date = v_focus_date;

  update public.tasks as tasks
  set
    focus_date = v_focus_date,
    focus_position = ordered.position
  from (
    select task_id, ordinality::integer as position
    from unnest(v_remaining_task_ids) with ordinality as remaining(task_id, ordinality)
  ) as ordered
  where tasks.id = ordered.task_id
    and tasks.user_id = (select auth.uid());
end;
$$;
