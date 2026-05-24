import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type { TourPayment, TourPaymentInput, CommissionPayment } from '@/types/tour';
import { mapTourPayment, mapCommissionPayment } from '../mappers';
import type { TourPaymentInsert, TourPaymentUpdateRow, CommissionPaymentRow, CommissionPaymentInsert } from '../store-types';

export class TourPaymentsModule {
  declare protected supabase: SupabaseClient<Database>;

  async listTourPayments(tourId: string): Promise<TourPayment[]> {
    const { data, error } = await this.supabase
      .from('tour_payments').select('*').eq('tour_id', tourId).order('paid_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row) => mapTourPayment(row));
  }

  async addTourPayment(tourId: string, input: TourPaymentInput): Promise<TourPayment> {
    const insert: TourPaymentInsert = {
      tour_id: tourId,
      amount: input.amount,
      payment_method: input.method,
      paid_at: input.paidAt,
      note: input.note ?? null,
    };
    const { data, error } = await this.supabase.from('tour_payments').insert(insert).select('*').single();
    if (error) throw error;
    return mapTourPayment(data);
  }

  async updateTourPayment(id: string, patch: Partial<TourPaymentInput>): Promise<void> {
    const update: TourPaymentUpdateRow = {};
    if (patch.amount !== undefined) update.amount = patch.amount;
    if (patch.method !== undefined) update.payment_method = patch.method;
    if (patch.paidAt !== undefined) update.paid_at = patch.paidAt;
    if (patch.note !== undefined) update.note = patch.note ?? null;
    if (Object.keys(update).length === 0) return;
    const { error } = await this.supabase.from('tour_payments').update(update).eq('id', id);
    if (error) throw error;
  }

  async deleteTourPayment(id: string): Promise<void> {
    const { error } = await this.supabase.from('tour_payments').delete().eq('id', id);
    if (error) throw error;
  }

  async listCommissionPayments(tourShoppingId: string): Promise<CommissionPayment[]> {
    const { data, error } = await this.supabase
      .from('shopping_commission_payments').select('*').eq('tour_shopping_id', tourShoppingId).order('paid_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row) => mapCommissionPayment(row as CommissionPaymentRow));
  }

  async addCommissionPayment(payment: Omit<CommissionPayment, 'id'>): Promise<CommissionPayment> {
    const insert: CommissionPaymentInsert = {
      tour_shopping_id: payment.tourShoppingId!,
      amount: payment.amount,
      payment_method: payment.paymentMethod,
      paid_at: payment.paidAt,
      note: payment.note ?? null,
    };
    const { data, error } = await this.supabase
      .from('shopping_commission_payments').insert(insert).select('*').single();
    if (error) throw error;
    return mapCommissionPayment(data as CommissionPaymentRow);
  }

  async deleteCommissionPayment(id: string): Promise<void> {
    const { error } = await this.supabase.from('shopping_commission_payments').delete().eq('id', id);
    if (error) throw error;
  }
}
