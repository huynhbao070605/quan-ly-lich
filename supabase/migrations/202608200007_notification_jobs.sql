alter table public.notifications
  add column dedupe_key text;

create unique index notifications_user_dedupe_key_unique
  on public.notifications (user_id, dedupe_key)
  where dedupe_key is not null;

create or replace function public.process_due_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_processed integer;
begin
  with due_reminders as (
    select
      r.id,
      r.user_id,
      r.task_id,
      r.remind_at,
      coalesce(t.title, 'Công việc') as task_title
    from public.task_reminders r
    join public.user_settings s
      on s.user_id = r.user_id
    left join public.tasks t
      on t.id = r.task_id
     and t.user_id = r.user_id
    where r.remind_at <= now()
      and r.triggered_at is null
      and s.notify_reminder = true
    order by r.remind_at
    limit 100
    for update of r skip locked
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
      task_id,
      'REMINDER',
      'Nhắc việc',
      'Đến hạn: ' || task_title,
      'reminder:' || id::text
    from due_reminders
    on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing
    returning dedupe_key
  ),
  updated as (
    update public.task_reminders r
    set triggered_at = now()
    from due_reminders d
    where r.id = d.id
    returning r.id
  )
  select count(*) into v_processed from updated;

  return v_processed;
end;
$$;

create or replace function public.process_due_today_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_start timestamptz := v_today::timestamp at time zone 'Asia/Ho_Chi_Minh';
  v_end timestamptz := (v_today + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh';
  v_inserted integer;
begin
  with due_counts as (
    select
      t.user_id,
      count(*)::integer as task_count
    from public.tasks t
    join public.user_settings s
      on s.user_id = t.user_id
    where t.due_at >= v_start
      and t.due_at < v_end
      and t.status not in ('DONE', 'CANCELLED')
      and s.notify_due_today = true
    group by t.user_id
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
      null,
      'DUE_TODAY',
      'Công việc hôm nay',
      'Bạn có ' || task_count || ' công việc đến hạn hôm nay.',
      'due-today:' || user_id::text || ':' || v_today::text
    from due_counts
    where task_count > 0
    on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing
    returning id
  )
  select count(*) into v_inserted from inserted;

  return v_inserted;
end;
$$;

create or replace function public.process_overdue_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
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
    join public.user_settings s
      on s.user_id = t.user_id
    where t.due_at < now()
      and t.status not in ('DONE', 'CANCELLED')
      and s.notify_overdue = true
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

create or replace function public.process_recurring_occurrences()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer;
begin
  with latest_occurrences as (
    select distinct on (s.id)
      s.id as series_id,
      s.user_id,
      s.frequency,
      s.interval,
      s.ends_at,
      s.starts_at,
      t.id as source_task_id,
      t.project_id,
      t.title,
      t.description,
      t.status,
      t.priority,
      t.start_at,
      t.due_at,
      t.all_day,
      t.important,
      t.urgent,
      coalesce(t.occurrence_start_at, s.starts_at) as occurrence_start_at
    from public.recurrence_series s
    join public.tasks t
      on t.recurrence_series_id = s.id
     and t.user_id = s.user_id
    where t.recurrence_exception = false
    order by s.id, t.occurrence_start_at desc nulls last, t.created_at desc
  ),
  candidates as (
    select
      latest_occurrences.*,
      case frequency
        when 'DAILY' then occurrence_start_at + (interval || ' days')::interval
        when 'WEEKLY' then occurrence_start_at + (interval || ' weeks')::interval
        when 'MONTHLY' then occurrence_start_at + (interval || ' months')::interval
        when 'YEARLY' then occurrence_start_at + (interval || ' years')::interval
      end as next_occurrence_start_at
    from latest_occurrences
  ),
  inserted_tasks as (
    insert into public.tasks (
      user_id,
      project_id,
      title,
      description,
      status,
      priority,
      start_at,
      due_at,
      all_day,
      important,
      urgent,
      eisenhower_override,
      recurrence_series_id,
      occurrence_start_at,
      recurrence_exception
    )
    select
      user_id,
      project_id,
      title,
      description,
      'TODO',
      priority,
      start_at + (next_occurrence_start_at - occurrence_start_at),
      due_at + (next_occurrence_start_at - occurrence_start_at),
      all_day,
      important,
      urgent,
      false,
      series_id,
      next_occurrence_start_at,
      false
    from candidates
    where next_occurrence_start_at <= now() + interval '14 days'
      and (ends_at is null or next_occurrence_start_at <= ends_at)
    on conflict (recurrence_series_id, occurrence_start_at)
      where recurrence_series_id is not null and occurrence_start_at is not null
      do nothing
    returning id, user_id, title
  ),
  inserted_notifications as (
    insert into public.notifications (
      user_id,
      task_id,
      type,
      title,
      message,
      dedupe_key
    )
    select
      t.user_id,
      t.id,
      'RECURRING_CREATED',
      'Đã tạo công việc lặp lại',
      'Đã tạo: ' || t.title,
      'recurring-created:' || t.id::text
    from inserted_tasks t
    join public.user_settings s
      on s.user_id = t.user_id
    where s.notify_recurring = true
    on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing
    returning id
  )
  select count(*) into v_inserted from inserted_tasks;

  return v_inserted;
end;
$$;

revoke all on function public.process_due_reminders() from public;
revoke all on function public.process_due_today_notifications() from public;
revoke all on function public.process_overdue_notifications() from public;
revoke all on function public.process_recurring_occurrences() from public;

grant execute on function public.process_due_reminders() to authenticated;
grant execute on function public.process_due_today_notifications() to authenticated;
grant execute on function public.process_overdue_notifications() to authenticated;
grant execute on function public.process_recurring_occurrences() to authenticated;
