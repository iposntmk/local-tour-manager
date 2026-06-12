import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type {
  Tour, Destination, Expense, Meal, Allowance,
  Shopping as TourShopping, TourQuery, EntityRef, TourNationality,
  TourInput, TourSummary, TourListResult, PaymentMethod, TourLineAttachment,
} from '@/types/tour';
import { differenceInDays } from 'date-fns';
import { enrichTourWithSummary, enrichToursWithSummaries } from '@/lib/tour-utils';
import { getTourWarningInfo, getAllowanceTotal } from '@/pages/tours/tour-table-config';
import { stripTourShoppingForProfile } from '@/lib/shopping-access';
import { isWaterExpense, normalizeWaterExpenseLine } from '@/lib/water-expense-utils';
import { mapTour, mapTourPayment, mapTourShopping, mapLineReviewFields } from '../mappers';
import type { TourRowWithDetails, TourNationalityRow, TourPaymentRow } from '../store-types';
import type { UserProfile } from '@/types/user';
import { MASTER_ADMIN_EMAIL } from '@/lib/auth-constants';
import {
  attachTourLineAttachments,
  mapTourDestinationLine,
  mapTourExpenseLine,
  mapTourMealLine,
} from './tour-line-mappers';

export class TourCrudModule {
  declare protected supabase: SupabaseClient<Database>;
  declare addDestination: (tourId: string, dest: Destination) => Promise<string | undefined>;
  declare addExpense: (tourId: string, expense: Expense) => Promise<string | undefined>;
  declare updateExpense: (tourId: string, index: number, expense: Expense) => Promise<void>;
  declare addMeal: (tourId: string, meal: Meal) => Promise<string | undefined>;
  declare addAllowance: (tourId: string, allowance: Allowance) => Promise<void>;
  declare addTourShopping: (tourId: string, shopping: TourShopping) => Promise<void>;
  declare updateTour: (id: string, tour: Partial<Tour>) => Promise<void>;
  declare listTourLineAttachments: (tourId: string) => Promise<TourLineAttachment[]>;
  declare getCurrentUserProfile: () => Promise<UserProfile | undefined>;

  private mapTourNationality(row: TourNationalityRow): TourNationality {
    return { id: row.nationality_id, nameAtBooking: row.nationality_name_at_booking || '', paxCount: Number(row.pax_count) || 0 };
  }

  private applyTourNationalities(tour: Tour, rows?: TourNationalityRow[] | null): Tour {
    const nationalities = (rows || []).map((r) => this.mapTourNationality(r)).filter((n) => n.id);
    if (nationalities.length > 0) {
      tour.clientNationalities = nationalities;
      tour.clientNationalityRef = { id: nationalities[0].id, nameAtBooking: nationalities[0].nameAtBooking };
      return tour;
    }
    if (tour.clientNationalityRef.id) {
      tour.clientNationalities = [{ ...tour.clientNationalityRef, paxCount: Math.max(tour.totalGuests || 0, 1) }];
    }
    return tour;
  }

  private normalizeTourNationalitiesForWrite(
    tour: { clientNationalityRef?: EntityRef; clientNationalities?: TourNationality[] },
    totalGuests: number
  ): TourNationality[] {
    const source = tour.clientNationalities?.length
      ? tour.clientNationalities
      : tour.clientNationalityRef?.id
        ? [{ ...tour.clientNationalityRef, paxCount: Math.max(totalGuests, 1) }]
        : [];
    const byId = new Map<string, TourNationality>();
    source.forEach((n) => {
      if (!n.id) return;
      byId.set(n.id, { id: n.id, nameAtBooking: n.nameAtBooking || '', paxCount: Math.max(1, Math.floor(Number(n.paxCount) || 0)) });
    });
    return Array.from(byId.values());
  }

  private validateTourNationalities(nationalities: TourNationality[], totalGuests: number): void {
    if (nationalities.length === 0) throw new Error('Vui lòng chọn ít nhất một quốc tịch.');
    const totalPax = nationalities.reduce((sum, n) => sum + n.paxCount, 0);
    if (totalGuests > 0 && totalPax !== totalGuests) throw new Error('Tổng pax theo quốc tịch phải bằng tổng khách.');
  }

