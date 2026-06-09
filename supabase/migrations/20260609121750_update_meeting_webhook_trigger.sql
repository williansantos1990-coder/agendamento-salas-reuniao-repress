DROP TRIGGER IF EXISTS on_meeting_webhook ON public.meetings;

CREATE TRIGGER on_meeting_webhook
AFTER UPDATE ON public.meetings
FOR EACH ROW EXECUTE FUNCTION public.handle_meeting_webhook();
