import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type { Destination, Expense, Meal, Allowance, Shopping as TourShopping, Tour, CommissionPayment } from '@/types/tour';
import { mapLineReviewFields } from '../mappers';
import type { CommissionPaymentRow } from '../store-types';
import { mapCommissionPayment } from '../mappers';

export class TourItemsModule {
  declare protected supabase: SupabaseClient<Database>;
  declare getTour: (id: string) => Promise<Tour | null>;
  declare recalculateTourSummary: (tourId: string) => Promise<void>;
  declare addCommissionPayment: (payment: Omit<CommissionPayment, 'id'>) => Promise<CommissionPayment>;

  async getDestinations(tourId: string): Promise<Destination[]> {
    const { data, error } = await this.supabase.from('tour_destinations').select('*').eq('tour_id', tourId).order('date');
    if (error) throw error;
    return (data || []).map((row) => ({
      name: row.name, price: Number(row.price) || 0, date: row.date,
      guests: typeof row.guests === 'number' ? row.guests : undefined,
    }));
  }

  async addDestination(tourId: string, destination: Destination): Promise<void> {
    const { error } = await this.supabase.from('tour_destinations').insert({
      tour_id: tourId, name: destination.name, price: destination.price, date: destination.date, guests: destination.guests ?? null,
    });
    if (error) {
      if (error.code === '23503') throw new Error('Invalid tour reference');
      if (error.code === '23502') throw new Error('Required destination field is missing');
      if (error.code === '22001') throw new Error('Destination data too long');
      if (error.code === '22003') throw new Error('Invalid destination price');
      if (error.code === '22007') throw new Error('Invalid destination date format');
      throw new Error(`Failed to add destination: ${error.message}`);
    }
    await this.recalculateTourSummary(tourId);
  }

