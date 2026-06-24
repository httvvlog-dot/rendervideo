-- Fix the infinite recursion caused by the previous Admin policy

-- 1. Drop the recursive policy
drop policy if exists "Admins can view all profiles" on public.profiles;

-- 2. Create a secure function to check admin status bypassing RLS
create or replace function public.is_admin()
returns boolean as $$
declare
  user_role text;
begin
  -- Using security definer allows this query to bypass RLS, breaking the infinite loop
  select role into user_role from public.profiles where id = auth.uid();
  return user_role = 'admin';
end;
$$ language plpgsql security definer set search_path = public;

-- 3. Create the new, safe policy
create policy "Admins can view all profiles"
  on public.profiles for select
  using ( public.is_admin() );
