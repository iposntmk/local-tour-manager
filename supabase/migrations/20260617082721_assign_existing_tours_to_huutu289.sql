-- Gán các tour hiện có cho HDV huutu289@gmail.com.
-- Không thay đổi logic gán HDV cho tour tạo/sửa sau migration này.
DO $$
DECLARE
  v_guide_id UUID;
  v_guide_name TEXT;
  v_updated_count INTEGER;
BEGIN
  SELECT
    id,
    COALESCE(NULLIF(BTRIM(full_name), ''), email)
  INTO v_guide_id, v_guide_name
  FROM public.user_profiles
  WHERE lower(email) = lower('huutu289@gmail.com')
    AND settlement_role = 'guide'
    AND status = 'active'
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_guide_id IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy HDV active với email huutu289@gmail.com trong user_profiles.';
  END IF;

  UPDATE public.tours
  SET
    guide_id = v_guide_id,
    guide_name_at_booking = v_guide_name,
    updated_at = NOW()
  WHERE id IS NOT NULL
    AND (
      guide_id IS DISTINCT FROM v_guide_id
      OR guide_name_at_booking IS DISTINCT FROM v_guide_name
    );

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Đã gán % tour hiện có cho HDV % (%).', v_updated_count, v_guide_name, v_guide_id;
END $$;
