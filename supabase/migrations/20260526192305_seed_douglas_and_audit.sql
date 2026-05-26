DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Seed test user douglas.manoel
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'douglas.manoel@repress.com.br') THEN
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
      'douglas.manoel@repress.com.br',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "Douglas Manoel"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );

    INSERT INTO public.profiles (id, full_name, updated_at)
    VALUES (new_user_id, 'Douglas Manoel', NOW())
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    meeting_id UUID NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_logs;
CREATE POLICY "Users can view their own audit logs" ON public.audit_logs
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_meeting_audit()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (user_id, action, meeting_id, details)
        VALUES (
            NEW.user_id,
            'CREATE_MEETING',
            NEW.id,
            jsonb_build_object('title', NEW.title, 'room_id', NEW.room_id, 'start_time', NEW.start_time, 'end_time', NEW.end_time)
        );
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (user_id, action, meeting_id, details)
        VALUES (
            OLD.user_id,
            'CANCEL_MEETING',
            OLD.id,
            jsonb_build_object('title', OLD.title, 'room_id', OLD.room_id, 'start_time', OLD.start_time, 'end_time', OLD.end_time)
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_meeting_insert_audit ON public.meetings;
CREATE TRIGGER on_meeting_insert_audit
    AFTER INSERT ON public.meetings
    FOR EACH ROW EXECUTE FUNCTION public.handle_meeting_audit();

DROP TRIGGER IF EXISTS on_meeting_delete_audit ON public.meetings;
CREATE TRIGGER on_meeting_delete_audit
    AFTER DELETE ON public.meetings
    FOR EACH ROW EXECUTE FUNCTION public.handle_meeting_audit();
