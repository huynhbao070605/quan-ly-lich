$ErrorActionPreference = 'Stop'

$migrationPath = Join-Path $PSScriptRoot '..\migrations\202608200002_rls_policies.sql'
if (-not (Test-Path $migrationPath)) {
  throw "RLS migration is missing: $migrationPath"
}

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

$tables = @(
  'profiles',
  'projects',
  'tags',
  'tasks',
  'task_tags',
  'subtasks',
  'task_reminders',
  'task_recurrences',
  'notifications',
  'user_settings'
)

foreach ($table in $tables) {
  Assert-MigrationPattern `
    "alter table public\.$table enable row level security;" `
    "RLS must be enabled on public.$table."
}

$directOwnershipTables = @(
  'projects',
  'tags',
  'tasks',
  'task_reminders',
  'task_recurrences',
  'notifications',
  'user_settings'
)

foreach ($table in $directOwnershipTables) {
  Assert-MigrationPattern `
    "(?s)create policy `"${table}_owner`" on public\.$table.*?to authenticated.*?using \(\(select auth\.uid\(\)\) = user_id\).*?with check \(\(select auth\.uid\(\)\) = user_id\)" `
    "public.$table must enforce authenticated user_id ownership for reads and writes."
}

Assert-MigrationPattern `
  '(?s)create policy "profiles_owner" on public\.profiles.*?to authenticated.*?using \(\(select auth\.uid\(\)\) = id\).*?with check \(\(select auth\.uid\(\)\) = id\)' `
  'Profiles must enforce authenticated id ownership for reads and writes.'

foreach ($table in @('task_tags', 'subtasks', 'task_recurrences')) {
  Assert-MigrationPattern `
    "(?s)create policy `"${table}_task_owner`" on public\.$table.*?exists \(.*?from public\.tasks.*?\(select auth\.uid\(\)\) = tasks\.user_id" `
    "public.$table must verify ownership through its parent task."
}

Write-Output 'Static RLS policy audit passed.'