  async updateDestination(tourId: string, index: number, destination: Destination): Promise<void> {
    const { data: rows } = await this.supabase.from('tour_destinations').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await this.supabase.from('tour_destinations').update({
        name: destination.name, price: destination.price, date: destination.date, guests: destination.guests ?? null,
      }).eq('id', rows[index].id);
      if (error) throw error;
      await this.recalculateTourSummary(tourId);
    }
  }

  async removeDestination(tourId: string, index: number): Promise<void> {
    const { data: rows } = await this.supabase.from('tour_destinations').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await this.supabase.from('tour_destinations').delete().eq('id', rows[index].id);
      if (error) throw error;
      await this.recalculateTourSummary(tourId);
    }
  }

  async getExpenses(tourId: string): Promise<Expense[]> {
    const { data, error } = await this.supabase.from('tour_expenses').select('*').eq('tour_id', tourId).order('date');
    if (error) throw error;
    return (data || []).map((row) => ({
      name: row.name, price: Number(row.price) || 0, date: row.date,
      guests: row.guests !== null && row.guests !== undefined ? Number(row.guests) : undefined,
    }));
  }

  async addExpense(tourId: string, expense: Expense): Promise<void> {
    const { error } = await this.supabase.from('tour_expenses').insert({
      tour_id: tourId, name: expense.name, price: expense.price, date: expense.date, guests: expense.guests,
    });
    if (error) throw error;
    await this.recalculateTourSummary(tourId);
  }

  async updateExpense(tourId: string, index: number, expense: Expense): Promise<void> {
    const { data: rows } = await this.supabase.from('tour_expenses').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      console.log('Updating expense in DB - ID:', rows[index].id, 'Guests:', expense.guests);
      const { error } = await this.supabase.from('tour_expenses').update({
        name: expense.name, price: expense.price, date: expense.date, guests: expense.guests,
      }).eq('id', rows[index].id);
      if (error) { console.error('Error updating expense:', error); throw error; }
      console.log('Expense updated successfully in DB');
      await this.recalculateTourSummary(tourId);
    }
  }

  async removeExpense(tourId: string, index: number): Promise<void> {
    const { data: rows } = await this.supabase.from('tour_expenses').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await this.supabase.from('tour_expenses').delete().eq('id', rows[index].id);
      if (error) throw error;
      await this.recalculateTourSummary(tourId);
    }
  }

  async getMeals(tourId: string): Promise<Meal[]> {
    const { data, error } = await this.supabase.from('tour_meals').select('*').eq('tour_id', tourId).order('date');
    if (error) throw error;
    return (data || []).map((row) => ({
      name: row.name, price: Number(row.price) || 0, date: row.date,
      guests: row.guests !== null && row.guests !== undefined ? Number(row.guests) : undefined,
    }));
  }

  async addMeal(tourId: string, meal: Meal): Promise<void> {
    const { error } = await this.supabase.from('tour_meals').insert({
      tour_id: tourId, name: meal.name, price: meal.price, date: meal.date, guests: meal.guests ?? null,
    });
    if (error) throw error;
    await this.recalculateTourSummary(tourId);
  }

  async updateMeal(tourId: string, index: number, meal: Meal): Promise<void> {
    const { data: rows } = await this.supabase.from('tour_meals').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await this.supabase.from('tour_meals').update({
        name: meal.name, price: meal.price, date: meal.date, guests: meal.guests ?? null,
      }).eq('id', rows[index].id);
      if (error) throw error;
      await this.recalculateTourSummary(tourId);
    }
  }

  async removeMeal(tourId: string, index: number): Promise<void> {
    const { data: rows } = await this.supabase.from('tour_meals').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await this.supabase.from('tour_meals').delete().eq('id', rows[index].id);
      if (error) throw error;
      await this.recalculateTourSummary(tourId);
    }
  }

  async getAllowances(tourId: string): Promise<Allowance[]> {
    const { data, error } = await this.supabase.from('tour_allowances').select('*').eq('tour_id', tourId).order('date');
    if (error) throw error;
    return (data || []).map((row) => ({
      date: row.date, name: row.name, price: Number(row.price) || 0,
      quantity: row.quantity || 1, categoryId: row.category_id ?? undefined,
    }));
  }

  async addAllowance(tourId: string, allowance: Allowance): Promise<void> {
    const { error } = await this.supabase.from('tour_allowances').insert({
      tour_id: tourId, date: allowance.date, name: allowance.name,
      price: allowance.price, quantity: allowance.quantity || 1, category_id: allowance.categoryId ?? null,
    });
    if (error) throw error;
    await this.recalculateTourSummary(tourId);
  }

  async updateAllowance(tourId: string, index: number, allowance: Allowance): Promise<void> {
    const { data: rows } = await this.supabase.from('tour_allowances').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await this.supabase.from('tour_allowances').update({
        date: allowance.date, name: allowance.name,
        price: allowance.price, quantity: allowance.quantity || 1, category_id: allowance.categoryId ?? null,
      }).eq('id', rows[index].id);
      if (error) throw error;
      await this.recalculateTourSummary(tourId);
    }
  }

  async removeAllowance(tourId: string, index: number): Promise<void> {
    const { data: rows } = await this.supabase.from('tour_allowances').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await this.supabase.from('tour_allowances').delete().eq('id', rows[index].id);
      if (error) throw error;
      await this.recalculateTourSummary(tourId);
    }
  }

  async getTourShoppings(tourId: string): Promise<TourShopping[]> {
    const { data, error } = await this.supabase.from('tour_shoppings').select('*').eq('tour_id', tourId).order('date');
    if (error) throw error;
    return (data || []).map((row) => ({ name: row.name, price: Number(row.price) || 0, date: row.date }));
  }

  async addTourShopping(tourId: string, shopping: TourShopping): Promise<void> {
    const { data, error } = await this.supabase.from('tour_shoppings').insert({
      tour_id: tourId, name: shopping.name, price: shopping.price, date: shopping.date,
      withholds_pit: shopping.withholdsPit ?? null, pit_rate: shopping.pitRate ?? null,
      pit_amount: shopping.pitAmount ?? null, net_commission: shopping.netCommission ?? null,
    }).select('id').single();
    if (error) throw error;
    if (data && shopping.payments && shopping.payments.length > 0) {
      await Promise.all(shopping.payments.map((p) => this.addCommissionPayment({ ...p, tourShoppingId: data.id })));
    }
  }

  async updateTourShopping(tourId: string, index: number, shopping: TourShopping): Promise<void> {
    const { data: rows } = await this.supabase.from('tour_shoppings').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await this.supabase.from('tour_shoppings').update({
        name: shopping.name, price: shopping.price, date: shopping.date,
        withholds_pit: shopping.withholdsPit ?? null, pit_rate: shopping.pitRate ?? null,
        pit_amount: shopping.pitAmount ?? null, net_commission: shopping.netCommission ?? null,
      }).eq('id', rows[index].id);
      if (error) throw error;
    }
  }

  async removeTourShopping(tourId: string, index: number): Promise<void> {
    const { data: rows } = await this.supabase.from('tour_shoppings').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await this.supabase.from('tour_shoppings').delete().eq('id', rows[index].id);
      if (error) throw error;
    }
  }
}
