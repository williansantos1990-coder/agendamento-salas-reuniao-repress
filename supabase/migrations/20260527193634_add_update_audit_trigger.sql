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
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (user_id, action, meeting_id, details)
        VALUES (
            NEW.user_id,
            CASE WHEN NEW.recurrence_id IS NOT NULL THEN 'UPDATE_MEETING_SERIES' ELSE 'UPDATE_MEETING' END,
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_meeting_update_audit ON public.meetings;
CREATE TRIGGER on_meeting_update_audit
  AFTER UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.handle_meeting_audit();
