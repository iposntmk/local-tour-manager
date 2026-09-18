import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type {
  Tour, Destination, Expense, Meal, Allowance,
  Shopping as TourShopping, TourQuery, TourNationality,
  TourInput, TourSummary, TourListResult, PaymentMethod, TourLineAttachment,
} from '@/types/tour';
import { differenceInDays } from 'date-fns';
import { enrichTourWithSummary, enrichToursWithSummaries } from '@/lib/tour-utils';
import { stripTourShoppingForProfile } from '@/lib/shopping-access';
import { isWaterExpense, normalizeWaterExpenseLine } from '@/lib/water-expense-utils';
import { TourSubcollectionError } from '@/lib/datastore/tour-errors';
import { mapTour, mapTourPayment, mapTourShopping, mapLineReviewFields } from '../mappers';
import type { TourRowWithDetails, TourPaymentRow } from '../store-types';
import type { UserProfile } from '@/types/user';
import { MASTER_ADMIN_EMAIL } from '@/lib/auth-constants';
import {
  attachLineTypeAttachments,
  attachTourLineAttachments,
  mapTourDestinationLine,
  mapTourExpenseLine,
  mapTourMealLine,
} from './tour-line-mappers';
import type { TourBulkLines } from './tour-bulk-insert';
import {
  applyTourNationalities,
  normalizeTourNationalitiesForWrite,
  validateTourNationalities,
} from './tour-nationality-utils';
import {
  TOUR_UPDATE_SNAPSHOT_SELECT,
  buildTourUpdatePayload,
  mapTourUpdateSnapshot,
  resolveNextDays,
  resolveNextGuests,
  sameNationalities,
  sameTourCode,
  type TourUpdateSnapshot,
} from './tour-update-helpers';

export class TourCrudModule {
  declare protected supabase: SupabaseClient<Database>;
  declare updateExpense: (tourId: string, index: number, expense: Expense) => Promise<void>;
  declare getExpenses: (tourId: string) => Promise<Expense[]>;
  declare insertTourLinesBulk: (tourId: string, lines: TourBulkLines) => Promise<void>;
  declare updateTour: (id: string, tour: Partial<Tour>) => Promise<void>;
  declare listTourLineAttachments: (tourId: string) => Promise<TourLineAttachment[]>;
  declare getCurrentUserProfile: () => Promise<UserProfile | undefined>;
  declare recalculateTourSummary: (tourId: string) => Promise<void>;
  declare persistTourSummary: (tour: Tour) => Promise<void>;

  /**
   * Ghi đè danh sách quốc tịch của tour theo kiểu upsert-rồi-dọn thay vì delete-rồi-insert.
   * Delete-rồi-insert tạo khoảng trống: hai lần lưu chồng nhau (autosave debounce ngắn hơn
   * thời gian lưu) sẽ xen kẽ delete/insert và lần sau đụng UNIQUE(tour_id, nationality_id).
   */
  private async replaceTourNationalities(tourId: string, nationalities: TourNationality[]): Promise<void> {
    if (nationalities.length > 0) {
      const { error: upsertError } = await this.supabase.from('tour_nationalities').upsert(
        nationalities.map((n) => ({ tour_id: tourId, nationality_id: n.id, nationality_name_at_booking: n.nameAtBooking, pax_count: n.paxCount })),
        { onConflict: 'tour_id,nationality_id' }
      );
      if (upsertError) throw upsertError;
    }
    let deleteQuery = this.supabase.from('tour_nationalities').delete().eq('tour_id', tourId);
    if (nationalities.length > 0) {
      deleteQuery = deleteQuery.not('nationality_id', 'in', `(${nationalities.map((n) => n.id).join(',')})`);
    }
    const { error: deleteError } = await deleteQuery;
    if (deleteError) throw deleteError;
  }

