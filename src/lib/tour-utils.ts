import type { Tour, TourSummary } from '@/types/tour';
import { getLineTotal } from '@/lib/tour-line-utils';

/**
 * Calculate the complete summary for a tour based on its destinations, expenses, meals, and allowances
 */
export function calculateTourSummary(tour: Tour): TourSummary {
  const tourGuests = tour.totalGuests || 0;

  // Calculate totals for each tab
  const totalDestinations = (tour.destinations || []).reduce((sum, d) => {
    return sum + getLineTotal(d, tourGuests);
  }, 0);

  const totalExpenses = (tour.expenses || []).reduce((sum, e) => {
    return sum + getLineTotal(e, tourGuests);
  }, 0);

  const totalMeals = (tour.meals || []).reduce((sum, m) => {
    return sum + getLineTotal(m, tourGuests);
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
 * Only enriches tours that have full subcollection details loaded.
 */
export function enrichTourWithSummary(tour: Tour): Tour {
  if (tour.detailsLoaded !== true) {
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
