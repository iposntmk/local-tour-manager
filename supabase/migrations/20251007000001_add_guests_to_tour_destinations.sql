-- Add optional guests column to tour_destinations to allow per-row guest counts
alter table if exists public.tour_destinations
  add column if not exists guests integer null;

