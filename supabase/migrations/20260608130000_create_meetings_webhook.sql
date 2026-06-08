CREATE OR REPLACE FUNCTION public.handle_meeting_webhook()
RETURNS trigger AS $$
DECLARE
    webhook_url TEXT := 'https://gefezoevwnjartjcriie.supabase.co/functions/v1/send-meeting-notification';
    payload JSONB;
    has_net BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.routines 
        WHERE routine_schema = 'net' AND routine_name = 'http_post'
    ) INTO has_net;

    IF has_net THEN
        payload := jsonb_build_object(
            'type', TG_OP,
            'table', TG_TABLE_NAME,
            'schema', TG_TABLE_SCHEMA,
            'record', row_to_json(NEW),
            'old_record', row_to_json(OLD)
        );

        PERFORM net.http_post(
            url := webhook_url,
            headers := '{"Content-Type": "application/json"}'::jsonb,
            body := payload
        );
    END IF;

    RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
    -- Fallback to not breaking the transaction on network/webhook errors
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_meeting_webhook ON public.meetings;
CREATE TRIGGER on_meeting_webhook
AFTER INSERT OR UPDATE OR DELETE ON public.meetings
FOR EACH ROW EXECUTE FUNCTION public.handle_meeting_webhook();