  private async replaceTourNationalities(tourId: string, nationalities: TourNationality[]): Promise<void> {
    const { error: deleteError } = await this.supabase.from('tour_nationalities').delete().eq('tour_id', tourId);
    if (deleteError) throw deleteError;
    if (nationalities.length === 0) return;
    const { error: insertError } = await this.supabase.from('tour_nationalities').insert(
      nationalities.map((n) => ({ tour_id: tourId, nationality_id: n.id, nationality_name_at_booking: n.nameAtBooking, pax_count: n.paxCount }))
    );
    if (insertError) throw insertError;
  }

  async recalculateTourSummary(tourId: string): Promise<void> {
    const tour = await this.getTour(tourId);
    if (!tour) return;
    const summary = tour.summary;
    const warningInfo = getTourWarningInfo(tour);
    const allowanceTotal = getAllowanceTotal(tour);
    await this.supabase.from('tours').update({
      total_tabs: summary.totalTabs, advance_payment: summary.advancePayment,
      total_after_advance: summary.totalAfterAdvance, company_tip: summary.companyTip,
      total_after_tip: summary.totalAfterTip, collections_for_company: summary.collectionsForCompany,
      total_after_collections: summary.totalAfterCollections, final_total: summary.finalTotal,
      has_zero_price: warningInfo.hasZeroPrice,
      has_duplicate_dest_names: warningInfo.hasDuplicateDestNames,
      missing_water_expense: warningInfo.missingWaterExpense,
      has_unpaid_commission: warningInfo.hasUnpaidCommission,
      allowance_total: allowanceTotal,
    }).eq('id', tourId);
  }

