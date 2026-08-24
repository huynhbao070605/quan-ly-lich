-- DEFERRED DB RUNTIME VERIFICATION:
-- Run against a real Supabase/PostgreSQL database after Docker/Supabase local is available.

select public.process_due_reminders();
select public.process_due_today_notifications();
select public.process_overdue_notifications();
select public.process_recurring_occurrences();

select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'notifications'
  and indexname = 'notifications_user_dedupe_key_unique';
