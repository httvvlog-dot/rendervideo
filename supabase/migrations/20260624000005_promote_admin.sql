-- Promote the specified user to admin
update public.profiles
set role = 'admin'
where email = 'acc792003@gmail.com';

-- Remove the old mock admin from auth.users (this cascades to profiles)
delete from auth.users where email = 'admin@taovideo.com';
