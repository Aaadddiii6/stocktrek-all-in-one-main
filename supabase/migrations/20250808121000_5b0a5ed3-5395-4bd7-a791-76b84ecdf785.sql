-- Update activity_logs to reference profiles table instead of auth.users
ALTER TABLE public.activity_logs 
DROP CONSTRAINT activity_logs_user_id_fkey;

ALTER TABLE public.activity_logs 
ADD CONSTRAINT activity_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;