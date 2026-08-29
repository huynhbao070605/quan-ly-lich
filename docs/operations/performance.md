# Performance sanity notes

## Current V1 safeguards

- Task list and search queries are server-filtered by `user_id` and route filters.
- Task list and search return the first 50 rows by default via Supabase `.range(0, 49)`.
- Dashboard summary uses the shared task data and keeps the upcoming list capped to 5 items in memory.
- Notification reads are expected to use `notifications_user_id_read_at_created_at_idx`.

## Expected database indexes

- `tasks_user_id_status_idx` for status dashboards and list filters.
- `tasks_user_id_due_at_idx` for today, upcoming, overdue, calendar and plan views.
- `tasks_user_id_project_id_idx` for project task lists.
- `notifications_user_id_read_at_created_at_idx` for unread/recent notification views.

## Deferred live database measurements

Status: **DEFERRED LIVE DB/RLS VERIFICATION**.

Local Supabase/Docker is disabled on this machine. The following checks must be run against a safe live or local Supabase environment before release:

1. Seed or fixture at least 2,000 tasks for one test user.
2. Confirm first task list page returns only 50 rows.
3. Run `EXPLAIN ANALYZE` for task-by-user/due/status queries.
4. Run `EXPLAIN ANALYZE` for search filters used by the task list.
5. Run `EXPLAIN ANALYZE` for notification unread/recent query.
6. Confirm RLS still blocks cross-user reads and writes while using the indexed plans.

Do not report these live database measurements as passed until they have been executed in an environment where Supabase database access is intentionally enabled.
