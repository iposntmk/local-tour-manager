-- When a tour is reopened (approved/closed -> draft/submitted/need_changes),
-- clear its payment history. The existing trigger on tour_payments will then
-- recompute tours.payment_status back to 'pending' (and zero out the totals).

CREATE OR REPLACE FUNCTION public.tours_reset_payments_on_unlock()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.settlement_status IN ('approved', 'closed'))
     AND (NEW.settlement_status NOT IN ('approved', 'closed')) THEN
    DELETE FROM public.tour_payments WHERE tour_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_tours_reset_payments_on_unlock ON public.tours;
CREATE TRIGGER trg_tours_reset_payments_on_unlock
  AFTER UPDATE OF settlement_status ON public.tours
  FOR EACH ROW EXECUTE FUNCTION public.tours_reset_payments_on_unlock();