  async listTours(query?: TourQuery, options?: { includeDetails?: boolean }): Promise<TourListResult> {
    const includeDetails = options?.includeDetails ?? false;
    const currentProfile = await this.getCurrentUserProfile();
    let queryBuilder = this.supabase.from('tours').select(
      includeDetails
        ? `*, tour_destinations(*), tour_expenses(*), tour_meals(*), tour_allowances(*), tour_shoppings(*, shopping_commission_payments(*)), tour_nationalities(*)`
        : `*, tour_nationalities(*), tour_shoppings(id, name, price, net_commission, shopping_commission_payments(amount))`,
      { count: 'estimated' }
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
      applyTourNationalities(tour, typedRow.tour_nationalities);
      if (includeDetails) {
        tour.destinations = (typedRow.tour_destinations || []).map(mapTourDestinationLine);
        tour.expenses = (typedRow.tour_expenses || []).map(mapTourExpenseLine);
        tour.meals = (typedRow.tour_meals || []).map(mapTourMealLine);
        tour.allowances = (typedRow.tour_allowances || []).map((a) => ({ date: a.date, name: a.name, price: Number(a.price) || 0, quantity: a.quantity || 1, categoryId: a.category_id ?? undefined, ...mapLineReviewFields(a) }));
        tour.detailsLoaded = true;
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
    applyTourNationalities(tour, row.tour_nationalities);
    tour.payments = (row.tour_payments || []).map((p: TourPaymentRow) => mapTourPayment(p));
    tour.destinations = (row.tour_destinations || []).map(mapTourDestinationLine);
    tour.expenses = (row.tour_expenses || []).map(mapTourExpenseLine);
    tour.meals = (row.tour_meals || []).map(mapTourMealLine);
    tour.allowances = (row.tour_allowances || []).map((a: any) => ({ date: a.date, name: a.name, price: Number(a.price) || 0, quantity: a.quantity || 1, categoryId: a.category_id ?? undefined, ...mapLineReviewFields(a) }));
    tour.shoppings = (row.tour_shoppings || []).map((s: any) => mapTourShopping(s));
    tour.detailsLoaded = true;
    attachTourLineAttachments(tour, await this.listTourLineAttachments(id));
    const currentProfile = await this.getCurrentUserProfile();
    return enrichTourWithSummary(stripTourShoppingForProfile(tour, currentProfile));
  }

  // Lightweight fetch for TourDetail initial load: tour row + summary columns + nationalities
  // + payments only. Sub-collections (destinations/expenses/meals/allowances/shoppings) are
  // loaded lazily per-tab via listTour* below. Do NOT enrichTourWithSummary here — keep the
  // stored summary columns (mapTour) instead of recomputing from empty arrays.
  async getTourInfo(id: string): Promise<Tour | null> {
    const { data, error } = await this.supabase.from('tours').select(`
        *, tour_nationalities(*), tour_payments(*)
      `).eq('id', id)
      .order('paid_at', { foreignTable: 'tour_payments', ascending: false })
      .single();
    if (error || !data) return null;
    const tour = mapTour(data as any);
    const row: any = data;
    applyTourNationalities(tour, row.tour_nationalities);
    tour.payments = (row.tour_payments || []).map((p: TourPaymentRow) => mapTourPayment(p));
    tour.detailsLoaded = false;
    const currentProfile = await this.getCurrentUserProfile();
    return stripTourShoppingForProfile(tour, currentProfile);
  }

  async createTour(tour: TourInput & { destinations?: Destination[]; expenses?: Expense[]; meals?: Meal[]; allowances?: Allowance[]; shoppings?: TourShopping[]; summary?: TourSummary }): Promise<Tour> {
    const { data: existing } = await this.supabase.from('tours').select('id').ilike('tour_code', tour.tourCode).maybeSingle();
    if (existing) throw new Error('A tour with this tour code already exists');

    const totalGuests = (tour.adults || 0) + (tour.children || 0);
    const totalDays = Math.max(1, differenceInDays(new Date(tour.endDate), new Date(tour.startDate)) + 1);
    const nationalityEntries = normalizeTourNationalitiesForWrite(tour, totalGuests);
    validateTourNationalities(nationalityEntries, totalGuests);
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
    const tourId = data.id;

    try {
      // Chèn hàng loạt: mỗi bảng con 1 request, không tính lại tổng kết sau từng dòng
      // (trước đây mỗi dòng kéo theo một lần đọc full tour + ghi lại → import rất chậm).
      await this.insertTourLinesBulk(tourId, {
        destinations: tour.destinations,
        expenses: [
          {
            name: 'Nước uống cho khách 10k/1 khách / 1 ngày',
            price: 10000, date: tour.startDate, guests: totalGuests, days: totalDays,
          },
          ...(tour.expenses ?? []),
        ],
        meals: tour.meals,
        allowances: tour.allowances,
        shoppings: tour.shoppings,
      });
    } catch (subcollectionError) {
      console.error('Error adding subcollections:', subcollectionError);
      // Tour đã nằm trong DB — không rollback, nhưng phải báo lên để caller
      // không hiển thị "thành công" cho một bản ghi thiếu dòng chi tiết.
      const partialTour = await this.getTour(tourId) as Tour;
      throw new TourSubcollectionError(partialTour, subcollectionError);
    }

    // Đọc tour đầy đủ một lần rồi ghi tổng kết từ chính bản đọc đó. Không dùng
    // `tour.summary` của caller: nó được tính trước khi thêm dòng nước uống nên đã cũ.
    const createdTour = await this.getTour(tourId) as Tour;
    await this.persistTourSummary(createdTour);
    return createdTour;
  }

  private async readTourUpdateSnapshot(id: string): Promise<TourUpdateSnapshot | null> {
    const { data, error } = await this.supabase.from('tours')
      .select(TOUR_UPDATE_SNAPSHOT_SELECT).eq('id', id).single();
    if (error || !data) return null;
    return mapTourUpdateSnapshot(data);
  }

  /**
   * Đồng bộ dòng "nước uống cho khách" khi số khách/số ngày đổi. Chỉ đọc bảng
   * tour_expenses thay vì `getTour()` (join toàn bộ sub-collection).
   */
  private async syncWaterExpenseLines(
    id: string, previousDays: number, nextGuests: number, nextDays: number
  ): Promise<void> {
    try {
      const expenses = await this.getExpenses(id);
      for (let i = 0; i < expenses.length; i++) {
        if (!isWaterExpense(expenses[i])) continue;
        const keepManualDays = typeof expenses[i].days === 'number' && expenses[i].days !== previousDays;
        const days = keepManualDays ? (expenses[i].days as number) : nextDays;
        await this.updateExpense(id, i, normalizeWaterExpenseLine({ ...expenses[i], days }, nextGuests, days));
      }
    } catch (e) { console.error('Error auto-updating water expense:', e); }
  }

  async updateTour(id: string, tour: Partial<Tour>): Promise<void> {
    // Một lượt đọc nhẹ thay cho tối đa 3 lần `getTour()`: đủ để biết trường nào
    // thật sự đổi, nhờ đó bỏ được check trùng mã tour / ghi lại quốc tịch /
    // đồng bộ dòng nước uống khi giá trị không đổi.
    const snapshot = await this.readTourUpdateSnapshot(id);
    const updates = buildTourUpdatePayload(tour);

    if (tour.tourCode !== undefined) {
      if (!sameTourCode(tour.tourCode, snapshot?.tourCode)) {
        const { data: existing } = await this.supabase.from('tours').select('id').ilike('tour_code', tour.tourCode).neq('id', id).maybeSingle();
        if (existing) throw new Error('A tour with this tour code already exists');
      }
      updates.tour_code = tour.tourCode;
    }

    let nextNationalityEntries: TourNationality[] | undefined;
    if (tour.clientNationalities !== undefined || tour.clientNationalityRef !== undefined) {
      const totalGuestsForNat = resolveNextGuests(tour, snapshot);
      const entries = normalizeTourNationalitiesForWrite(tour, totalGuestsForNat);
      validateTourNationalities(entries, totalGuestsForNat);
      const primary = entries[0];
      updates.nationality_id = primary.id; updates.nationality_name_at_booking = primary.nameAtBooking;
      if (!sameNationalities(entries, snapshot?.nationalities ?? [])) nextNationalityEntries = entries;
    }

    const nextGuests = resolveNextGuests(tour, snapshot);
    const nextDays = resolveNextDays(tour, snapshot);
    const guestsOrDaysChanged = !snapshot
      || nextGuests !== snapshot.totalGuests
      || nextDays !== snapshot.totalDays;

    const { error } = await this.supabase.from('tours').update(updates).eq('id', id);
    if (error) throw error;
    if (nextNationalityEntries) await this.replaceTourNationalities(id, nextNationalityEntries);

    if (guestsOrDaysChanged) {
      await this.syncWaterExpenseLines(id, snapshot?.totalDays ?? 0, nextGuests, nextDays);
    }

    // Dismissing the water warning must refresh the denormalized warning flags
    // (missing_water_expense) that the tour list reads; otherwise the column stays stale.
    if (tour.waterExpenseDismissed !== undefined && tour.missingWaterExpense === undefined) {
      await this.recalculateTourSummary(id);
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
