create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    left(
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(split_part(new.email, '@', 1), ''),
        'Nguoi dung'
      ),
      80
    ),
    new.email
  );

  insert into public.user_settings (user_id, theme, default_priority, week_start)
  values (new.id, 'system', 'MEDIUM', 1);

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
