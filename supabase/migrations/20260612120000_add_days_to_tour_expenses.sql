alter table public.tour_expenses
  add column if not exists days numeric(6, 2);

comment on column public.tour_expenses.days is
  'Number of chargeable days for expense rows that need a day multiplier, such as water for guests.';

update public.tour_expenses expense
set
  days = greatest(round(expense.guests::numeric / nullif(tour.total_guests, 0), 2), 0),
  guests = tour.total_guests
from public.tours tour
where expense.tour_id = tour.id
  and expense.name in (
    'Nước uống cho khách 10k/1 khách / 1 ngày',
    'Nước uống cho khách 15k/1 khách / 1 ngày'
  )
  and expense.days is null
  and expense.guests is not null
  and coalesce(tour.total_guests, 0) > 0;

update public.tour_expenses expense
set
  days = coalesce(nullif(tour.total_days, 0), 1),
  guests = tour.total_guests
from public.tours tour
where expense.tour_id = tour.id
  and expense.name in (
    'Nước uống cho khách 10k/1 khách / 1 ngày',
    'Nước uống cho khách 15k/1 khách / 1 ngày'
  )
  and expense.days is null;

update public.tour_expenses expense
set guests = tour.total_guests
from public.tours tour
where expense.tour_id = tour.id
  and expense.name in (
    'Nước uống cho khách 10k/1 khách / 1 ngày',
    'Nước uống cho khách 15k/1 khách / 1 ngày'
  )
  and tour.total_guests is not null
  and expense.guests is distinct from tour.total_guests;
