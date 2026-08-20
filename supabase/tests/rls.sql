begin;

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'rls-user-a@example.com',
    'not-used-by-test',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'rls-user-b@example.com',
    'not-used-by-test',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}'
  )
on conflict (id) do update
set email = excluded.email;

select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-1111-1111-111111111111',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

do $$
declare
  task_a_id uuid;
begin
  insert into public.tasks (user_id, title)
  values ('11111111-1111-1111-1111-111111111111', 'Task of user A')
  returning id into task_a_id;

  if task_a_id is null then
    raise exception 'User A must be able to insert their own task.';
  end if;

  perform set_config(
    'request.jwt.claim.sub',
    '22222222-2222-2222-2222-222222222222',
    true
  );
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  if exists (select 1 from public.tasks where id = task_a_id) then
    raise exception 'User B must not be able to select user A task.';
  end if;

  update public.tasks
  set title = 'User B attempted update'
  where id = task_a_id;

  if found then
    raise exception 'User B must not be able to update user A task.';
  end if;

  delete from public.tasks where id = task_a_id;

  if found then
    raise exception 'User B must not be able to delete user A task.';
  end if;

  begin
    insert into public.tasks (user_id, title)
    values ('11111111-1111-1111-1111-111111111111', 'Forged owner task');
    raise exception 'User B must not be able to insert a task for user A.';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

rollback;
