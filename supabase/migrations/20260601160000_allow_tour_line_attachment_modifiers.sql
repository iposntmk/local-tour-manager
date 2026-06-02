-- Let users who can modify a tour manage its per-line evidence attachments.

DROP POLICY IF EXISTS tour_line_attachments_insert ON public.tour_line_attachments;
DROP POLICY IF EXISTS tour_line_attachments_delete ON public.tour_line_attachments;

CREATE POLICY tour_line_attachments_insert
  ON public.tour_line_attachments
  FOR INSERT TO authenticated
  WITH CHECK (public.can_modify_tour(tour_id));

CREATE POLICY tour_line_attachments_delete
  ON public.tour_line_attachments
  FOR DELETE TO authenticated
  USING (public.can_modify_tour(tour_id));

DROP POLICY IF EXISTS tour_line_attachments_storage_insert ON storage.objects;
DROP POLICY IF EXISTS tour_line_attachments_storage_update ON storage.objects;
DROP POLICY IF EXISTS tour_line_attachments_storage_delete ON storage.objects;

CREATE POLICY tour_line_attachments_storage_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tour-line-attachments'
    AND public.can_modify_tour(public.storage_path_tour_id(name))
  );

CREATE POLICY tour_line_attachments_storage_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'tour-line-attachments'
    AND public.can_modify_tour(public.storage_path_tour_id(name))
  )
  WITH CHECK (
    bucket_id = 'tour-line-attachments'
    AND public.can_modify_tour(public.storage_path_tour_id(name))
  );

CREATE POLICY tour_line_attachments_storage_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'tour-line-attachments'
    AND public.can_modify_tour(public.storage_path_tour_id(name))
  );
