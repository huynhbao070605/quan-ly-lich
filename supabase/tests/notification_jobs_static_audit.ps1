$ErrorActionPreference = 'Stop'

$migrationDir = Join-Path $PSScriptRoot '..\migrations'
$allMigrations = (
  Get-ChildItem $migrationDir -Filter '*.sql' |
    Sort-Object Name |
    ForEach-Object { Get-Content -Raw $_.FullName }
) -join "`n"

function Assert-MigrationPattern {
  param(
    [string]$Pattern,
    [string]$Message
  )

  if ($allMigrations -notmatch $Pattern) {
    throw $Message
  }
}

Assert-MigrationPattern `
  'alter table public\.notifications\s+add column dedupe_key text' `
  'notifications must have a dedupe_key for idempotent jobs.'
Assert-MigrationPattern `
  '(?s)create unique index notifications_user_dedupe_key_unique.*?on public\.notifications \(user_id, dedupe_key\).*?where dedupe_key is not null' `
  'notifications must have a partial unique index on user_id and dedupe_key.'

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
