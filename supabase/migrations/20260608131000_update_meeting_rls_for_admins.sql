DO $$
BEGIN
  -- Drop existing update/delete policies on meetings
  DROP POLICY IF EXISTS "authenticated_update_meetings" ON public.meetings;
  DROP POLICY IF EXISTS "authenticated_delete_meetings" ON public.meetings;

  -- Create new update policy allowing creator OR admin
  CREATE POLICY "authenticated_update_meetings" ON public.meetings
    FOR UPDATE TO authenticated
    USING (
      user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
      user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

  -- Create new delete policy allowing creator OR admin
  CREATE POLICY "authenticated_delete_meetings" ON public.meetings
    FOR DELETE TO authenticated
    USING (
      user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
END $$;
