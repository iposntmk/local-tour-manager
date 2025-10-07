-- Add optional guests column to tour_expenses and tour_meals
alter table if exists public.tour_expenses
  add column if not exists guests integer null;

alter table if exists public.tour_meals
  add column if not exists guests integer null;

