create extension if not exists pg_cron with schema extensions;

select cron.unschedule('task-reminder-processor')
where exists (
  select 1
  from cron.job
  where jobname = 'task-reminder-processor'
);

select cron.schedule(
  'task-reminder-processor',
  '*/5 * * * *',
  $$select public.process_due_reminders(); select public.process_overdue_notifications();$$
);

select cron.unschedule('task-due-today-processor')
where exists (
  select 1
  from cron.job
  where jobname = 'task-due-today-processor'
);

select cron.schedule(
  'task-due-today-processor',
  '0 0 * * *',
  $$select public.process_due_today_notifications();$$
);

select cron.unschedule('task-recurrence-processor')
where exists (
  select 1
  from cron.job
  where jobname = 'task-recurrence-processor'
);

select cron.schedule(
  'task-recurrence-processor',
  '7 * * * *',
  $$select public.process_recurring_occurrences();$$
);