  async listTours(query?: TourQuery, options?: { includeDetails?: boolean }): Promise<TourListResult> {
    const includeDetails = options?.includeDetails ?? false;
    const currentProfile = await this.getCurrentUserProfile();
    let queryBuilder = this.supabase.from('tours').select(
      includeDetails
        ? `*, tour_destinations(*), tour_expenses(*), tour_meals(*), tour_allowances(*), tour_shoppings(*, shopping_commission_payments(*)), tour_nationalities(*)`
        : `*, tour_nationalities(*), tour_shoppings(id, name, price, net_commission, shopping_commission_payments(amount))`,
      { count: 'exact' }
    );

    const sortColumnMap: Record<string, string> = { startDate: 'start_date', endDate: 'end_date', tourCode: 'tour_code', clientName: 'client_name', createdAt: 'created_at' };
    queryBuilder = queryBuilder.order(sortColumnMap[query?.sortBy || 'startDate'] || 'start_date', { ascending: (query?.sortOrder || 'desc') === 'asc' });

    if (includeDetails) {
      queryBuilder = queryBuilder
        .order('date', { foreignTable: 'tour_shoppings' })
        .order('date', { foreignTable: 'tour_destinations' }).order('date', { foreignTable: 'tour_expenses' })
        .order('date', { foreignTable: 'tour_meals' }).order('date', { foreignTable: 'tour_allowances' });
    }

    if (query?.tourCodeLike) queryBuilder = queryBuilder.ilike('tour_code', `%${query.tourCodeLike.trim()}%`);
    else if (query?.tourCode) queryBuilder = queryBuilder.ilike('tour_code', `%${query.tourCode.trim()}%`);
    if (query?.companyNameLike) queryBuilder = queryBuilder.ilike('company_name_at_booking', `%${query.companyNameLike.trim()}%`);
    if (query?.landOperatorNameLike) queryBuilder = queryBuilder.ilike('land_operator_name_at_booking', `%${query.landOperatorNameLike.trim()}%`);

    if (query?.dateLike || query?.dateLike2 || query?.dateRawLike) {
      const parts: string[] = [];
      if (query?.dateLike) parts.push(`start_date.ilike.%${query.dateLike.trim()}%`);
      if (query?.dateLike2) parts.push(`start_date.ilike.%${query.dateLike2.trim()}%`);
      if (query?.dateRawLike) parts.push(`start_date.ilike.%${query.dateRawLike.trim()}%`);
      if (parts.length === 1) queryBuilder = queryBuilder.ilike('start_date', parts[0].split('.ilike.')[1]);
      else if (parts.length > 1) queryBuilder = queryBuilder.or(parts.join(','));
    }
    if (query?.clientName) queryBuilder = queryBuilder.ilike('client_name', `%${query.clientName}%`);
    if (query?.companyId) queryBuilder = queryBuilder.eq('company_id', query.companyId);
    if (query?.landOperatorId) queryBuilder = queryBuilder.eq('land_operator_id', query.landOperatorId);
    const isMasterAdmin = currentProfile?.email === MASTER_ADMIN_EMAIL;
    if (!isMasterAdmin && currentProfile?.settlementRole === 'guide') queryBuilder = queryBuilder.eq('guide_id', currentProfile.id);
    else if (query?.guideId) queryBuilder = queryBuilder.eq('guide_id', query.guideId);
    if (query?.startDate) queryBuilder = queryBuilder.gte('end_date', query.startDate);
    if (query?.endDate) queryBuilder = queryBuilder.lte('start_date', query.endDate);
    if (query?.nationalityId) {
      const { data: natRows, error: natErr } = await this.supabase.from('tour_nationalities').select('tour_id').eq('nationality_id', query.nationalityId);
      if (natErr) throw natErr;
      const tourIds = Array.from(new Set((natRows || []).map((r) => r.tour_id)));
      if (tourIds.length > 0) queryBuilder = queryBuilder.or(`nationality_id.eq.${query.nationalityId},id.in.(${tourIds.join(',')})`);
      else queryBuilder = queryBuilder.eq('nationality_id', query.nationalityId);
    }
    if (query?.settlementStatus) queryBuilder = queryBuilder.eq('settlement_status', query.settlementStatus);
    if (query?.paymentStatus) queryBuilder = queryBuilder.eq('payment_status', query.paymentStatus);

    const limit = typeof query?.limit === 'number' ? query.limit : undefined;
    const offset = typeof query?.offset === 'number' ? query.offset : undefined;
    if (typeof limit === 'number' && limit > 0) {
      queryBuilder = typeof offset === 'number' && offset >= 0 ? queryBuilder.range(offset, offset + limit - 1) : queryBuilder.limit(limit);
    } else if (limit === 0) queryBuilder = queryBuilder.limit(0);

    const { data, error, count } = await queryBuilder;
    if (error) throw error;
    const tours = (data || []).map((row) => {
      const typedRow = row as TourRowWithDetails;
      const tour = mapTour(row as any);
      this.applyTourNationalities(tour, typedRow.tour_nationalities);
      if (includeDetails) {
        tour.destinations = (typedRow.tour_destinations || []).map(mapTourDestinationLine);
        tour.expenses = (typedRow.tour_expenses || []).map(mapTourExpenseLine);
        tour.meals = (typedRow.tour_meals || []).map(mapTourMealLine);
        tour.allowances = (typedRow.tour_allowances || []).map((a) => ({ date: a.date, name: a.name, price: Number(a.price) || 0, quantity: a.quantity || 1, categoryId: a.category_id ?? undefined, ...mapLineReviewFields(a) }));
      }
      // Shoppings with commission payments are fetched in both list and detail views
      tour.shoppings = (typedRow.tour_shoppings || []).map((s: any) => mapTourShopping(s));
      return tour;
    });

    const enrichedTours = includeDetails ? enrichToursWithSummaries(tours) : tours;
    const visibleTours = enrichedTours.map((tour) => stripTourShoppingForProfile(tour, currentProfile));
    return { tours: visibleTours, total: typeof count === 'number' ? count : tours.length };
  }

