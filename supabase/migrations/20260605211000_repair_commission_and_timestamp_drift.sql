-- Repair remote drift from commission payment validation and updated_at triggers.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shopping_commission_payments_amount_positive'
      AND conrelid = 'public.shopping_commission_payments'::regclass
  ) THEN
    ALTER TABLE public.shopping_commission_payments
      ADD CONSTRAINT shopping_commission_payments_amount_positive CHECK (amount > 0) NOT VALID;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.validate_shopping_commission_payment_total()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  expected_net NUMERIC;
  paid_total NUMERIC;
BEGIN
  SELECT COALESCE(ts.net_commission, ts.price - COALESCE(ts.pit_amount, 0), ts.price, 0)
    INTO expected_net
  FROM public.tour_shoppings ts
  WHERE ts.id = NEW.tour_shopping_id;

  IF expected_net IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy dòng mua sắm trên tour để ghi nhận hoa hồng.'
      USING ERRCODE = '23503';
  END IF;

  SELECT COALESCE(SUM(scp.amount), 0)
    INTO paid_total
  FROM public.shopping_commission_payments scp
  WHERE scp.tour_shopping_id = NEW.tour_shopping_id
    AND scp.id IS DISTINCT FROM NEW.id;

  IF paid_total + NEW.amount > expected_net THEN
    RAISE EXCEPTION 'Tổng số tiền đã nhận không được vượt quá hoa hồng thực nhận.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_shopping_commission_payment_total
  ON public.shopping_commission_payments;
CREATE TRIGGER validate_shopping_commission_payment_total
  BEFORE INSERT OR UPDATE OF tour_shopping_id, amount
  ON public.shopping_commission_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_shopping_commission_payment_total();

CREATE OR REPLACE FUNCTION public.validate_tour_shopping_commission_not_below_paid()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  expected_net NUMERIC;
  paid_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(scp.amount), 0)
    INTO paid_total
  FROM public.shopping_commission_payments scp
  WHERE scp.tour_shopping_id = NEW.id;

  expected_net := COALESCE(NEW.net_commission, NEW.price - COALESCE(NEW.pit_amount, 0), NEW.price, 0);

  IF paid_total > expected_net THEN
    RAISE EXCEPTION 'Tổng số tiền đã nhận không được vượt quá hoa hồng thực nhận.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_tour_shopping_commission_not_below_paid
  ON public.tour_shoppings;
CREATE TRIGGER validate_tour_shopping_commission_not_below_paid
  BEFORE UPDATE OF price, pit_amount, net_commission
  ON public.tour_shoppings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_tour_shopping_commission_not_below_paid();

DROP TRIGGER IF EXISTS update_guides_updated_at ON public.guides;
CREATE TRIGGER update_guides_updated_at
  BEFORE UPDATE ON public.guides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_nationalities_updated_at ON public.nationalities;
CREATE TRIGGER update_nationalities_updated_at
  BEFORE UPDATE ON public.nationalities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_provinces_updated_at ON public.provinces;
CREATE TRIGGER update_provinces_updated_at
  BEFORE UPDATE ON public.provinces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tourist_destinations_updated_at ON public.tourist_destinations;
CREATE TRIGGER update_tourist_destinations_updated_at
  BEFORE UPDATE ON public.tourist_destinations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_shoppings_updated_at ON public.shoppings;
CREATE TRIGGER update_shoppings_updated_at
  BEFORE UPDATE ON public.shoppings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_expense_categories_updated_at ON public.expense_categories;
CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_detailed_expenses_updated_at ON public.detailed_expenses;
CREATE TRIGGER update_detailed_expenses_updated_at
  BEFORE UPDATE ON public.detailed_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tours_updated_at ON public.tours;
CREATE TRIGGER update_tours_updated_at
  BEFORE UPDATE ON public.tours
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
