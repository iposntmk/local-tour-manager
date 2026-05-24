import type { Tour } from '@/types/tour';

const clampGuests = (guestValue: number | undefined, tourGuests: number): number => {
  if (typeof guestValue !== 'number') return tourGuests;
  if (!tourGuests) return guestValue;
  return Math.min(Math.max(guestValue, 0), tourGuests);
};

export const calculateTabTotals = (tour: Tour | null | undefined) => {
  if (!tour) return { destinations: 0, expenses: 0, meals: 0, allowances: 0, shoppings: 0 };
  const tourGuests = tour.totalGuests || 0;
  return {
    destinations: (tour.destinations || []).reduce(
      (sum, d) => sum + d.price * clampGuests(d.guests as number | undefined, tourGuests), 0),
    expenses: (tour.expenses || []).reduce(
      (sum, e) => sum + e.price * clampGuests(e.guests as number | undefined, tourGuests), 0),
    meals: (tour.meals || []).reduce(
      (sum, m) => sum + m.price * clampGuests(m.guests as number | undefined, tourGuests), 0),
    allowances: (tour.allowances || []).reduce((sum, a) => sum + a.price * (a.quantity || 1), 0),
    shoppings: (tour.shoppings || []).reduce((sum, s) => sum + s.price, 0),
  };
};
