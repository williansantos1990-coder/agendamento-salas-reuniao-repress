DO $$
DECLARE
  v_room_id uuid := gen_random_uuid();
  v_user_id uuid := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'gil.araujo@repress.com.br') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'gil.araujo@repress.com.br',
      crypt('Skip@Pass123!', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "Gil Araujo"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (v_user_id, 'gil.araujo@repress.com.br', 'Gil Araujo', 'admin')
    ON CONFLICT (id) DO NOTHING;
  ELSE
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'gil.araujo@repress.com.br' LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.rooms WHERE name = 'Sala Outlook') THEN
    INSERT INTO public.rooms (id, name, capacity, location, description)
    VALUES (v_room_id, 'Sala Outlook', 15, 'Andar 3', 'Sala inspirada no design da Microsoft')
    ON CONFLICT (id) DO NOTHING;
  ELSE
    SELECT id INTO v_room_id FROM public.rooms WHERE name = 'Sala Outlook' LIMIT 1;
  END IF;

  INSERT INTO public.meetings (id, title, description, start_time, end_time, room_id, user_id)
  VALUES 
    (gen_random_uuid(), 'Reunião de Planejamento', 'Planejamento do sprint', NOW() + interval '1 day' + interval '9 hours', NOW() + interval '1 day' + interval '10 hours', v_room_id, v_user_id),
    (gen_random_uuid(), 'Revisão de Metas', 'Revisar OKRs', NOW() + interval '2 days' + interval '14 hours', NOW() + interval '2 days' + interval '15 hours', v_room_id, v_user_id),
    (gen_random_uuid(), 'Design Review', 'Apresentar novos mockups', NOW() - interval '1 day' + interval '11 hours', NOW() - interval '1 day' + interval '12 hours', v_room_id, v_user_id)
  ON CONFLICT (id) DO NOTHING;
END $$;
