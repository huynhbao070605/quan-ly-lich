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
