/**
 * One-time utility to recalculate summaries for all tours
 * Run this once to fix stale summary data in the database
 */

import { store } from './datastore';
import { calculateTourSummary } from './tour-utils';

export async function recalculateAllTourSummaries(): Promise<{
  total: number;
  updated: number;
  errors: Array<{ tourCode: string; error: string }>;
}> {
  console.log('Starting recalculation of all tour summaries...');

  const errors: Array<{ tourCode: string; error: string }> = [];
  let updated = 0;

  try {
    // Fetch all tours with full details
    const { tours } = await store.listTours({}, { includeDetails: true });
    console.log(`Found ${tours.length} tours to process`);

    for (const tour of tours) {
      try {
        // Calculate new summary
        const calculatedSummary = calculateTourSummary(tour);

        // Update in database
        await store.updateTour(tour.id, { summary: calculatedSummary });

        updated++;
        console.log(`Updated ${tour.tourCode} (${updated}/${tours.length})`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ tourCode: tour.tourCode, error: errorMessage });
        console.error(`Failed to update ${tour.tourCode}:`, errorMessage);
      }
    }

    console.log(`Recalculation complete: ${updated}/${tours.length} tours updated`);
    if (errors.length > 0) {
      console.error(`Errors encountered for ${errors.length} tours:`, errors);
    }

    return {
      total: tours.length,
      updated,
      errors,
    };
  } catch (error) {
    console.error('Failed to recalculate tour summaries:', error);
    throw error;
  }
}
