-- Add denormalized warning flag columns to tours table
-- These allow the list view to show warnings without fetching all sub-collections
ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS has_zero_price BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_duplicate_dest_names BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS missing_water_expense BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_unpaid_commission BOOLEAN NOT NULL DEFAULT false;

-- Add CTP (allowance total) as a denormalized column for fast list display
ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS allowance_total NUMERIC NOT NULL DEFAULT 0;

-- Backfill existing tours with computed warning flags and allowance_total
-- has_zero_price: any destination/expense/meal/allowance with price = 0
UPDATE public.tours t SET has_zero_price = sub.has_zero
FROM (
  SELECT td.tour_id, true AS has_zero
  FROM public.tour_destinations td WHERE td.price = 0
  UNION
  SELECT te.tour_id, true AS has_zero
  FROM public.tour_expenses te WHERE te.price = 0
  UNION
  SELECT tm.tour_id, true AS has_zero
  FROM public.tour_meals tm WHERE tm.price = 0
  UNION
  SELECT ta.tour_id, true AS has_zero
  FROM public.tour_allowances ta WHERE ta.price = 0
) sub
WHERE t.id = sub.tour_id AND t.has_zero_price = false;

-- has_duplicate_dest_names: two+ destinations on same tour with same trimmed lowercase name
UPDATE public.tours t SET has_duplicate_dest_names = true
WHERE EXISTS (
  SELECT 1 FROM public.tour_destinations td
  WHERE td.tour_id = t.id
  GROUP BY td.tour_id, LOWER(TRIM(td.name))
  HAVING COUNT(*) > 1
);

-- missing_water_expense: no water expense and not dismissed
UPDATE public.tours t SET missing_water_expense = true
WHERE t.water_warning_dismissed = false
  AND NOT EXISTS (
    SELECT 1 FROM public.tour_expenses te
    WHERE te.tour_id = t.id
      AND LOWER(TRIM(te.name)) IN (
        'nước uống cho khách 10k/1 khách / 1 ngày',
        'nước uống cho khách 15k/1 khách / 1 ngày'
      )
  );

-- has_unpaid_commission: any shopping with net_commission > total payments
UPDATE public.tours t SET has_unpaid_commission = true
WHERE EXISTS (
  SELECT 1 FROM public.tour_shoppings ts
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(scp.amount), 0) AS paid FROM public.shopping_commission_payments scp
    WHERE scp.tour_shopping_id = ts.id
  ) p ON true
  WHERE ts.tour_id = t.id
    AND ts.price > 0
    AND COALESCE(ts.net_commission, ts.price) > p.paid
);

-- allowance_total: sum of (price * quantity) for all allowances
UPDATE public.tours t SET allowance_total = COALESCE(sub.total, 0)
FROM (
  SELECT ta.tour_id, SUM(ta.price * ta.quantity) AS total
  FROM public.tour_allowances ta
  GROUP BY ta.tour_id
) sub
WHERE t.id = sub.tour_id;
