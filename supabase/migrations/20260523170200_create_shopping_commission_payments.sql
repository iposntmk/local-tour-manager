CREATE TABLE IF NOT EXISTS public.shopping_commission_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_shopping_id UUID NOT NULL REFERENCES public.tour_shoppings(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_method VARCHAR NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer')),
  paid_at DATE NOT NULL,
  note TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scp_tour_shopping_id
  ON public.shopping_commission_payments(tour_shopping_id);

DROP TRIGGER IF EXISTS update_shopping_commission_payments_updated_at
  ON public.shopping_commission_payments;
CREATE TRIGGER update_shopping_commission_payments_updated_at
  BEFORE UPDATE ON public.shopping_commission_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.shopping_commission_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shopping_commission_payments select" ON public.shopping_commission_payments;
DROP POLICY IF EXISTS "shopping_commission_payments insert" ON public.shopping_commission_payments;
DROP POLICY IF EXISTS "shopping_commission_payments update" ON public.shopping_commission_payments;
DROP POLICY IF EXISTS "shopping_commission_payments delete" ON public.shopping_commission_payments;

CREATE POLICY "shopping_commission_payments select"
  ON public.shopping_commission_payments FOR SELECT USING (true);

CREATE POLICY "shopping_commission_payments insert"
  ON public.shopping_commission_payments FOR INSERT WITH CHECK (true);

CREATE POLICY "shopping_commission_payments update"
  ON public.shopping_commission_payments FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "shopping_commission_payments delete"
  ON public.shopping_commission_payments FOR DELETE USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_commission_payments TO authenticated;
