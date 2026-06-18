import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type { Destination, Expense, Meal, Allowance, Shopping as TourShopping, TourLineAttachment } from '@/types/tour';
import { mapTourShopping, mapLineReviewFields } from '../mappers';
import {
  attachLineTypeAttachments,
  mapTourDestinationLine,
  mapTourExpenseLine,
  mapTourMealLine,
} from './tour-line-mappers';

/**
 * Per-collection lazy reads for TourDetail tabs. Each tab fetches only its own
 * sub-collection when opened, instead of getTour() pulling everything up-front.
 * Mappers/ordering match getTour() so index-based mutations stay correct.
 */
export class TourReadsModule {
  declare protected supabase: SupabaseClient<Database>;
  declare listTourLineAttachments: (tourId: string) => Promise<TourLineAttachment[]>;

  async listTourDestinations(tourId: string): Promise<Destination[]> {
    const { data, error } = await this.supabase
      .from('tour_destinations').select('*').eq('tour_id', tourId).order('date');
    if (error) throw error;
    const lines = (data || []).map(mapTourDestinationLine);
    attachLineTypeAttachments(lines, 'destination', await this.listTourLineAttachments(tourId));
    return lines;
  }

  async listTourExpenses(tourId: string): Promise<Expense[]> {
    const { data, error } = await this.supabase
      .from('tour_expenses').select('*').eq('tour_id', tourId).order('date');
    if (error) throw error;
    const lines = (data || []).map(mapTourExpenseLine);
    attachLineTypeAttachments(lines, 'expense', await this.listTourLineAttachments(tourId));
    return lines;
  }

  async listTourMeals(tourId: string): Promise<Meal[]> {
    const { data, error } = await this.supabase
      .from('tour_meals').select('*').eq('tour_id', tourId).order('date');
    if (error) throw error;
    const lines = (data || []).map(mapTourMealLine);
    attachLineTypeAttachments(lines, 'meal', await this.listTourLineAttachments(tourId));
    return lines;
  }

  async listTourAllowances(tourId: string): Promise<Allowance[]> {
    const { data, error } = await this.supabase
      .from('tour_allowances').select('*').eq('tour_id', tourId).order('date');
    if (error) throw error;
    return (data || []).map((a: any) => ({
      date: a.date, name: a.name, price: Number(a.price) || 0, quantity: a.quantity || 1,
      categoryId: a.category_id ?? undefined, ...mapLineReviewFields(a),
    }));
  }

  async listTourShoppings(tourId: string): Promise<TourShopping[]> {
    const { data, error } = await this.supabase
      .from('tour_shoppings').select('*, shopping_commission_payments(*)').eq('tour_id', tourId).order('date');
    if (error) throw error;
    // Visibility is gated upstream: the shoppings query in useTourDetail is only enabled
    // when canViewShoppings is true, so no per-line stripping is needed here.
    return (data || []).map((s: any) => mapTourShopping(s));
  }
}
