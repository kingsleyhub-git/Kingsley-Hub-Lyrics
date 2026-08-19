CREATE POLICY "own audio files" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'audio' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "own render files" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'renders' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'renders' AND auth.uid()::text = (storage.foldername(name))[1]);