import type { Tour, TourSummary } from '@/types/tour';

/**
 * Calculate the complete summary for a tour based on its destinations, expenses, meals, and allowances
 */
export function calculateTourSummary(tour: Tour): TourSummary {
  const tourGuests = tour.totalGuests || 0;

  const clampGuests = (g: number | undefined) => {
    if (typeof g !== 'number') return tourGuests;
    if (!tourGuests) return g; // if tourGuests = 0, keep g
    return Math.min(Math.max(g, 0), tourGuests);
  };

  // Calculate totals for each tab
  const totalDestinations = (tour.destinations || []).reduce((sum, d) => {
    const g = clampGuests(d.guests as any);
    return sum + (d.price * g);
  }, 0);

  const totalExpenses = (tour.expenses || []).reduce((sum, e) => {
    const g = clampGuests(e.guests as any);
    return sum + (e.price * g);
  }, 0);

  const totalMeals = (tour.meals || []).reduce((sum, m) => {
    const g = clampGuests(m.guests as any);
    return sum + (m.price * g);
  }, 0);

  const totalAllowances = (tour.allowances || []).reduce(
    (sum, a) => sum + (a.price * (a.quantity || 1)),
    0
  );

  // Total tabs
  const totalTabs = totalDestinations + totalExpenses + totalMeals + totalAllowances;

  // Get existing summary values or use defaults
  const existingSummary = tour.summary;
  const advancePayment = existingSummary?.advancePayment ?? 0;
  const companyTip = existingSummary?.companyTip ?? 0;
  const collectionsForCompany = existingSummary?.collectionsForCompany ?? 0;

  // Calculate sequential values
  const totalAfterAdvance = totalTabs - advancePayment;
  const totalAfterCollections = totalAfterAdvance - collectionsForCompany;
  const totalAfterTip = totalAfterCollections + companyTip;
  const finalTotal = totalAfterTip;

  return {
    totalTabs,
    advancePayment,
    totalAfterAdvance,
    companyTip,
    totalAfterTip,
    collectionsForCompany,
    totalAfterCollections,
    finalTotal,
  };
}

/**
 * Enrich a tour with calculated summary if it's missing or incomplete
 * Only enriches tours that have full details loaded (destinations, expenses, meals, allowances)
 */
export function enrichTourWithSummary(tour: Tour): Tour {
  // Only enrich if tour has detailed data loaded
  // Check if destinations/expenses/meals arrays exist (they're undefined when details not loaded)
  const hasDetails =
    tour.destinations !== undefined &&
    tour.expenses !== undefined &&
    tour.meals !== undefined &&
    tour.allowances !== undefined;

  if (!hasDetails) {
    // Return tour as-is, use database summary values
    return tour;
  }

  const calculatedSummary = calculateTourSummary(tour);

  return {
    ...tour,
    summary: calculatedSummary,
  };
}

/**
 * Enrich multiple tours with calculated summaries
 * Only enriches tours that have full details loaded
 */
export function enrichToursWithSummaries(tours: Tour[]): Tour[] {
  return tours.map(enrichTourWithSummary);
}
