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
  '(?s)create table public\.recurrence_series \(.*?user_id uuid not null references auth\.users\(id\) on delete cascade.*?source_task_id uuid references public\.tasks\(id\) on delete set null.*?frequency public\.recurrence_frequency not null.*?starts_at timestamptz not null' `
  'recurrence_series must store owner, source task, frequency, and starts_at.'

Assert-MigrationPattern `
  '(?s)alter table public\.tasks.*?add column recurrence_series_id uuid references public\.recurrence_series\(id\) on delete set null.*?add column occurrence_start_at timestamptz.*?add column recurrence_exception boolean not null default false' `
  'tasks must include recurrence series identity, occurrence start, and exception marker.'

Assert-MigrationPattern `
  '(?s)create unique index tasks_recurrence_series_occurrence_start_at_key\s+on public\.tasks \(recurrence_series_id, occurrence_start_at\)\s+where recurrence_series_id is not null and occurrence_start_at is not null' `
  'recurring occurrences must be unique per series and occurrence start.'

Assert-MigrationPattern `
  '(?s)alter table public\.recurrence_series enable row level security;.*?create policy "recurrence_series_owner" on public\.recurrence_series.*?to authenticated.*?using \(\(select auth\.uid\(\)\) = user_id\).*?with check \(\(select auth\.uid\(\)\) = user_id\)' `
  'recurrence_series must enforce owner-only RLS.'

Assert-MigrationPattern `
  '(?s)insert into public\.recurrence_series.*?from public\.task_recurrences.*?drop table public\.task_recurrences' `
  'legacy task_recurrences rows must be copied before the table is dropped.'

Write-Output 'Static recurrence series schema audit passed.'
