insert into public.user_settings (user_id)
select u.id
from auth.users as u
where not exists (
  select 1
  from public.user_settings as s
  where s.user_id = u.id
)
on conflict (user_id) do nothing;

create or replace function public.process_overdue_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_today_start timestamptz := v_today::timestamp at time zone 'Asia/Ho_Chi_Minh';
  v_inserted integer;
begin
  with overdue_tasks as (
    select
      t.id,
      t.user_id,
      t.title,
      coalesce(
        'overdue:' || t.recurrence_series_id::text || ':' || t.occurrence_start_at::text,
        'overdue:' || t.id::text
      ) as dedupe_key
    from public.tasks t
    left join public.user_settings s
      on s.user_id = t.user_id
    where t.due_at is not null
      and (
        (t.all_day = true and t.due_at < v_today_start)
        or (t.all_day = false and t.due_at < now())
      )
      and t.status in ('TODO', 'IN_PROGRESS')
      and coalesce(s.notify_overdue, true) = true
  ),
  inserted as (
    insert into public.notifications (
      user_id,
      task_id,
      type,
      title,
      message,
      dedupe_key
    )
    select
      user_id,
      id,
      'OVERDUE',
      'Công việc quá hạn',
      'Đã quá hạn: ' || title,
      dedupe_key
    from overdue_tasks
    on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing
    returning id
  )
  select count(*) into v_inserted from inserted;

  return v_inserted;
end;
$$;

revoke all on function public.process_overdue_notifications() from public;
revoke all on function public.process_overdue_notifications() from anon;
revoke all on function public.process_overdue_notifications() from authenticated;
grant execute on function public.process_overdue_notifications() to postgres;
