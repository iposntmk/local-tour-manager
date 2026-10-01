-- Quick-add checklist on the tour line tabs: returns the line names the current user
-- adds most often, ranked by the number of distinct tours they appear in.
--
-- Scope: tours the caller guides or created. When the caller has no history for the
-- requested line type, falls back to the system-wide ranking.
--
-- SECURITY DEFINER so the fallback can count across tours hidden by RLS; the function
-- only ever exposes a name and a count, never tour rows.

CREATE OR REPLACE FUNCTION public.get_frequent_tour_lines(
  p_line_type text,
  p_limit integer DEFAULT 30
)
RETURNS TABLE (name text, usage_count bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_table text;
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_table := CASE p_line_type
    WHEN 'destination' THEN 'tour_destinations'
    WHEN 'expense' THEN 'tour_expenses'
    WHEN 'meal' THEN 'tour_meals'
    WHEN 'allowance' THEN 'tour_allowances'
  END;

  IF v_table IS NULL THEN
    RAISE EXCEPTION 'Unsupported line type: %', p_line_type;
  END IF;

  RETURN QUERY EXECUTE format($q$
    WITH scoped AS (
      SELECT l.name AS line_name,
             l.tour_id,
             (t.guide_id = $1 OR t.created_by_user_id = $1) AS is_mine
      FROM public.%I l
      JOIN public.tours t ON t.id = l.tour_id
      WHERE btrim(COALESCE(l.name, '')) <> ''
    ),
    has_mine AS (
      SELECT EXISTS (SELECT 1 FROM scoped WHERE is_mine) AS v
    )
    SELECT max(btrim(s.line_name))::text, count(DISTINCT s.tour_id)
    FROM scoped s
    CROSS JOIN has_mine h
    WHERE COALESCE(s.is_mine, false) OR NOT h.v
    GROUP BY lower(btrim(s.line_name))
    ORDER BY 2 DESC, 1
    LIMIT $2
  $q$, v_table)
  USING v_uid, v_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.get_frequent_tour_lines(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_frequent_tour_lines(text, integer) TO authenticated;
