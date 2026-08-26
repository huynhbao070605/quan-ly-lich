alter table public.user_settings
  alter column default_reminder_offsets_minutes set default array[1440, 0];

update public.user_settings
set default_reminder_offsets_minutes = array[1440, 0]
where default_reminder_offsets_minutes = '{}';
