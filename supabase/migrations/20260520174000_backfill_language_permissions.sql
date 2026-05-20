UPDATE public.user_profiles
SET permissions = ARRAY(
  SELECT DISTINCT permission
  FROM unnest(
    COALESCE(permissions, ARRAY[]::TEXT[]) ||
    CASE
      WHEN permissions && ARRAY['view_master_data','view_guides']::TEXT[] THEN ARRAY['view_languages']::TEXT[]
      ELSE ARRAY[]::TEXT[]
    END ||
    CASE
      WHEN permissions && ARRAY['edit_master_data','create_guides']::TEXT[] THEN ARRAY['create_languages']::TEXT[]
      ELSE ARRAY[]::TEXT[]
    END ||
    CASE
      WHEN permissions && ARRAY['edit_master_data','edit_guides']::TEXT[] THEN ARRAY['edit_languages']::TEXT[]
      ELSE ARRAY[]::TEXT[]
    END ||
    CASE
      WHEN permissions && ARRAY['delete_master_data','delete_guides']::TEXT[] THEN ARRAY['delete_languages']::TEXT[]
      ELSE ARRAY[]::TEXT[]
    END ||
    CASE
      WHEN permissions && ARRAY['import_guides']::TEXT[] THEN ARRAY['import_languages']::TEXT[]
      ELSE ARRAY[]::TEXT[]
    END ||
    CASE
      WHEN permissions && ARRAY['export_guides']::TEXT[] THEN ARRAY['export_languages']::TEXT[]
      ELSE ARRAY[]::TEXT[]
    END
  ) AS permission
)
WHERE permissions IS NOT NULL
  AND permissions && ARRAY[
    'view_master_data',
    'edit_master_data',
    'delete_master_data',
    'view_guides',
    'create_guides',
    'edit_guides',
    'delete_guides',
    'import_guides',
    'export_guides'
  ]::TEXT[];
