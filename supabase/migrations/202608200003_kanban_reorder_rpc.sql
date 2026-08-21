create or replace function public.reorder_kanban_column(
  p_status public.task_status,
  p_task_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_task_id uuid;
  v_position integer := 0;
begin
  foreach v_task_id in array p_task_ids loop
    update public.tasks
    set
      status = p_status,
      kanban_position = v_position,
      completed_at = case
        when p_status = 'DONE' then coalesce(completed_at, now())
        else null
      end
    where id = v_task_id
      and user_id = (select auth.uid());

    if not found then
      raise exception 'Task not found or not owned by current user.';
    end if;

    v_position := v_position + 1;
  end loop;
end;
$$;

create or replace function public.move_kanban_task(
  p_task_id uuid,
  p_target_status public.task_status,
  p_source_task_ids uuid[],
  p_target_task_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_task_id uuid;
  v_position integer := 0;
begin
  if not p_task_id = any(p_target_task_ids) then
    raise exception 'Moved task must be present in target order.';
  end if;

  foreach v_task_id in array p_source_task_ids loop
    update public.tasks
    set kanban_position = v_position
    where id = v_task_id
      and user_id = (select auth.uid());

    if not found then
      raise exception 'Source task not found or not owned by current user.';
    end if;

    v_position := v_position + 1;
  end loop;

  v_position := 0;

  foreach v_task_id in array p_target_task_ids loop
    update public.tasks
    set
      status = p_target_status,
      kanban_position = v_position,
      completed_at = case
        when p_target_status = 'DONE' then coalesce(completed_at, now())
        else null
      end
    where id = v_task_id
      and user_id = (select auth.uid());

    if not found then
      raise exception 'Target task not found or not owned by current user.';
    end if;

    v_position := v_position + 1;
  end loop;
end;
$$;
