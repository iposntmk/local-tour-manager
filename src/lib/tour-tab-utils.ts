import { getLineTotal } from '@/lib/tour-line-utils';
import type { Tour } from '@/types/tour';

export const calculateTabTotals = (tour: Tour | null | undefined) => {
  if (!tour) return { destinations: 0, expenses: 0, meals: 0, allowances: 0, shoppings: 0 };
  const tourGuests = tour.totalGuests || 0;
  return {
    destinations: (tour.destinations || []).reduce(
      (sum, d) => sum + getLineTotal(d, tourGuests), 0),
    expenses: (tour.expenses || []).reduce(
      (sum, e) => sum + getLineTotal(e, tourGuests), 0),
    meals: (tour.meals || []).reduce(
      (sum, m) => sum + getLineTotal(m, tourGuests), 0),
    allowances: (tour.allowances || []).reduce((sum, a) => sum + a.price * (a.quantity || 1), 0),
    shoppings: (tour.shoppings || []).reduce((sum, s) => sum + s.price, 0),
  };
};