  async getTour(id: string): Promise<Tour | null> {
    const { data, error } = await this.supabase.from('tours').select(`
        *, tour_destinations(*), tour_expenses(*), tour_meals(*), tour_allowances(*),
        tour_shoppings(*, shopping_commission_payments(*)), tour_nationalities(*), tour_payments(*)
      `).eq('id', id)
      .order('date', { foreignTable: 'tour_destinations' }).order('date', { foreignTable: 'tour_expenses' })
      .order('date', { foreignTable: 'tour_meals' }).order('date', { foreignTable: 'tour_allowances' })
      .order('date', { foreignTable: 'tour_shoppings' }).order('paid_at', { foreignTable: 'tour_payments', ascending: false })
      .single();
    if (error) return null;
    if (!data) return null;
    const tour = mapTour(data as any);
    const row: any = data;
    this.applyTourNationalities(tour, row.tour_nationalities);
    tour.payments = (row.tour_payments || []).map((p: TourPaymentRow) => mapTourPayment(p));
    tour.destinations = (row.tour_destinations || []).map(mapTourDestinationLine);
    tour.expenses = (row.tour_expenses || []).map(mapTourExpenseLine);
    tour.meals = (row.tour_meals || []).map(mapTourMealLine);
    tour.allowances = (row.tour_allowances || []).map((a: any) => ({ date: a.date, name: a.name, price: Number(a.price) || 0, quantity: a.quantity || 1, categoryId: a.category_id ?? undefined, ...mapLineReviewFields(a) }));
    tour.shoppings = (row.tour_shoppings || []).map((s: any) => mapTourShopping(s));
    attachTourLineAttachments(tour, await this.listTourLineAttachments(id));
    const currentProfile = await this.getCurrentUserProfile();
    return enrichTourWithSummary(stripTourShoppingForProfile(tour, currentProfile));
  }

  async createTour(tour: TourInput & { destinations?: Destination[]; expenses?: Expense[]; meals?: Meal[]; allowances?: Allowance[]; shoppings?: TourShopping[]; summary?: TourSummary }): Promise<Tour> {
    const { data: existing } = await this.supabase.from('tours').select('id').ilike('tour_code', tour.tourCode).maybeSingle();
    if (existing) throw new Error('A tour with this tour code already exists');

    const totalGuests = (tour.adults || 0) + (tour.children || 0);
    const totalDays = Math.max(1, differenceInDays(new Date(tour.endDate), new Date(tour.startDate)) + 1);
    const nationalityEntries = this.normalizeTourNationalitiesForWrite(tour, totalGuests);
    this.validateTourNationalities(nationalityEntries, totalGuests);
    const primaryNationality = nationalityEntries[0];

    // created_by_user_id is stamped server-side by the BEFORE INSERT trigger
    // (set_tour_created_by) using auth.uid(), so we no longer send it here.
    const { data, error } = await this.supabase.from('tours').insert({
      tour_code: tour.tourCode, company_id: tour.companyRef.id, company_name_at_booking: tour.companyRef.nameAtBooking,
      land_operator_id: tour.landOperatorRef?.id || null, land_operator_name_at_booking: tour.landOperatorRef?.nameAtBooking || null,
      guide_id: tour.guideRef.id, guide_name_at_booking: tour.guideRef.nameAtBooking,
      nationality_id: primaryNationality.id, nationality_name_at_booking: primaryNationality.nameAtBooking,
      client_name: tour.clientName, adults: tour.adults, children: tour.children, total_guests: totalGuests,
      driver_name: tour.driverName || '', client_phone: tour.clientPhone || '',
      start_date: tour.startDate, end_date: tour.endDate, total_days: totalDays, notes: tour.notes || '',
      total_tabs: tour.summary?.totalTabs ?? 0, advance_payment: tour.summary?.advancePayment ?? 0,
      total_after_advance: tour.summary?.totalAfterAdvance ?? 0, company_tip: tour.summary?.companyTip ?? 0,
      total_after_tip: tour.summary?.totalAfterTip ?? 0, collections_for_company: tour.summary?.collectionsForCompany ?? 0,
      total_after_collections: tour.summary?.totalAfterCollections ?? 0, final_total: tour.summary?.finalTotal ?? 0,
      has_zero_price: false, has_duplicate_dest_names: false, missing_water_expense: true,
      has_unpaid_commission: false, allowance_total: 0,
    }).select().single();

    if (error) {
      if (error.code === '23505') throw new Error('A tour with this tour code already exists');
      if (error.code === '23503') throw new Error('Invalid reference to company, guide, or nationality');
      if (error.code === '23502') throw new Error('Required field is missing');
      throw new Error(`Database error: ${error.message} (Code: ${error.code})`);
    }

    await this.replaceTourNationalities(data.id, nationalityEntries);
    const createdTour = await this.getTour(data.id) as Tour;

    try {
      if (tour.destinations?.length) await Promise.all(tour.destinations.map((d) => this.addDestination(createdTour.id, d)));
      await this.addExpense(createdTour.id, {
        name: 'Nước uống cho khách 10k/1 khách / 1 ngày',
        price: 10000, date: tour.startDate, guests: totalGuests, days: totalDays,
      });
      if (tour.expenses?.length) await Promise.all(tour.expenses.map((e) => this.addExpense(createdTour.id, e)));
      if (tour.meals?.length) await Promise.all(tour.meals.map((m) => this.addMeal(createdTour.id, m)));
      if (tour.allowances?.length) await Promise.all(tour.allowances.map((a) => this.addAllowance(createdTour.id, a)));
      if (tour.shoppings?.length) await Promise.all(tour.shoppings.map((s) => this.addTourShopping(createdTour.id, s)));
      // Always recalculate after all sub-collections are added so total_tabs reflects the
      // auto-added water expense and any import-provided items. Do NOT use tour.summary here —
      // it was calculated before createTour added the water expense, so it is already stale.
      await this.recalculateTourSummary(createdTour.id);
    } catch (subcollectionError) {
      console.error('Error adding subcollections:', subcollectionError);
    }
    return createdTour;
  }

