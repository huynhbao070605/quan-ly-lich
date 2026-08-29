$ErrorActionPreference = 'Stop'

$migrationPath = Join-Path $PSScriptRoot '..\migrations\202608200004_profile_bootstrap.sql'

if (-not (Test-Path $migrationPath)) {
  throw 'Profile bootstrap migration is missing.'
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

Assert-MigrationPattern `
  '(?s)create function public\.handle_new_user\(\).*?security definer.*?set search_path = public, auth' `
  'Profile bootstrap must use a security definer function with a fixed search path.'
Assert-MigrationPattern `
  '(?s)insert into public\.profiles \(id, display_name, email\).*?new\.raw_user_meta_data\s*->>\s*''full_name''.*?new\.email' `
  'Profile bootstrap must retain the auth user ID, full name, and email.'
Assert-MigrationPattern `
  '(?s)insert into public\.user_settings \(user_id, theme, default_priority, week_start\).*?''system''.*?''MEDIUM''.*?1' `
  'Profile bootstrap must create system theme, MEDIUM priority, and Monday week start defaults.'
Assert-MigrationPattern `
  '(?s)create trigger on_auth_user_created\s+after insert on auth\.users\s+for each row execute function public\.handle_new_user\(\);' `
  'New auth users must invoke the profile bootstrap trigger.'

Write-Output 'Static profile bootstrap audit passed.'
