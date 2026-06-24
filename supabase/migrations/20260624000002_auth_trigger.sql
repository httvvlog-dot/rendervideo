-- Create a function to automatically insert a profile for a new user
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'user');
  return new;
end;
$$ language plpgsql security definer;

-- Create the trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Retroactively create profiles for existing users who don't have one (fixes the login issue for the manual user)
insert into public.profiles (id, email, role)
select id, email, 'user'
from auth.users
where id not in (select id from public.profiles)
on conflict do nothing;
