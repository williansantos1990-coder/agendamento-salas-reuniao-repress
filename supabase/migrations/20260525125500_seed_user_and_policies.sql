DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Seed test user
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'willian.santos1990@gmail.com') THEN
    new_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'willian.santos1990@gmail.com',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "Willian Santos"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );

    INSERT INTO public.profiles (id, full_name, updated_at)
    VALUES (new_user_id, 'Willian Santos', NOW())
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  END IF;
END $$;

-- Ensure RLS policies for meetings table
DROP POLICY IF EXISTS "Anyone can view meetings" ON public.meetings;
CREATE POLICY "Anyone can view meetings" ON public.meetings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert their own meetings" ON public.meetings;
CREATE POLICY "Users can insert their own meetings" ON public.meetings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own meetings" ON public.meetings;
CREATE POLICY "Users can update their own meetings" ON public.meetings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own meetings" ON public.meetings;
CREATE POLICY "Users can delete their own meetings" ON public.meetings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create dummy rooms if none exist to allow testing right away
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.rooms WHERE name = 'Sala Alpha') THEN
    INSERT INTO public.rooms (name, capacity, location, description)
    VALUES ('Sala Alpha', 10, 'Andar 1', 'Sala com projetor e quadro branco');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.rooms WHERE name = 'Sala Beta') THEN
    INSERT INTO public.rooms (name, capacity, location, description)
    VALUES ('Sala Beta', 4, 'Andar 1', 'Sala para reuniões rápidas');
  END IF;
END $$;
