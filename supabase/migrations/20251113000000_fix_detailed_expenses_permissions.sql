-- Fix: Add missing permissions for detailed_expenses table
-- This allows the anon and authenticated roles to perform CRUD operations
-- RLS policies are already in place to control access

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.detailed_expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.detailed_expenses TO anon;

-- Grant permissions on related tables that might also be missing grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.guides TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guides TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nationalities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nationalities TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.provinces TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provinces TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tourist_destinations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tourist_destinations TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shoppings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shoppings TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tours TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tours TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tour_destinations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tour_destinations TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tour_expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tour_expenses TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tour_meals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tour_meals TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tour_allowances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tour_allowances TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tour_shoppings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tour_shoppings TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tour_images TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tour_images TO anon;

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