  async updateTour(id: string, tour: Partial<Tour>): Promise<void> {
    const updates: any = {};
    if (tour.tourCode !== undefined) {
      const { data: existing } = await this.supabase.from('tours').select('id').ilike('tour_code', tour.tourCode).neq('id', id).maybeSingle();
      if (existing) throw new Error('A tour with this tour code already exists');
      updates.tour_code = tour.tourCode;
    }
    if (tour.companyRef !== undefined) { updates.company_id = tour.companyRef.id; updates.company_name_at_booking = tour.companyRef.nameAtBooking; }
    if (tour.landOperatorRef !== undefined) { updates.land_operator_id = tour.landOperatorRef?.id || null; updates.land_operator_name_at_booking = tour.landOperatorRef?.nameAtBooking || null; }
    if (tour.guideRef !== undefined) { updates.guide_id = tour.guideRef.id; updates.guide_name_at_booking = tour.guideRef.nameAtBooking; }

    let nextNationalityEntries: TourNationality[] | undefined;
    if (tour.clientNationalities !== undefined || tour.clientNationalityRef !== undefined) {
      let totalGuestsForNat = tour.totalGuests;
      if (totalGuestsForNat === undefined && tour.adults !== undefined && tour.children !== undefined) totalGuestsForNat = (tour.adults || 0) + (tour.children || 0);
      if (totalGuestsForNat === undefined) { const current = await this.getTour(id); totalGuestsForNat = current?.totalGuests || 0; }
      nextNationalityEntries = this.normalizeTourNationalitiesForWrite(tour, totalGuestsForNat);
      this.validateTourNationalities(nextNationalityEntries, totalGuestsForNat);
      const primary = nextNationalityEntries[0];
      updates.nationality_id = primary.id; updates.nationality_name_at_booking = primary.nameAtBooking;
    }
    if (tour.clientName !== undefined) updates.client_name = tour.clientName;
    if (tour.adults !== undefined) updates.adults = tour.adults;
    if (tour.children !== undefined) updates.children = tour.children;
    if (tour.totalGuests !== undefined) updates.total_guests = tour.totalGuests;
    if (tour.driverName !== undefined) updates.driver_name = tour.driverName;
    if (tour.clientPhone !== undefined) updates.client_phone = tour.clientPhone;
    if (tour.startDate !== undefined) updates.start_date = tour.startDate;
    if (tour.endDate !== undefined) updates.end_date = tour.endDate;
    if (tour.totalDays !== undefined) updates.total_days = tour.totalDays;
    if (tour.notes !== undefined) updates.notes = tour.notes;
    if (tour.waterExpenseDismissed !== undefined) updates.water_warning_dismissed = tour.waterExpenseDismissed;
    if (tour.hasZeroPrice !== undefined) updates.has_zero_price = tour.hasZeroPrice;
    if (tour.hasDuplicateDestNames !== undefined) updates.has_duplicate_dest_names = tour.hasDuplicateDestNames;
    if (tour.missingWaterExpense !== undefined) updates.missing_water_expense = tour.missingWaterExpense;
    if (tour.hasUnpaidCommission !== undefined) updates.has_unpaid_commission = tour.hasUnpaidCommission;
    if (tour.allowanceTotal !== undefined) updates.allowance_total = tour.allowanceTotal;
    if (tour.summary !== undefined) {
      updates.total_tabs = tour.summary.totalTabs ?? 0; updates.advance_payment = tour.summary.advancePayment ?? 0;
      updates.total_after_advance = tour.summary.totalAfterAdvance ?? 0; updates.company_tip = tour.summary.companyTip ?? 0;
      updates.total_after_tip = tour.summary.totalAfterTip ?? 0; updates.collections_for_company = tour.summary.collectionsForCompany ?? 0;
      updates.total_after_collections = tour.summary.totalAfterCollections ?? 0; updates.final_total = tour.summary.finalTotal ?? 0;
    }

    const guestsChanged = tour.totalGuests !== undefined || tour.adults !== undefined || tour.children !== undefined;
    const daysChanged = tour.totalDays !== undefined || tour.startDate !== undefined || tour.endDate !== undefined;
    const previousTour = guestsChanged || daysChanged ? await this.getTour(id) : null;
    const { error } = await this.supabase.from('tours').update(updates).eq('id', id);
    if (error) throw error;
    if (nextNationalityEntries) await this.replaceTourNationalities(id, nextNationalityEntries);

    if (guestsChanged || daysChanged) {
      try {
        const currentTour = await this.getTour(id);
        if (currentTour) {
          const expenses = currentTour.expenses || [];
          for (let i = 0; i < expenses.length; i++) {
            if (isWaterExpense(expenses[i])) {
              const keepManualDays = typeof expenses[i].days === 'number' && expenses[i].days !== previousTour?.totalDays;
              const days = keepManualDays ? expenses[i].days : currentTour.totalDays || 0;
              await this.updateExpense(id, i, normalizeWaterExpenseLine({ ...expenses[i], days }, currentTour.totalGuests || 0, days));
            }
          }
        }
      } catch (e) { console.error('Error auto-updating water expense:', e); }
    }
  }

