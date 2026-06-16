-- Fix: when a tour is reopened, reset payment fields directly on the tours row.
-- The old trigger only deleted from tour_payments, but if no payment rows existed
-- (e.g. after bulk-SET via migration), payment_status stayed 'paid' — inconsistent.
-- Changed from AFTER to BEFORE so NEW.payment_status etc. are set atomically.

CREATE OR REPLACE FUNCTION public.tours_reset_payments_on_unlock()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.settlement_status IN ('approved', 'closed'))
     AND (NEW.settlement_status NOT IN ('approved', 'closed')) THEN
    DELETE FROM public.tour_payments WHERE tour_id = NEW.id;
    NEW.payment_status       := 'pending';
    NEW.payment_total        := 0;
    NEW.last_paid_at         := NULL;
    NEW.last_payment_method  := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_tours_reset_payments_on_unlock ON public.tours;
CREATE TRIGGER trg_tours_reset_payments_on_unlock
  BEFORE UPDATE OF settlement_status ON public.tours
  FOR EACH ROW EXECUTE FUNCTION public.tours_reset_payments_on_unlock();

-- Fix inconsistent rows left by the previous bulk migration:
-- tours where settlement_status is draft/approved but payment_status stayed 'paid'.
UPDATE public.tours
SET payment_status      = 'pending',
    payment_total       = 0,
    last_paid_at        = NULL,
    last_payment_method = NULL,
    updated_at          = now()
WHERE settlement_status IN ('draft', 'submitted', 'need_changes');
