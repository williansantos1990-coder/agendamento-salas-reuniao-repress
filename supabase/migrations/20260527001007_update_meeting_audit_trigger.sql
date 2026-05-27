-- Update handle_meeting_audit to include participants in the details JSON payload
-- This ensures the Edge Function (when triggered via webhook on audit_logs) receives the full list of participants.

CREATE OR REPLACE FUNCTION public.handle_meeting_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (user_id, action, meeting_id, details)
        VALUES (
            NEW.user_id,
            'CREATE_MEETING',
            NEW.id,
            jsonb_build_object(
              'title', NEW.title, 
              'room_id', NEW.room_id, 
              'start_time', NEW.start_time, 
              'end_time', NEW.end_time,
              'participants', NEW.participants
            )
        );
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (user_id, action, meeting_id, details)
        VALUES (
            OLD.user_id,
            'CANCEL_MEETING',
            OLD.id,
            jsonb_build_object(
              'title', OLD.title, 
              'room_id', OLD.room_id, 
              'start_time', OLD.start_time, 
              'end_time', OLD.end_time,
              'participants', OLD.participants
            )
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;
