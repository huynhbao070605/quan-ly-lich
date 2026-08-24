# Supabase Cron Operations

Plan 03 cron jobs are defined in `supabase/migrations/202608200006_cron_schedule.sql`.

Runtime verification is a DEFERRED DB RUNTIME VERIFICATION on this machine because local Supabase/Docker is disabled.

When a real Supabase database is available, verify schedules with:

```sql
select * from cron.job;
select * from cron.job_run_details order by start_time desc limit 20;
```

Expected jobs:

- `task-reminder-processor`: every 5 minutes.
- `task-due-today-processor`: daily at 00:00 UTC, 07:00 Asia/Ho_Chi_Minh.
- `task-recurrence-processor`: hourly at minute 7.
