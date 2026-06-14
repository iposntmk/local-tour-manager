CREATE OR REPLACE FUNCTION public.refresh_tour_unpaid_commission_warning(p_tour UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.tours t
  SET has_unpaid_commission = EXISTS (
    SELECT 1
    FROM public.tour_shoppings ts
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(scp.amount), 0) AS paid
      FROM public.shopping_commission_payments scp
      WHERE scp.tour_shopping_id = ts.id
    ) payments ON true
    WHERE ts.tour_id = p_tour
      AND COALESCE(ts.net_commission, ts.price - COALESCE(ts.pit_amount, 0), ts.price, 0) > 0
      AND payments.paid < COALESCE(ts.net_commission, ts.price - COALESCE(ts.pit_amount, 0), ts.price, 0)
  )
  WHERE t.id = p_tour;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_tour_unpaid_commission_warning_from_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  old_tour UUID;
  new_tour UUID;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    SELECT tour_id INTO old_tour
    FROM public.tour_shoppings
    WHERE id = OLD.tour_shopping_id;

    IF old_tour IS NOT NULL THEN
      PERFORM public.refresh_tour_unpaid_commission_warning(old_tour);
    END IF;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT tour_id INTO new_tour
    FROM public.tour_shoppings
    WHERE id = NEW.tour_shopping_id;

    IF new_tour IS NOT NULL AND new_tour IS DISTINCT FROM old_tour THEN
      PERFORM public.refresh_tour_unpaid_commission_warning(new_tour);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_tour_unpaid_commission_warning_from_shopping()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.tour_id IS NOT NULL THEN
      PERFORM public.refresh_tour_unpaid_commission_warning(NEW.tour_id);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.tour_id IS NOT NULL THEN
      PERFORM public.refresh_tour_unpaid_commission_warning(OLD.tour_id);
    END IF;
    IF NEW.tour_id IS NOT NULL AND NEW.tour_id IS DISTINCT FROM OLD.tour_id THEN
      PERFORM public.refresh_tour_unpaid_commission_warning(NEW.tour_id);
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.tour_id IS NOT NULL THEN
    PERFORM public.refresh_tour_unpaid_commission_warning(OLD.tour_id);
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS refresh_tour_unpaid_commission_warning_on_payment
  ON public.shopping_commission_payments;
CREATE TRIGGER refresh_tour_unpaid_commission_warning_on_payment
  AFTER INSERT OR UPDATE OR DELETE
  ON public.shopping_commission_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_tour_unpaid_commission_warning_from_payment();

DROP TRIGGER IF EXISTS refresh_tour_unpaid_commission_warning_on_shopping
  ON public.tour_shoppings;
CREATE TRIGGER refresh_tour_unpaid_commission_warning_on_shopping
  AFTER INSERT OR UPDATE OF tour_id, price, pit_amount, net_commission OR DELETE
  ON public.tour_shoppings
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_tour_unpaid_commission_warning_from_shopping();

UPDATE public.tours t
SET has_unpaid_commission = EXISTS (
  SELECT 1
  FROM public.tour_shoppings ts
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(scp.amount), 0) AS paid
    FROM public.shopping_commission_payments scp
    WHERE scp.tour_shopping_id = ts.id
  ) payments ON true
  WHERE ts.tour_id = t.id
    AND COALESCE(ts.net_commission, ts.price - COALESCE(ts.pit_amount, 0), ts.price, 0) > 0
    AND payments.paid < COALESCE(ts.net_commission, ts.price - COALESCE(ts.pit_amount, 0), ts.price, 0)
);
