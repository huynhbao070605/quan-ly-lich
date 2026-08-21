$ErrorActionPreference = 'Stop'

$migrationPath = Join-Path $PSScriptRoot '..\migrations\202608200001_initial_schema.sql'
$migration = Get-Content -Raw $migrationPath

function Assert-MigrationPattern {
  param(
    [string]$Pattern,
    [string]$Message
  )

  if ($migration -notmatch $Pattern) {
    throw $Message
  }
}

Assert-MigrationPattern `
  '(?s)create table public\.task_recurrences \(.*?root_task_id uuid references public\.tasks\(id\) on delete set null,' `
  'Recurring series must retain their record when the root task is deleted.'
Assert-MigrationPattern `
  '(?s)create table public\.task_recurrences \(.*?user_id uuid not null references auth\.users\(id\) on delete cascade,' `
  'Recurring series must be deleted when their owning user is deleted.'
Assert-MigrationPattern `
  '(?s)create table public\.tasks \(.*?user_id uuid not null references auth\.users\(id\) on delete cascade,' `
  'Tasks must be deleted when their owning user is deleted.'
Assert-MigrationPattern `
  '(?s)add constraint tasks_recurrence_id_fkey.*?references public\.task_recurrences\(id\).*?on delete set null;' `
  'Task occurrence links must only clear when a recurrence series is deleted.'

Write-Output 'Static recurrence deletion audit passed.'

$allMigrations = (
  Get-ChildItem (Join-Path $PSScriptRoot '..\migrations') -Filter '*.sql' |
    Sort-Object Name |
    ForEach-Object { Get-Content -Raw $_.FullName }
) -join "`n"
$removeFocusMatches = [regex]::Matches(
  $allMigrations,
  '(?s)create or replace function public\.remove_task_focus\(p_task_id uuid\).*?\$\$;'
)

if ($removeFocusMatches.Count -eq 0) {
  throw 'The remove_task_focus RPC must be defined.'
}

$removeFocusFunction = $removeFocusMatches[$removeFocusMatches.Count - 1].Value

if ($removeFocusFunction -notmatch 'pg_advisory_xact_lock') {
  throw 'Focus removal must lock the authenticated user and focus date.'
}
if ($removeFocusFunction -notmatch '(?s)array_agg\(id order by focus_position\).*?focus_date = null.*?unnest\(v_remaining_task_ids\) with ordinality') {
  throw 'Focus removal must compact remaining tasks to dense positions.'
}

Write-Output 'Static Focus removal compaction audit passed.'
