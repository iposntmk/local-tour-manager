-- Payment tracking for approved tours.
-- Adds payment_status / payment_total / last_paid_at / last_payment_method to tours,
-- and a tour_payments installment log with triggers that keep tours.* in sync.

-- 1. Columns on tours -------------------------------------------------------
ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'partial', 'paid')),
  ADD COLUMN IF NOT EXISTS payment_total NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_payment_method TEXT
    CHECK (last_payment_method IS NULL OR last_payment_method IN ('cash', 'bank_transfer'));

CREATE INDEX IF NOT EXISTS idx_tours_payment_status ON public.tours(payment_status);

-- 2. tour_payments table ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tour_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer')),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_by UUID REFERENCES public.user_profiles(id),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tour_payments_tour_id ON public.tour_payments(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_payments_paid_at ON public.tour_payments(paid_at DESC);

DROP TRIGGER IF EXISTS update_tour_payments_updated_at ON public.tour_payments;
CREATE TRIGGER update_tour_payments_updated_at
  BEFORE UPDATE ON public.tour_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Recompute helper -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_tour_payment_summary(p_tour UUID)
RETURNS VOID AS $$
DECLARE
  v_sum NUMERIC;
  v_final NUMERIC;
  v_last_at TIMESTAMPTZ;
  v_last_method TEXT;
  v_status TEXT;
BEGIN
  SELECT COALESCE(SUM(amount), 0), MAX(paid_at)
    INTO v_sum, v_last_at
    FROM public.tour_payments WHERE tour_id = p_tour;

  SELECT payment_method INTO v_last_method
    FROM public.tour_payments
    WHERE tour_id = p_tour
    ORDER BY paid_at DESC, created_at DESC
    LIMIT 1;

  SELECT final_total INTO v_final FROM public.tours WHERE id = p_tour;

  v_status := CASE
    WHEN v_sum <= 0 THEN 'pending'
    WHEN v_sum >= COALESCE(v_final, 0) AND COALESCE(v_final, 0) > 0 THEN 'paid'
    ELSE 'partial'
  END;

  UPDATE public.tours
    SET payment_status = v_status,
        payment_total = v_sum,
        last_paid_at = v_last_at,
        last_payment_method = v_last_method,
        updated_at = now()
    WHERE id = p_tour;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 4. Trigger wrappers -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tour_payments_after_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    PERFORM public.refresh_tour_payment_summary(OLD.tour_id);
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE' AND OLD.tour_id <> NEW.tour_id) THEN
    PERFORM public.refresh_tour_payment_summary(OLD.tour_id);
    PERFORM public.refresh_tour_payment_summary(NEW.tour_id);
    RETURN NEW;
  ELSE
    PERFORM public.refresh_tour_payment_summary(NEW.tour_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_tour_payments_after_change ON public.tour_payments;
CREATE TRIGGER trg_tour_payments_after_change
  AFTER INSERT OR UPDATE OR DELETE ON public.tour_payments
  FOR EACH ROW EXECUTE FUNCTION public.tour_payments_after_change();

-- Guard: only allow payment when settlement is approved or closed
CREATE OR REPLACE FUNCTION public.tour_payments_validate_settlement()
RETURNS TRIGGER AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT settlement_status INTO v_status FROM public.tours WHERE id = NEW.tour_id;
  IF v_status NOT IN ('approved', 'closed') THEN
    RAISE EXCEPTION 'Cannot record payment until settlement is approved (current status: %)', v_status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_tour_payments_validate ON public.tour_payments;
CREATE TRIGGER trg_tour_payments_validate
  BEFORE INSERT OR UPDATE ON public.tour_payments
  FOR EACH ROW EXECUTE FUNCTION public.tour_payments_validate_settlement();

-- Recompute when tours.final_total changes (so 'paid' doesn't become stale)
CREATE OR REPLACE FUNCTION public.tours_refresh_payment_on_final_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.final_total IS DISTINCT FROM OLD.final_total) THEN
    PERFORM public.refresh_tour_payment_summary(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_tours_refresh_payment_on_final_change ON public.tours;
CREATE TRIGGER trg_tours_refresh_payment_on_final_change
  AFTER UPDATE OF final_total ON public.tours
  FOR EACH ROW EXECUTE FUNCTION public.tours_refresh_payment_on_final_change();

-- 5. RLS --------------------------------------------------------------------
ALTER TABLE public.tour_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tour_payments select" ON public.tour_payments;
DROP POLICY IF EXISTS "tour_payments insert" ON public.tour_payments;
DROP POLICY IF EXISTS "tour_payments update" ON public.tour_payments;
DROP POLICY IF EXISTS "tour_payments delete" ON public.tour_payments;

CREATE POLICY "tour_payments select" ON public.tour_payments FOR SELECT USING (true);

CREATE POLICY "tour_payments insert" ON public.tour_payments FOR INSERT
  WITH CHECK (public.check_user_permission(auth.uid(), ARRAY['mark_tour_paid']));

CREATE POLICY "tour_payments update" ON public.tour_payments FOR UPDATE
  USING (public.check_user_permission(auth.uid(), ARRAY['mark_tour_paid']))
  WITH CHECK (public.check_user_permission(auth.uid(), ARRAY['mark_tour_paid']));

CREATE POLICY "tour_payments delete" ON public.tour_payments FOR DELETE
  USING (public.check_user_permission(auth.uid(), ARRAY['mark_tour_paid']));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tour_payments TO authenticated;
