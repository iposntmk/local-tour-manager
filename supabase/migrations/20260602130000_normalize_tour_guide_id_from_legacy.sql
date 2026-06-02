-- Fix tour creation/update failing with FK violation on tours_guide_id_fkey.
--
-- Root cause: 20260602100000_merge_guides_into_user_profiles repointed
-- tours.guide_id to reference user_profiles(id), but the app's guide picker
-- still reads the legacy public.guides table and sends a legacy guides.id.
-- That legacy id only survives as user_profiles.legacy_guide_id, never as
-- user_profiles.id, so every insert/update with a guide selected raises
-- "insert or update on table tours violates foreign key constraint
-- tours_guide_id_fkey" (SQLSTATE 23503).
--
-- This trigger bridges the gap server-side: when guide_id is not a known
-- user_profiles.id, it maps it through legacy_guide_id to the canonical
-- profile id. If no mapping exists (a legacy guide that never became a user),
-- it preserves guide_name_at_booking and clears the broken reference -- the
-- same graceful degradation the merge migration applied to existing rows.

CREATE OR REPLACE FUNCTION public.normalize_tour_guide_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  v_mapped_id UUID;
  v_mapped_name TEXT;
BEGIN
  IF NEW.guide_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Already a canonical profile id: nothing to do.
  IF EXISTS (SELECT 1 FROM public.user_profiles WHERE id = NEW.guide_id) THEN
    RETURN NEW;
  END IF;

  -- Try to translate a legacy guides.id into the merged profile id.
  SELECT id, full_name
    INTO v_mapped_id, v_mapped_name
  FROM public.user_profiles
  WHERE legacy_guide_id = NEW.guide_id
  LIMIT 1;

  IF v_mapped_id IS NOT NULL THEN
    IF COALESCE(NEW.guide_name_at_booking, '') = '' THEN
      NEW.guide_name_at_booking := COALESCE(v_mapped_name, '');
    END IF;
    NEW.guide_id := v_mapped_id;
    RETURN NEW;
  END IF;

  -- No matching profile: keep the historical name, drop the broken reference.
  IF COALESCE(NEW.guide_name_at_booking, '') = ''
     AND to_regclass('public.guides') IS NOT NULL THEN
    SELECT name INTO NEW.guide_name_at_booking
    FROM public.guides
    WHERE id = NEW.guide_id;
  END IF;

  NEW.guide_id := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_tour_guide_id ON public.tours;
CREATE TRIGGER trg_normalize_tour_guide_id
  BEFORE INSERT OR UPDATE OF guide_id ON public.tours
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_tour_guide_id();
