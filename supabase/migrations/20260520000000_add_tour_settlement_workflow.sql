-- Tour settlement review workflow
-- Adds:
--   1. settlement_status + audit timestamps on tours
--   2. line_status / line_comment / reviewed_by / reviewed_at on 5 tour sub-tables
--   3. settlement_role on user_profiles (guide / accountant / none)
--   4. tour_submission_history table (append-only event log)

-- 1. Tour-level settlement workflow ---------------------------------------

ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS settlement_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (settlement_status IN ('draft','submitted','need_changes','approved','closed')),
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submission_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tours_settlement_status
  ON public.tours(settlement_status);

COMMENT ON COLUMN public.tours.settlement_status IS
  'Settlement workflow state: draft (HDV editing), submitted (sent to accountant), need_changes (returned), approved (locked), closed (archived).';
COMMENT ON COLUMN public.tours.submission_count IS
  'Number of times HDV has submitted this tour for review.';

-- 2. Per-line review status on tour sub-tables ---------------------------

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tour_destinations',
    'tour_expenses',
    'tour_meals',
    'tour_allowances',
    'tour_shoppings'
  ]
  LOOP
    EXECUTE format($f$
      ALTER TABLE public.%I
        ADD COLUMN IF NOT EXISTS line_status TEXT NOT NULL DEFAULT 'unchecked'
          CHECK (line_status IN ('unchecked','valid','need_more','invalid')),
        ADD COLUMN IF NOT EXISTS line_comment TEXT,
        ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
    $f$, t);
  END LOOP;
END $$;

-- 3. Settlement role on user_profiles ------------------------------------

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS settlement_role TEXT NOT NULL DEFAULT 'none'
    CHECK (settlement_role IN ('none','guide','accountant'));

CREATE INDEX IF NOT EXISTS idx_user_profiles_settlement_role
  ON public.user_profiles(settlement_role);

COMMENT ON COLUMN public.user_profiles.settlement_role IS
  'Business role for tour settlement workflow: guide (HDV submits), accountant (reviews/approves), none (no settlement involvement).';

-- 4. Submission history table --------------------------------------------

CREATE TABLE IF NOT EXISTS public.tour_submission_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  event TEXT NOT NULL CHECK (event IN ('submitted','returned','approved','reopened')),
  actor_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  actor_role TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tour_submission_history_tour
  ON public.tour_submission_history(tour_id, created_at DESC);

ALTER TABLE public.tour_submission_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read submission history"
  ON public.tour_submission_history
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert submission history"
  ON public.tour_submission_history
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

GRANT SELECT, INSERT ON public.tour_submission_history TO authenticated;
