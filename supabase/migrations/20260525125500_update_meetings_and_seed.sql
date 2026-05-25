-- 1. Add Foreign Key Relationship
ALTER TABLE public.meetings DROP CONSTRAINT IF EXISTS meetings_profile_id_fkey;
ALTER TABLE public.meetings ADD CONSTRAINT meetings_profile_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Refine RLS Policies for meetings
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view meetings" ON public.meetings;
DROP POLICY IF EXISTS "Users can delete their own meetings" ON public.meetings;
DROP POLICY IF EXISTS "Users can insert their own meetings" ON public.meetings;
DROP POLICY IF EXISTS "Users can update their own meetings" ON public.meetings;
DROP POLICY IF EXISTS "authenticated_select_meetings" ON public.meetings;
DROP POLICY IF EXISTS "authenticated_insert_meetings" ON public.meetings;
DROP POLICY IF EXISTS "authenticated_update_meetings" ON public.meetings;
DROP POLICY IF EXISTS "authenticated_delete_meetings" ON public.meetings;

CREATE POLICY "authenticated_select_meetings" ON public.meetings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_insert_meetings" ON public.meetings
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "authenticated_update_meetings" ON public.meetings
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "authenticated_delete_meetings" ON public.meetings
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 3. Seed Users
DO $$
DECLARE
  admin_user_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  test_user_id uuid := '00000000-0000-0000-0000-000000000002'::uuid;
BEGIN
  -- Seed admin user
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'gil.araujo@repress.com.br') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      admin_user_id,
      '00000000-0000-0000-0000-000000000000',
      'gil.araujo@repress.com.br',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "Gil Araujo"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );
  END IF;

  -- Ensure profile exists and is updated for admin
  INSERT INTO public.profiles (id, full_name, avatar_url, updated_at)
  VALUES (
    COALESCE((SELECT id FROM auth.users WHERE email = 'gil.araujo@repress.com.br'), admin_user_id),
    'Gil Araujo',
    NULL,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  -- Seed test user
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'willian.santos1990@gmail.com') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      test_user_id,
      '00000000-0000-0000-0000-000000000000',
      'willian.santos1990@gmail.com',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "Willian Santos"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );
  END IF;

  -- Ensure profile exists and is updated for test user
  INSERT INTO public.profiles (id, full_name, avatar_url, updated_at)
  VALUES (
    COALESCE((SELECT id FROM auth.users WHERE email = 'willian.santos1990@gmail.com'), test_user_id),
    'Willian Santos',
    NULL,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  
END $$;
