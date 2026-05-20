-- Add land operator (subcontractor) company columns to tours
-- company_id keeps its existing meaning: the booking/selling company (parent)
-- land_operator_id is a new optional FK to the company providing land services

ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS land_operator_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS land_operator_name_at_booking text;

CREATE INDEX IF NOT EXISTS idx_tours_land_operator_id
  ON public.tours(land_operator_id);

CREATE INDEX IF NOT EXISTS idx_tours_company_land_operator
  ON public.tours(company_id, land_operator_id);

COMMENT ON COLUMN public.tours.company_id IS 'Booking / selling company (parent agency, e.g. Authentic Travel)';
COMMENT ON COLUMN public.tours.land_operator_id IS 'Land operator / subcontractor company providing on-ground services (guide, transport, restaurant). Optional.';
COMMENT ON COLUMN public.tours.land_operator_name_at_booking IS 'Denormalized name of land operator at the time of booking.';
