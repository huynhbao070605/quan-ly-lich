-- DEFERRED DB RUNTIME VERIFICATION:
-- Run against a real Supabase/PostgreSQL database after Docker/Supabase local is available.

select to_regclass('public.recurrence_series') is not null as recurrence_series_exists;
select to_regclass('public.task_recurrences') is null as legacy_task_recurrences_dropped;

select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'tasks'
  and column_name in (
    'recurrence_series_id',
    'occurrence_start_at',
    'recurrence_exception'
  )
order by column_name;

select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'tasks'
  and indexname = 'tasks_recurrence_series_occurrence_start_at_key';

select
  schemaname,
  tablename,
  policyname
from pg_policies
where schemaname = 'public'
  and tablename = 'recurrence_series'
  and policyname = 'recurrence_series_owner';
