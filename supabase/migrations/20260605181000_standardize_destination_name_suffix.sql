-- Backfill tourist destination names to "vé_<destination>_<province>".
WITH source_rows AS (
  SELECT
    id,
    btrim(name) AS raw_name,
    btrim(coalesce(province_name_at_booking, '')) AS province_name
  FROM public.tourist_destinations
),
without_prefix AS (
  SELECT
    id,
    province_name,
    CASE
      WHEN lower(raw_name) LIKE 'vé\_%' ESCAPE '\' THEN btrim(substr(raw_name, char_length('vé_') + 1))
      ELSE raw_name
    END AS base_name
  FROM source_rows
),
without_suffix AS (
  SELECT
    id,
    province_name,
    CASE
      WHEN province_name <> ''
        AND right(lower(base_name), char_length('_' || province_name)) = lower('_' || province_name)
        THEN btrim(left(base_name, greatest(char_length(base_name) - char_length('_' || province_name), 0)))
      ELSE btrim(base_name)
    END AS base_name
  FROM without_prefix
),
normalized AS (
  SELECT
    id,
    CASE
      WHEN base_name <> '' AND province_name <> '' THEN 'vé_' || base_name || '_' || province_name
      WHEN base_name <> '' THEN 'vé_' || base_name
      WHEN province_name <> '' THEN 'vé_' || province_name
      ELSE 'vé_'
    END AS normalized_name
  FROM without_suffix
)
UPDATE public.tourist_destinations AS td
SET name = normalized.normalized_name
FROM normalized
WHERE td.id = normalized.id
  AND td.name IS DISTINCT FROM normalized.normalized_name;