  async deleteTour(id: string): Promise<void> {
    console.log('SupabaseStore: Deleting tour with ID:', id);
    const { error } = await this.supabase.from('tours').delete().eq('id', id);
    if (error) { console.error('SupabaseStore: Delete tour error:', error); throw error; }
    console.log('SupabaseStore: Tour deleted successfully');
  }

  async deleteAllTours(): Promise<void> {
    const { error } = await this.supabase.from('tours').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
  }

  async duplicateTour(id: string): Promise<Tour> {
    const original = await this.getTour(id);
    if (!original) throw new Error('Tour not found');
    let newTourCode = `${original.tourCode} (Copy)`;
    let counter = 1;
    while (true) {
      const { data: existing } = await this.supabase.from('tours').select('id').ilike('tour_code', newTourCode).maybeSingle();
      if (!existing) break;
      counter++;
      newTourCode = `${original.tourCode} (Copy ${counter})`;
    }
    return this.createTour({
      tourCode: newTourCode, companyRef: original.companyRef, landOperatorRef: original.landOperatorRef,
      guideRef: original.guideRef, clientNationalityRef: original.clientNationalityRef, clientNationalities: original.clientNationalities,
      clientName: original.clientName, clientPhone: original.clientPhone, adults: original.adults, children: original.children,
      driverName: original.driverName, startDate: original.startDate, endDate: original.endDate,
    });
  }
}
