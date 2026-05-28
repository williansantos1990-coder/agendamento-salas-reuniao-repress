ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS image_url TEXT;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('room-images', 'room-images', true) 
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can read room images" ON storage.objects;
CREATE POLICY "Anyone can read room images" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'room-images');

DROP POLICY IF EXISTS "Admins can insert room images" ON storage.objects;
CREATE POLICY "Admins can insert room images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'room-images' AND EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Admins can update room images" ON storage.objects;
CREATE POLICY "Admins can update room images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'room-images' AND EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Admins can delete room images" ON storage.objects;
CREATE POLICY "Admins can delete room images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'room-images' AND EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.rooms WHERE name = 'Sala 2') THEN
    UPDATE public.rooms SET image_url = 'src/assets/sala2-358f3.jpg' WHERE name = 'Sala 2';
  ELSE
    INSERT INTO public.rooms (name, capacity, image_url) VALUES ('Sala 2', 4, 'src/assets/sala2-358f3.jpg');
  END IF;
END $$;
