$ErrorActionPreference = 'Stop'

$migrationDir = Join-Path $PSScriptRoot '..\migrations'
$allMigrations = (
  Get-ChildItem $migrationDir -Filter '*.sql' |
    Sort-Object Name |
    ForEach-Object { Get-Content -Raw $_.FullName }
) -join "`n"
$overdueFixMigrationPath = Join-Path $migrationDir '202608260001_fix_overdue_notifications_missing_settings.sql'
$overdueFixMigration = Get-Content -Raw $overdueFixMigrationPath

function Assert-MigrationPattern {
  param(
    [string]$Pattern,
    [string]$Message
  )

  if ($allMigrations -notmatch $Pattern) {
    throw $Message
  }
}

function Assert-TextPattern {
  param(
    [string]$Text,
    [string]$Pattern,
    [string]$Message
  )

  if ($Text -notmatch $Pattern) {
    throw $Message
  }
}

function Assert-TextNotPattern {
  param(
    [string]$Text,
    [string]$Pattern,
    [string]$Message
  )

  if ($Text -match $Pattern) {
    throw $Message
  }
}

Assert-MigrationPattern `
  'alter table public\.notifications\s+add column dedupe_key text' `
  'notifications must have a dedupe_key for idempotent jobs.'
Assert-MigrationPattern `
  '(?s)create unique index notifications_user_dedupe_key_unique.*?on public\.notifications \(user_id, dedupe_key\).*?where dedupe_key is not null' `
  'notifications must have a partial unique index on user_id and dedupe_key.'
Assert-MigrationPattern `
  '(?s)insert into public\.user_settings\s*\(\s*user_id\s*\).*?from auth\.users.*?on conflict \(user_id\) do nothing' `
  'Notification jobs must backfill user_settings for users that existed before the settings trigger.'

foreach ($fn in @(
  'process_due_reminders',
  'process_due_today_notifications',
  'process_overdue_notifications',
  'process_recurring_occurrences'
)) {
  Assert-MigrationPattern `
    "create or replace function public\.$fn\(\)" `
    "Missing public.$fn()."
}

Assert-MigrationPattern `
  '(?s)process_due_reminders\(\).*?notify_reminder = true.*?for update.*?skip locked.*?on conflict \(user_id, dedupe_key\) where dedupe_key is not null do nothing' `
  'Reminder job must lock batches, honor settings, and dedupe inserts.'
Assert-MigrationPattern `
  "(?s)process_due_today_notifications\(\).*?Asia/Ho_Chi_Minh.*?notify_due_today = true.*?Bạn có 3 công việc đến hạn hôm nay|(?s)process_due_today_notifications\(\).*?Asia/Ho_Chi_Minh.*?notify_due_today = true.*?Bạn có '"`
  'Due-today job must use Vietnam local date, honor settings, and produce the Vietnamese aggregate message.'
Assert-MigrationPattern `
  '(?s)process_overdue_notifications\(\).*?notify_overdue = true.*?OVERDUE.*?on conflict \(user_id, dedupe_key\) where dedupe_key is not null do nothing' `
  'Overdue job must honor settings and dedupe per task occurrence.'
Assert-MigrationPattern `
  '(?s)process_overdue_notifications\(\).*?left join public\.user_settings.*?coalesce\(s\.notify_overdue, true\) = true.*?OVERDUE.*?on conflict \(user_id, dedupe_key\) where dedupe_key is not null do nothing' `
  'Overdue job must still process existing users whose user_settings row is missing while honoring explicit opt-out rows.'
Assert-TextPattern `
  $overdueFixMigration `
  "(?s)'Công việc quá hạn'.*?'Đã quá hạn: ' \|\| title" `
  'Overdue notification migration must use uncorrupted Vietnamese title and message.'
Assert-TextPattern `
  $overdueFixMigration `
  "(?s)Asia/Ho_Chi_Minh.*?v_today_start.*?t\.all_day = true.*?t\.due_at < v_today_start.*?t\.all_day = false.*?t\.due_at < now\(\)" `
  'Overdue job must treat all-day due dates as overdue only after the Vietnam due date ends.'
Assert-TextPattern `
  $overdueFixMigration `
  'revoke all on function public\.process_overdue_notifications\(\) from authenticated' `
  'Overdue background job must revoke authenticated execution.'
Assert-TextPattern `
  $overdueFixMigration `
  'grant execute on function public\.process_overdue_notifications\(\) to postgres' `
  'Overdue background job must grant only the cron owner role needed by the current architecture.'
Assert-TextNotPattern `
  $overdueFixMigration `
  'grant execute on function public\.process_overdue_notifications\(\) to authenticated' `
  'Overdue background job must not grant execution to ordinary authenticated clients.'
Assert-MigrationPattern `
  '(?s)process_recurring_occurrences\(\).*?recurrence_series.*?on conflict \(recurrence_series_id, occurrence_start_at\).*?do nothing.*?RECURRING_CREATED' `
  'Recurring job must materialize occurrences idempotently and create recurring notifications.'

Assert-MigrationPattern `
  'create extension if not exists pg_cron with schema extensions' `
  'Cron migration must enable pg_cron.'
foreach ($job in @(
  'task-reminder-processor',
  'task-due-today-processor',
  'task-recurrence-processor'
)) {
  Assert-MigrationPattern `
    "cron\.schedule\(\s*'$job'" `
    "Missing cron schedule $job."
}

Write-Output 'Static notification jobs and cron audit passed.'
