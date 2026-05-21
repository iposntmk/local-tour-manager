import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type {
  Guide,
  Language,
  Company,
  Nationality,
  Province,
  TouristDestination,
  Shopping,
  ExpenseCategory,
  DetailedExpense,
  GuideInput,
  LanguageInput,
  CompanyInput,
  NationalityInput,
  ProvinceInput,
  TouristDestinationInput,
  ShoppingInput,
  ExpenseCategoryInput,
  DetailedExpenseInput,
} from '@/types/master';
import type {
  Tour,
  Destination,
  Expense,
  Meal,
  Allowance,
  Shopping as TourShopping,
  TourQuery,
  EntityRef,
  TourNationality,
  TourInput,
  TourSummary,
  TourListResult,
  LineStatus,
  LineType,
  SettlementStatus,
  SubmissionHistoryEvent,
  TourPayment,
  TourPaymentInput,
  PaymentMethod,
  PaymentStatus,
} from '@/types/tour';
import type { SearchQuery } from '@/types/datastore';
import { differenceInDays } from 'date-fns';
import { enrichTourWithSummary, enrichToursWithSummaries } from '@/lib/tour-utils';
import {
  mapTour,
  mapTourPayment,
  mapLineReviewFields,
} from './mappers';
import type {
  TourRowWithDetails,
  TourNationalityRow,
  TourPaymentRow,
  TourPaymentInsert,
  TourPaymentUpdateRow,
} from './store-types';

export class TourOperationsModule {
  declare protected supabase: SupabaseClient<Database>;

  // Cross-module method declarations (needed for exportData / importData)
  declare listGuides: (query?: SearchQuery) => Promise<Guide[]>;
  declare listLanguages: (query?: SearchQuery) => Promise<Language[]>;
  declare listCompanies: (query?: SearchQuery) => Promise<Company[]>;
  declare listNationalities: (query?: SearchQuery) => Promise<Nationality[]>;
  declare listProvinces: (query?: SearchQuery) => Promise<Province[]>;
  declare listTouristDestinations: (query?: SearchQuery) => Promise<TouristDestination[]>;
  declare listShoppings: (query?: SearchQuery) => Promise<Shopping[]>;
  declare listExpenseCategories: (query?: SearchQuery) => Promise<ExpenseCategory[]>;
  declare listDetailedExpenses: (query?: SearchQuery) => Promise<DetailedExpense[]>;
  declare createGuide: (guide: GuideInput) => Promise<Guide>;
  declare createLanguage: (language: LanguageInput) => Promise<Language>;
  declare createCompany: (company: CompanyInput) => Promise<Company>;
  declare createNationality: (nationality: NationalityInput) => Promise<Nationality>;
  declare createProvince: (province: ProvinceInput) => Promise<Province>;
  declare createTouristDestination: (destination: TouristDestinationInput) => Promise<TouristDestination>;
  declare createShopping: (shopping: ShoppingInput) => Promise<Shopping>;
  declare createExpenseCategory: (category: ExpenseCategoryInput) => Promise<ExpenseCategory>;
  declare createDetailedExpense: (expense: DetailedExpenseInput) => Promise<DetailedExpense>;

  // ------------------------------------------------------------------ private helpers

  private mapTourNationality(row: TourNationalityRow): TourNationality {
    return {
      id: row.nationality_id,
      nameAtBooking: row.nationality_name_at_booking || '',
      paxCount: Number(row.pax_count) || 0,
    };
  }

  private applyTourNationalities(tour: Tour, rows?: TourNationalityRow[] | null): Tour {
    const nationalities = (rows || [])
      .map((row) => this.mapTourNationality(row))
      .filter((nationality) => nationality.id);

    if (nationalities.length > 0) {
      tour.clientNationalities = nationalities;
      tour.clientNationalityRef = {
        id: nationalities[0].id,
        nameAtBooking: nationalities[0].nameAtBooking,
      };
      return tour;
    }

    if (tour.clientNationalityRef.id) {
      tour.clientNationalities = [
        {
          ...tour.clientNationalityRef,
          paxCount: Math.max(tour.totalGuests || 0, 1),
        },
      ];
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
    source.forEach((nationality) => {
      if (!nationality.id) return;
      byId.set(nationality.id, {
        id: nationality.id,
        nameAtBooking: nationality.nameAtBooking || '',
        paxCount: Math.max(1, Math.floor(Number(nationality.paxCount) || 0)),
      });
    });

    return Array.from(byId.values());
  }

  private validateTourNationalities(nationalities: TourNationality[], totalGuests: number): void {
    if (nationalities.length === 0) {
      throw new Error('Vui lòng chọn ít nhất một quốc tịch.');
    }

    const totalNationalityPax = nationalities.reduce((sum, nationality) => sum + nationality.paxCount, 0);
    if (totalGuests > 0 && totalNationalityPax !== totalGuests) {
      throw new Error('Tổng pax theo quốc tịch phải bằng tổng khách.');
    }
  }

  private async replaceTourNationalities(tourId: string, nationalities: TourNationality[]): Promise<void> {
    const { error: deleteError } = await this.supabase
      .from('tour_nationalities')
      .delete()
      .eq('tour_id', tourId);
    if (deleteError) throw deleteError;

    if (nationalities.length === 0) {
      return;
    }

    const records = nationalities.map((nationality) => ({
      tour_id: tourId,
      nationality_id: nationality.id,
      nationality_name_at_booking: nationality.nameAtBooking,
      pax_count: nationality.paxCount,
    }));

    const { error: insertError } = await this.supabase
      .from('tour_nationalities')
      .insert(records);
    if (insertError) throw insertError;
  }

  private lineTypeToTable(lineType: LineType): string {
    switch (lineType) {
      case 'destination': return 'tour_destinations';
      case 'expense': return 'tour_expenses';
      case 'meal': return 'tour_meals';
      case 'allowance': return 'tour_allowances';
      case 'shopping': return 'tour_shoppings';
    }
  }

  private async insertSubmissionHistory(
    tourId: string,
    event: 'submitted' | 'returned' | 'approved' | 'reopened',
    note?: string
  ): Promise<void> {
    const { data: authUser } = await this.supabase.auth.getUser();
    const actorId = authUser.user?.id;
    let actorRole: string | undefined;
    if (actorId) {
      const { data: profile } = await this.supabase
        .from('user_profiles')
        .select('role, settlement_role')
        .eq('id', actorId)
        .maybeSingle();
      if (profile) {
        actorRole = (profile as any).settlement_role || (profile as any).role || undefined;
      }
    }
    const { error } = await this.supabase.from('tour_submission_history').insert({
      tour_id: tourId,
      event,
      actor_id: actorId ?? null,
      actor_role: actorRole ?? null,
      note: note ?? null,
    });
    if (error) throw error;
  }

  // Helper to recalculate and save tour summary
  private async recalculateTourSummary(tourId: string): Promise<void> {
    // Fetch the full tour with all details
    const tour = await this.getTour(tourId);
    if (!tour) return;

    // Calculate summary using the utility function (already enriched by getTour)
    const summary = tour.summary;

    // Save to database
    await this.supabase.from('tours').update({
      total_tabs: summary.totalTabs,
      advance_payment: summary.advancePayment,
      total_after_advance: summary.totalAfterAdvance,
      company_tip: summary.companyTip,
      total_after_tip: summary.totalAfterTip,
      collections_for_company: summary.collectionsForCompany,
      total_after_collections: summary.totalAfterCollections,
      final_total: summary.finalTotal,
    }).eq('id', tourId);
  }

  // ------------------------------------------------------------------ Tours CRUD

  async listTours(query?: TourQuery, options?: { includeDetails?: boolean }): Promise<TourListResult> {
    const includeDetails = options?.includeDetails ?? false;

    // Fetch tours with optional nested relations to avoid unnecessary payload
    let queryBuilder = this.supabase
      .from('tours')
      .select(
        includeDetails
          ? `
        *,
        tour_destinations(*),
        tour_expenses(*),
        tour_meals(*),
        tour_allowances(*),
        tour_shoppings(*),
        tour_nationalities(*)
      `
          : `*, tour_allowances(price, quantity), tour_nationalities(*)`,
        { count: 'exact' }
      );

    // Apply sorting based on query parameters
    const sortBy = query?.sortBy || 'startDate';
    const sortOrder = query?.sortOrder || 'desc';

    const sortColumnMap: Record<string, string> = {
      startDate: 'start_date',
      endDate: 'end_date',
      tourCode: 'tour_code',
      clientName: 'client_name',
      createdAt: 'created_at',
    };

    queryBuilder = queryBuilder.order(sortColumnMap[sortBy] || 'start_date', { ascending: sortOrder === 'asc' });

    if (includeDetails) {
      // Ensure nested arrays are consistently ordered by date
      queryBuilder = queryBuilder
        .order('date', { foreignTable: 'tour_destinations' })
        .order('date', { foreignTable: 'tour_expenses' })
        .order('date', { foreignTable: 'tour_meals' })
        .order('date', { foreignTable: 'tour_allowances' })
        .order('date', { foreignTable: 'tour_shoppings' });
    }

    // Granular search fields (prefer these for performance)
    if (query?.tourCodeLike) {
      const like = `%${query.tourCodeLike.trim()}%`;
      queryBuilder = queryBuilder.ilike('tour_code', like);
    } else if (query?.tourCode) {
      const like = `%${query.tourCode.trim()}%`;
      queryBuilder = queryBuilder.ilike('tour_code', like);
    }

    if (query?.companyNameLike) {
      const like = `%${query.companyNameLike.trim()}%`;
      queryBuilder = queryBuilder.ilike('company_name_at_booking', like);
    }

    if (query?.landOperatorNameLike) {
      const like = `%${query.landOperatorNameLike.trim()}%`;
      queryBuilder = queryBuilder.ilike('land_operator_name_at_booking', like);
    }

    if (query?.dateLike || query?.dateLike2 || query?.dateRawLike) {
      const like1 = query?.dateLike ? `%${query.dateLike.trim()}%` : undefined;
      const like2 = query?.dateLike2 ? `%${query.dateLike2.trim()}%` : undefined;
      const likeRaw = query?.dateRawLike ? `%${query.dateRawLike.trim()}%` : undefined;
      const parts: string[] = [];
      if (like1) parts.push(`start_date.ilike.${like1}`);
      if (like2) parts.push(`start_date.ilike.${like2}`);
      if (likeRaw) parts.push(`start_date.ilike.${likeRaw}`);
      if (parts.length === 1) {
        // Only one like — apply directly
        const single = like1 || like2 || likeRaw;
        queryBuilder = queryBuilder.ilike('start_date', single as string);
      } else if (parts.length > 1) {
        queryBuilder = queryBuilder.or(parts.join(','));
      }
    }
    if (query?.clientName) queryBuilder = queryBuilder.ilike('client_name', `%${query.clientName}%`);
    if (query?.companyId) queryBuilder = queryBuilder.eq('company_id', query.companyId);
    if (query?.landOperatorId) queryBuilder = queryBuilder.eq('land_operator_id', query.landOperatorId);
    if (query?.guideId) queryBuilder = queryBuilder.eq('guide_id', query.guideId);
    if (query?.startDate) queryBuilder = queryBuilder.gte('end_date', query.startDate);
    if (query?.endDate) queryBuilder = queryBuilder.lte('start_date', query.endDate);
    if (query?.nationalityId) {
      const { data: nationalityTourRows, error: nationalityFilterError } = await this.supabase
        .from('tour_nationalities')
        .select('tour_id')
        .eq('nationality_id', query.nationalityId);
      if (nationalityFilterError) throw nationalityFilterError;

      const tourIds = Array.from(new Set((nationalityTourRows || []).map((row) => row.tour_id)));
      if (tourIds.length > 0) {
        queryBuilder = queryBuilder.or(`nationality_id.eq.${query.nationalityId},id.in.(${tourIds.join(',')})`);
      } else {
        queryBuilder = queryBuilder.eq('nationality_id', query.nationalityId);
      }
    }
    if (query?.settlementStatus) queryBuilder = queryBuilder.eq('settlement_status', query.settlementStatus);
    if (query?.paymentStatus) queryBuilder = queryBuilder.eq('payment_status', query.paymentStatus);

    const limit = typeof query?.limit === 'number' ? query.limit : undefined;
    const offset = typeof query?.offset === 'number' ? query.offset : undefined;

    if (typeof limit === 'number' && limit > 0) {
      if (typeof offset === 'number' && offset >= 0) {
        queryBuilder = queryBuilder.range(offset, offset + limit - 1);
      } else {
        queryBuilder = queryBuilder.limit(limit);
      }
    } else if (limit === 0) {
      queryBuilder = queryBuilder.limit(0);
    }

    const { data, error, count } = await queryBuilder;
    if (error) throw error;

    const tours = (data || []).map((row) => {
      const typedRow = row as TourRowWithDetails;
      const tour = mapTour(row as any);
      this.applyTourNationalities(tour, typedRow.tour_nationalities);
      if (includeDetails) {
        tour.destinations = (typedRow.tour_destinations || []).map((d) => ({
          name: d.name,
          price: Number(d.price) || 0,
          date: d.date,
          guests: d.guests !== null && d.guests !== undefined ? Number(d.guests) : undefined,
          ...mapLineReviewFields(d),
        }));
        tour.expenses = (typedRow.tour_expenses || []).map((e) => ({
          name: e.name,
          price: Number(e.price) || 0,
          date: e.date,
          guests: e.guests !== null && e.guests !== undefined ? Number(e.guests) : undefined,
          ...mapLineReviewFields(e),
        }));
        tour.meals = (typedRow.tour_meals || []).map((m) => ({
          name: m.name,
          price: Number(m.price) || 0,
          date: m.date,
          guests: m.guests !== null && m.guests !== undefined ? Number(m.guests) : undefined,
          ...mapLineReviewFields(m),
        }));
        tour.allowances = (typedRow.tour_allowances || []).map((a) => ({
          date: a.date,
          name: a.name,
          price: Number(a.price) || 0,
          quantity: a.quantity || 1,
          categoryId: a.category_id ?? undefined,
          ...mapLineReviewFields(a),
        }));
        tour.shoppings = (typedRow.tour_shoppings || []).map((s) => ({
          name: s.name,
          price: Number(s.price) || 0,
          date: s.date,
          ...mapLineReviewFields(s),
        }));
      } else {
        // When not including full details, still map allowances for total calculation
        tour.allowances = (typedRow.tour_allowances || []).map((a) => ({
          date: '',
          name: '',
          price: Number(a.price) || 0,
          quantity: a.quantity || 1,
        }));
      }
      return tour;
    });

    // Enrich tours with calculated summaries ONLY if includeDetails is true
    const enrichedTours = includeDetails ? enrichToursWithSummaries(tours) : tours;

    return {
      tours: enrichedTours,
      total: typeof count === 'number' ? count : tours.length,
    };
  }

  async getTour(id: string): Promise<Tour | null> {
    // Single query with nested relations for the tour detail
    const { data, error } = await this.supabase
      .from('tours')
      .select(`
        *,
        tour_destinations(*),
        tour_expenses(*),
        tour_meals(*),
        tour_allowances(*),
        tour_shoppings(*),
        tour_nationalities(*),
        tour_payments(*)
      `)
      .eq('id', id)
      .order('date', { foreignTable: 'tour_destinations' })
      .order('date', { foreignTable: 'tour_expenses' })
      .order('date', { foreignTable: 'tour_meals' })
      .order('date', { foreignTable: 'tour_allowances' })
      .order('date', { foreignTable: 'tour_shoppings' })
      .order('paid_at', { foreignTable: 'tour_payments', ascending: false })
      .single();

    if (error) return null;
    if (!data) return null;

    const tour = mapTour(data as any);
    const row: any = data;
    this.applyTourNationalities(tour, row.tour_nationalities);
    tour.payments = (row.tour_payments || []).map((p: TourPaymentRow) => mapTourPayment(p));
    tour.destinations = (row.tour_destinations || []).map((d: any) => ({
      name: d.name,
      price: Number(d.price) || 0,
      date: d.date,
      guests: d.guests !== null && d.guests !== undefined ? Number(d.guests) : undefined,
      ...mapLineReviewFields(d),
    }));
    tour.expenses = (row.tour_expenses || []).map((e: any) => ({
      name: e.name,
      price: Number(e.price) || 0,
      date: e.date,
      guests: e.guests !== null && e.guests !== undefined ? Number(e.guests) : undefined,
      ...mapLineReviewFields(e),
    }));
    tour.meals = (row.tour_meals || []).map((m: any) => ({
      name: m.name,
      price: Number(m.price) || 0,
      date: m.date,
      guests: m.guests !== null && m.guests !== undefined ? Number(m.guests) : undefined,
      ...mapLineReviewFields(m),
    }));
    tour.allowances = (row.tour_allowances || []).map((a: any) => ({
      date: a.date,
      name: a.name,
      price: Number(a.price) || 0,
      quantity: a.quantity || 1,
      categoryId: a.category_id ?? undefined,
      ...mapLineReviewFields(a),
    }));
    tour.shoppings = (row.tour_shoppings || []).map((s: any) => ({
      name: s.name,
      price: Number(s.price) || 0,
      date: s.date,
      ...mapLineReviewFields(s),
    }));

    // Enrich tour with calculated summary
    return enrichTourWithSummary(tour);
  }

  async createTour(tour: TourInput & { destinations?: Destination[]; expenses?: Expense[]; meals?: Meal[]; allowances?: Allowance[]; shoppings?: TourShopping[]; summary?: TourSummary }): Promise<Tour> {
    // Check for duplicate tour code
    const { data: existing } = await this.supabase
      .from('tours')
      .select('id')
      .ilike('tour_code', tour.tourCode)
      .maybeSingle();

    if (existing) {
      throw new Error('A tour with this tour code already exists');
    }

    const totalGuests = (tour.adults || 0) + (tour.children || 0);
    // Total Days = (end date - start date) + 1 (inclusive, counting both start and end days)
    const totalDays = Math.max(1, differenceInDays(new Date(tour.endDate), new Date(tour.startDate)) + 1);
    const nationalityEntries = this.normalizeTourNationalitiesForWrite(tour, totalGuests);
    this.validateTourNationalities(nationalityEntries, totalGuests);
    const primaryNationality = nationalityEntries[0];

    const { data, error } = await this.supabase
      .from('tours')
      .insert({
        tour_code: tour.tourCode,
        company_id: tour.companyRef.id,
        company_name_at_booking: tour.companyRef.nameAtBooking,
        land_operator_id: tour.landOperatorRef?.id || null,
        land_operator_name_at_booking: tour.landOperatorRef?.nameAtBooking || null,
        guide_id: tour.guideRef.id,
        guide_name_at_booking: tour.guideRef.nameAtBooking,
        nationality_id: primaryNationality.id,
        nationality_name_at_booking: primaryNationality.nameAtBooking,
        client_name: tour.clientName,
        adults: tour.adults,
        children: tour.children,
        total_guests: totalGuests,
        driver_name: tour.driverName || '',
        client_phone: tour.clientPhone || '',
        start_date: tour.startDate,
        end_date: tour.endDate,
        total_days: totalDays,
        notes: tour.notes || '',
        total_tabs: tour.summary?.totalTabs ?? 0,
        advance_payment: tour.summary?.advancePayment ?? 0,
        total_after_advance: tour.summary?.totalAfterAdvance ?? 0,
        company_tip: tour.summary?.companyTip ?? 0,
        total_after_tip: tour.summary?.totalAfterTip ?? 0,
        collections_for_company: tour.summary?.collectionsForCompany ?? 0,
        total_after_collections: tour.summary?.totalAfterCollections ?? 0,
        final_total: tour.summary?.finalTotal ?? 0,
      })
      .select()
      .single();


    if (error) {
      console.error('Supabase createTour error:', error);
      if (error.code === '23505') {
        throw new Error('A tour with this tour code already exists');
      } else if (error.code === '23503') {
        throw new Error('Invalid reference to company, guide, or nationality');
      } else if (error.code === '23502') {
        throw new Error('Required field is missing');
      } else if (error.code === '22001') {
        throw new Error('Data value too long');
      } else if (error.code === '22003') {
        throw new Error('Numeric value out of range');
      } else if (error.code === '22007') {
        throw new Error('Invalid date format');
      } else if (error.code === '42P01') {
        throw new Error('Database table not found');
      } else if (error.code === '42501') {
        throw new Error('Permission denied');
      } else {
        // Log detailed error information
        console.error('Supabase error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          operation: 'createTour',
          tourData: tour
        });
        throw new Error(`Database error: ${error.message} (Code: ${error.code})`);
      }
    }

    await this.replaceTourNationalities(data.id, nationalityEntries);
    const createdTour = await this.getTour(data.id) as Tour;

    // Add subcollections if provided
    try {
      if (tour.destinations && tour.destinations.length > 0) {
        await Promise.all(tour.destinations.map(dest => this.addDestination(createdTour.id, dest)));
      }

      // Auto-add default water expense for new tours
      const defaultWaterExpense: Expense = {
        name: 'Nước uống cho khách 10k/1 khách / 1 ngày',
        price: 10000,
        date: tour.startDate,
        guests: totalGuests * totalDays, // totalGuests * totalDays
      };

      // Add default water expense first
      await this.addExpense(createdTour.id, defaultWaterExpense);

      // Then add any additional expenses provided
      if (tour.expenses && tour.expenses.length > 0) {
        await Promise.all(tour.expenses.map(exp => this.addExpense(createdTour.id, exp)));
      }

      if (tour.meals && tour.meals.length > 0) {
        await Promise.all(tour.meals.map(meal => this.addMeal(createdTour.id, meal)));
      }
      if (tour.allowances && tour.allowances.length > 0) {
        await Promise.all(tour.allowances.map(allow => this.addAllowance(createdTour.id, allow)));
      }
      if (tour.shoppings && tour.shoppings.length > 0) {
        await Promise.all(tour.shoppings.map(shop => this.addTourShopping(createdTour.id, shop)));
      }
      if (tour.summary) {
        await this.updateTour(createdTour.id, { summary: tour.summary });
      }
    } catch (subcollectionError) {
      console.error('Error adding subcollections:', subcollectionError);
      // Don't fail the entire import if subcollections fail
      // The main tour was created successfully
    }

    return createdTour;
  }

  async updateTour(id: string, tour: Partial<Tour>): Promise<void> {
    const updates: any = {};
    if (tour.tourCode !== undefined) {
      // Check for duplicate tour code (excluding current record)
      const { data: existing } = await this.supabase
        .from('tours')
        .select('id')
        .ilike('tour_code', tour.tourCode)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        throw new Error('A tour with this tour code already exists');
      }

      updates.tour_code = tour.tourCode;
    }
    if (tour.companyRef !== undefined) {
      updates.company_id = tour.companyRef.id;
      updates.company_name_at_booking = tour.companyRef.nameAtBooking;
    }
    if (tour.landOperatorRef !== undefined) {
      updates.land_operator_id = tour.landOperatorRef?.id || null;
      updates.land_operator_name_at_booking = tour.landOperatorRef?.nameAtBooking || null;
    }
    if (tour.guideRef !== undefined) {
      updates.guide_id = tour.guideRef.id;
      updates.guide_name_at_booking = tour.guideRef.nameAtBooking;
    }
    let nextNationalityEntries: TourNationality[] | undefined;
    if (tour.clientNationalities !== undefined || tour.clientNationalityRef !== undefined) {
      let totalGuestsForNationalities = tour.totalGuests;
      if (totalGuestsForNationalities === undefined && tour.adults !== undefined && tour.children !== undefined) {
        totalGuestsForNationalities = (tour.adults || 0) + (tour.children || 0);
      }
      if (totalGuestsForNationalities === undefined) {
        const currentTour = await this.getTour(id);
        totalGuestsForNationalities = currentTour?.totalGuests || 0;
      }

      nextNationalityEntries = this.normalizeTourNationalitiesForWrite(tour, totalGuestsForNationalities);
      this.validateTourNationalities(nextNationalityEntries, totalGuestsForNationalities);
      const primaryNationality = nextNationalityEntries[0];
      updates.nationality_id = primaryNationality.id;
      updates.nationality_name_at_booking = primaryNationality.nameAtBooking;
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
    if (tour.summary !== undefined) {
      updates.total_tabs = tour.summary.totalTabs ?? 0;
      updates.advance_payment = tour.summary.advancePayment ?? 0;
      updates.total_after_advance = tour.summary.totalAfterAdvance ?? 0;
      updates.company_tip = tour.summary.companyTip ?? 0;
      updates.total_after_tip = tour.summary.totalAfterTip ?? 0;
      updates.collections_for_company = tour.summary.collectionsForCompany ?? 0;
      updates.total_after_collections = tour.summary.totalAfterCollections ?? 0;
      updates.final_total = tour.summary.finalTotal ?? 0;
    }

    const { error } = await this.supabase.from('tours').update(updates).eq('id', id);
    if (error) throw error;

    if (nextNationalityEntries) {
      await this.replaceTourNationalities(id, nextNationalityEntries);
    }

    // Auto-update water expense when totalGuests or totalDays changes
    const guestsChanged = tour.totalGuests !== undefined || tour.adults !== undefined || tour.children !== undefined;
    const daysChanged = tour.totalDays !== undefined || tour.startDate !== undefined || tour.endDate !== undefined;

    if (guestsChanged || daysChanged) {
      try {
        // Get current tour to calculate new values
        const currentTour = await this.getTour(id);
        if (currentTour) {
          const newTotalGuests = currentTour.totalGuests || 0;
          const newTotalDays = currentTour.totalDays || 0;
          const newGuestsValue = newTotalGuests * newTotalDays;

          // Find water expense and update it
          const waterExpenseNames = [
            'Nước uống cho khách 10k/1 khách / 1 ngày',
            'Nước uống cho khách 15k/1 khách / 1 ngày',
          ];

          const expenses = currentTour.expenses || [];
          for (let i = 0; i < expenses.length; i++) {
            if (waterExpenseNames.includes(expenses[i].name || '')) {
              // Update the water expense (this will also call recalculateTourSummary)
              await this.updateExpense(id, i, { ...expenses[i], guests: newGuestsValue });
              break; // Only update the first water expense found
            }
          }
        }
      } catch (error) {
        console.error('Error auto-updating water expense:', error);
        // Don't fail the entire update if water expense update fails
      }
    }
  }

  async deleteTour(id: string): Promise<void> {
    console.log('SupabaseStore: Deleting tour with ID:', id);
    const { error } = await this.supabase.from('tours').delete().eq('id', id);
    if (error) {
      console.error('SupabaseStore: Delete tour error:', error);
      throw error;
    }
    console.log('SupabaseStore: Tour deleted successfully');
  }

  async deleteAllTours(): Promise<void> {
    const { error } = await this.supabase.from('tours').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
  }

  async duplicateTour(id: string): Promise<Tour> {
    const original = await this.getTour(id);
    if (!original) throw new Error('Tour not found');

    // Generate unique tour code
    let newTourCode = `${original.tourCode} (Copy)`;
    let counter = 1;

    while (true) {
      const { data: existing } = await this.supabase
        .from('tours')
        .select('id')
        .ilike('tour_code', newTourCode)
        .maybeSingle();

      if (!existing) break;

      counter++;
      newTourCode = `${original.tourCode} (Copy ${counter})`;
    }

    return this.createTour({
      tourCode: newTourCode,
      companyRef: original.companyRef,
      landOperatorRef: original.landOperatorRef,
      guideRef: original.guideRef,
      clientNationalityRef: original.clientNationalityRef,
      clientNationalities: original.clientNationalities,
      clientName: original.clientName,
      clientPhone: original.clientPhone,
      adults: original.adults,
      children: original.children,
      driverName: original.driverName,
      startDate: original.startDate,
      endDate: original.endDate,
    });
  }

  // ------------------------------------------------------------------ Tour Destinations

  async getDestinations(tourId: string): Promise<Destination[]> {
    const { data, error } = await this.supabase.from('tour_destinations').select('*').eq('tour_id', tourId).order('date');
    if (error) throw error;
    return (data || []).map((row) => ({
      name: row.name,
      price: Number(row.price) || 0,
      date: row.date,
      guests: typeof row.guests === 'number' ? row.guests : undefined,
    }));
  }

  async addDestination(tourId: string, destination: Destination): Promise<void> {
    const { error } = await this.supabase.from('tour_destinations').insert({
      tour_id: tourId,
      name: destination.name,
      price: destination.price,
      date: destination.date,
      guests: destination.guests ?? null,
    });
    if (error) {
      console.error('Supabase addDestination error:', error);
      if (error.code === '23503') {
        throw new Error('Invalid tour reference');
      } else if (error.code === '23502') {
        throw new Error('Required destination field is missing');
      } else if (error.code === '22001') {
        throw new Error('Destination data too long');
      } else if (error.code === '22003') {
        throw new Error('Invalid destination price');
      } else if (error.code === '22007') {
        throw new Error('Invalid destination date format');
      } else {
        throw new Error(`Failed to add destination: ${error.message}`);
      }
    }
    // Recalculate and save summary
    await this.recalculateTourSummary(tourId);
  }

  async updateDestination(tourId: string, index: number, destination: Destination): Promise<void> {
    const { data: rows } = await this.supabase.from('tour_destinations').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await this.supabase.from('tour_destinations').update({
        name: destination.name,
        price: destination.price,
        date: destination.date,
        guests: destination.guests ?? null,
      }).eq('id', rows[index].id);
      if (error) throw error;
      // Recalculate and save summary
      await this.recalculateTourSummary(tourId);
    }
  }

  async removeDestination(tourId: string, index: number): Promise<void> {
    const { data: rows } = await this.supabase.from('tour_destinations').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await this.supabase.from('tour_destinations').delete().eq('id', rows[index].id);
      if (error) throw error;
      // Recalculate and save summary
      await this.recalculateTourSummary(tourId);
    }
  }

  // ------------------------------------------------------------------ Tour Expenses

  async getExpenses(tourId: string): Promise<Expense[]> {
    const { data, error } = await this.supabase.from('tour_expenses').select('*').eq('tour_id', tourId).order('date');
    if (error) throw error;
    return (data || []).map((row) => ({
      name: row.name,
      price: Number(row.price) || 0,
      date: row.date,
      guests: row.guests !== null && row.guests !== undefined ? Number(row.guests) : undefined,
    }));
  }

  async addExpense(tourId: string, expense: Expense): Promise<void> {
    const { error } = await this.supabase.from('tour_expenses').insert({
      tour_id: tourId,
      name: expense.name,
      price: expense.price,
      date: expense.date,
      guests: expense.guests,
    });
    if (error) throw error;
    // Recalculate and save summary
    await this.recalculateTourSummary(tourId);
  }

  async updateExpense(tourId: string, index: number, expense: Expense): Promise<void> {
    const { data: rows } = await this.supabase.from('tour_expenses').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      console.log('Updating expense in DB - ID:', rows[index].id, 'Guests:', expense.guests);
      const updateData = {
        name: expense.name,
        price: expense.price,
        date: expense.date,
        guests: expense.guests,
      };
      console.log('Update data:', updateData);
      const { error } = await this.supabase.from('tour_expenses').update(updateData).eq('id', rows[index].id);
      if (error) {
        console.error('Error updating expense:', error);
        throw error;
      }
      console.log('Expense updated successfully in DB');
      // Recalculate and save summary
      await this.recalculateTourSummary(tourId);
    }
  }

  async removeExpense(tourId: string, index: number): Promise<void> {
    const { data: rows } = await this.supabase.from('tour_expenses').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await this.supabase.from('tour_expenses').delete().eq('id', rows[index].id);
      if (error) throw error;
      // Recalculate and save summary
      await this.recalculateTourSummary(tourId);
    }
  }

  // ------------------------------------------------------------------ Tour Meals

  async getMeals(tourId: string): Promise<Meal[]> {
    const { data, error } = await this.supabase.from('tour_meals').select('*').eq('tour_id', tourId).order('date');
    if (error) throw error;
    return (data || []).map((row) => ({
      name: row.name,
      price: Number(row.price) || 0,
      date: row.date,
      guests: row.guests !== null && row.guests !== undefined ? Number(row.guests) : undefined,
    }));
  }

  async addMeal(tourId: string, meal: Meal): Promise<void> {
    const { error } = await this.supabase.from('tour_meals').insert({
      tour_id: tourId,
      name: meal.name,
      price: meal.price,
      date: meal.date,
      guests: meal.guests ?? null,
    });
    if (error) throw error;
    // Recalculate and save summary
    await this.recalculateTourSummary(tourId);
  }

  async updateMeal(tourId: string, index: number, meal: Meal): Promise<void> {
    const { data: rows } = await this.supabase.from('tour_meals').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await this.supabase.from('tour_meals').update({
        name: meal.name,
        price: meal.price,
        date: meal.date,
        guests: meal.guests ?? null,
      }).eq('id', rows[index].id);
      if (error) throw error;
      // Recalculate and save summary
      await this.recalculateTourSummary(tourId);
    }
  }

  async removeMeal(tourId: string, index: number): Promise<void> {
    const { data: rows } = await this.supabase.from('tour_meals').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await this.supabase.from('tour_meals').delete().eq('id', rows[index].id);
      if (error) throw error;
      // Recalculate and save summary
      await this.recalculateTourSummary(tourId);
    }
  }

  // ------------------------------------------------------------------ Tour Allowances

  async getAllowances(tourId: string): Promise<Allowance[]> {
    const { data, error } = await this.supabase.from('tour_allowances').select('*').eq('tour_id', tourId).order('date');
    if (error) throw error;
    return (data || []).map((row) => ({
      date: row.date,
      name: row.name,
      price: Number(row.price) || 0,
      quantity: row.quantity || 1,
      categoryId: row.category_id ?? undefined,
    }));
  }

  async addAllowance(tourId: string, allowance: Allowance): Promise<void> {
    const { error } = await this.supabase.from('tour_allowances').insert({
      tour_id: tourId,
      date: allowance.date,
      name: allowance.name,
      price: allowance.price,
      quantity: allowance.quantity || 1,
      category_id: allowance.categoryId ?? null,
    });
    if (error) throw error;
    // Recalculate and save summary
    await this.recalculateTourSummary(tourId);
  }

  async updateAllowance(tourId: string, index: number, allowance: Allowance): Promise<void> {
    const { data: rows } = await this.supabase.from('tour_allowances').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await this.supabase.from('tour_allowances').update({
        date: allowance.date,
        name: allowance.name,
        price: allowance.price,
        quantity: allowance.quantity || 1,
        category_id: allowance.categoryId ?? null,
      }).eq('id', rows[index].id);
      if (error) throw error;
      // Recalculate and save summary
      await this.recalculateTourSummary(tourId);
    }
  }

  async removeAllowance(tourId: string, index: number): Promise<void> {
    const { data: rows } = await this.supabase.from('tour_allowances').select('id').eq('tour_id', tourId).order('date');
    if (rows && rows[index]) {
      const { error } = await this.supabase.from('tour_allowances').delete().eq('id', rows[index].id);
      if (error) throw error;
      // Recalculate and save summary
      await this.recalculateTourSummary(tourId);
    }
  }

  // ------------------------------------------------------------------ Tour Shoppings

  async getTourShoppings(tourId: string): Promise<TourShopping[]> {
    const { data, error } = await this.supabase
      .from('tour_shoppings')
      .select('*')
      .eq('tour_id', tourId)
      .order('date');
    if (error) throw error;
    return (data || []).map((row) => ({
      name: row.name,
      price: Number(row.price) || 0,
      date: row.date,
    }));
  }

  async addTourShopping(tourId: string, shopping: TourShopping): Promise<void> {
    const { error } = await this.supabase
      .from('tour_shoppings')
      .insert({
        tour_id: tourId,
        name: shopping.name,
        price: shopping.price,
        date: shopping.date,
      });
    if (error) throw error;
  }

  async updateTourShopping(tourId: string, index: number, shopping: TourShopping): Promise<void> {
    const { data: rows } = await this.supabase
      .from('tour_shoppings')
      .select('id')
      .eq('tour_id', tourId)
      .order('date');
    if (rows && rows[index]) {
      const { error } = await this.supabase
        .from('tour_shoppings')
        .update({
          name: shopping.name,
          price: shopping.price,
          date: shopping.date,
        })
        .eq('id', rows[index].id);
      if (error) throw error;
    }
  }

  async removeTourShopping(tourId: string, index: number): Promise<void> {
    const { data: rows } = await this.supabase
      .from('tour_shoppings')
      .select('id')
      .eq('tour_id', tourId)
      .order('date');
    if (rows && rows[index]) {
      const { error } = await this.supabase
        .from('tour_shoppings')
        .delete()
        .eq('id', rows[index].id);
      if (error) throw error;
    }
  }

  // ------------------------------------------------------------------ Settlement workflow

  async submitTourSettlement(tourId: string, note?: string): Promise<Tour> {
    const { data: current, error: fetchError } = await this.supabase
      .from('tours')
      .select('settlement_status, submission_count')
      .eq('id', tourId)
      .single();
    if (fetchError) throw fetchError;
    const status = (current as any)?.settlement_status as string;
    if (status === 'approved' || status === 'closed') {
      throw new Error('Hồ sơ đã được duyệt hoặc đã đóng — không thể gửi lại.');
    }
    const nextCount = (Number((current as any)?.submission_count) || 0) + 1;
    const { error } = await this.supabase
      .from('tours')
      .update({
        settlement_status: 'submitted',
        submitted_at: new Date().toISOString(),
        submission_count: nextCount,
      } as any)
      .eq('id', tourId);
    if (error) throw error;
    await this.insertSubmissionHistory(tourId, 'submitted', note);
    const tour = await this.getTour(tourId);
    if (!tour) throw new Error('Không tìm thấy tour sau khi cập nhật.');
    return tour;
  }

  async returnTourSettlement(tourId: string, note?: string): Promise<Tour> {
    const { data: current, error: fetchError } = await this.supabase
      .from('tours')
      .select('settlement_status')
      .eq('id', tourId)
      .single();
    if (fetchError) throw fetchError;
    const status = (current as any)?.settlement_status as string;
    if (status !== 'submitted') {
      throw new Error('Chỉ có thể trả lại hồ sơ ở trạng thái "Đã gửi".');
    }
    const { error } = await this.supabase
      .from('tours')
      .update({ settlement_status: 'need_changes' } as any)
      .eq('id', tourId);
    if (error) throw error;
    await this.insertSubmissionHistory(tourId, 'returned', note);
    const tour = await this.getTour(tourId);
    if (!tour) throw new Error('Không tìm thấy tour sau khi cập nhật.');
    return tour;
  }

  async approveTourSettlement(tourId: string, note?: string): Promise<Tour> {
    const { data: current, error: fetchError } = await this.supabase
      .from('tours')
      .select('settlement_status')
      .eq('id', tourId)
      .single();
    if (fetchError) throw fetchError;
    const status = (current as any)?.settlement_status as string;
    if (status !== 'submitted') {
      throw new Error('Chỉ duyệt được hồ sơ ở trạng thái "Đã gửi".');
    }
    const { data: authUser } = await this.supabase.auth.getUser();
    const now = new Date().toISOString();
    const { error } = await this.supabase
      .from('tours')
      .update({
        settlement_status: 'approved',
        approved_at: now,
        approved_by: authUser.user?.id ?? null,
        locked_at: now,
      } as any)
      .eq('id', tourId);
    if (error) throw error;
    await this.insertSubmissionHistory(tourId, 'approved', note);
    const tour = await this.getTour(tourId);
    if (!tour) throw new Error('Không tìm thấy tour sau khi duyệt.');
    return tour;
  }

  async reopenTourSettlement(tourId: string, note?: string): Promise<Tour> {
    const { error } = await this.supabase
      .from('tours')
      .update({
        settlement_status: 'draft',
        approved_at: null,
        approved_by: null,
        locked_at: null,
      } as any)
      .eq('id', tourId);
    if (error) throw error;
    await this.insertSubmissionHistory(tourId, 'reopened', note);
    const tour = await this.getTour(tourId);
    if (!tour) throw new Error('Không tìm thấy tour sau khi mở khóa.');
    return tour;
  }

  async updateLineReview(
    tourId: string,
    lineType: LineType,
    lineId: string,
    review: { lineStatus: LineStatus; lineComment?: string }
  ): Promise<void> {
    const table = this.lineTypeToTable(lineType);
    const { data: authUser } = await this.supabase.auth.getUser();
    const { error } = await (this.supabase as any)
      .from(table)
      .update({
        line_status: review.lineStatus,
        line_comment: review.lineComment ?? null,
        reviewed_by: authUser.user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', lineId)
      .eq('tour_id', tourId);
    if (error) throw error;
  }

  async listSubmissionHistory(tourId: string): Promise<SubmissionHistoryEvent[]> {
    const { data, error } = await this.supabase
      .from('tour_submission_history')
      .select('*')
      .eq('tour_id', tourId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      tourId: row.tour_id,
      event: row.event,
      actorId: row.actor_id ?? undefined,
      actorRole: row.actor_role ?? undefined,
      note: row.note ?? undefined,
      createdAt: row.created_at,
    }));
  }

  async countToursBySettlementStatus(statuses: SettlementStatus[]): Promise<number> {
    if (!statuses.length) return 0;
    const { count, error } = await this.supabase
      .from('tours')
      .select('id', { count: 'exact', head: true })
      .in('settlement_status', statuses);
    if (error) throw error;
    return count ?? 0;
  }

  // ------------------------------------------------------------------ Payment tracking

  async listTourPayments(tourId: string): Promise<TourPayment[]> {
    const { data, error } = await this.supabase
      .from('tour_payments')
      .select('*')
      .eq('tour_id', tourId)
      .order('paid_at', { ascending: false });
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
    const { data, error } = await this.supabase
      .from('tour_payments')
      .insert(insert)
      .select('*')
      .single();
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
    const { error } = await this.supabase
      .from('tour_payments')
      .update(update)
      .eq('id', id);
    if (error) throw error;
  }

  async deleteTourPayment(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('tour_payments')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // ------------------------------------------------------------------ Data Import/Export

  async exportData(): Promise<any> {
    const [guides, languages, companies, nationalities, provinces, destinations, shoppings, categories, expenses, tourResult] = await Promise.all([
      this.listGuides(),
      this.listLanguages(),
      this.listCompanies(),
      this.listNationalities(),
      this.listProvinces(),
      this.listTouristDestinations(),
      this.listShoppings(),
      this.listExpenseCategories(),
      this.listDetailedExpenses(),
      this.listTours(undefined, { includeDetails: true }),
    ]);

    return {
      guides,
      languages,
      companies,
      nationalities,
      provinces,
      touristDestinations: destinations,
      shoppings,
      expenseCategories: categories,
      detailedExpenses: expenses,
      tours: tourResult.tours,
    };
  }

  async importData(data: any): Promise<void> {
    if (data.languages) {
      for (const language of data.languages) {
        const { id, createdAt, updatedAt, createdBy, searchKeywords, ...rest } = language;
        await this.createLanguage(rest);
      }
    }
    if (data.guides) {
      for (const guide of data.guides) {
        const { id, createdAt, updatedAt, createdBy, searchKeywords, languages, ...rest } = guide;
        await this.createGuide({
          ...rest,
          languageIds: Array.isArray(languages) ? languages.map((language: Language) => language.id) : undefined,
        });
      }
    }
    if (data.companies) {
      for (const company of data.companies) {
        const { id, createdAt, updatedAt, ...rest } = company;
        await this.createCompany(rest);
      }
    }
    if (data.nationalities) {
      for (const nationality of data.nationalities) {
        const { id, createdAt, updatedAt, ...rest } = nationality;
        await this.createNationality(rest);
      }
    }
    if (data.provinces) {
      for (const province of data.provinces) {
        const { id, createdAt, updatedAt, ...rest } = province;
        await this.createProvince(rest);
      }
    }
    if (data.touristDestinations) {
      for (const destination of data.touristDestinations) {
        const { id, createdAt, updatedAt, ...rest } = destination;
        await this.createTouristDestination(rest);
      }
    }
    if (data.shoppings) {
      for (const shopping of data.shoppings) {
        const { id, createdAt, updatedAt, ...rest } = shopping;
        await this.createShopping(rest);
      }
    }
    if (data.expenseCategories) {
      for (const category of data.expenseCategories) {
        const { id, createdAt, updatedAt, ...rest } = category;
        await this.createExpenseCategory(rest);
      }
    }
    if (data.detailedExpenses) {
      for (const expense of data.detailedExpenses) {
        const { id, createdAt, updatedAt, ...rest } = expense;
        await this.createDetailedExpense(rest);
      }
    }
    if (data.tours) {
      for (const tour of data.tours) {
        const { id, createdAt, updatedAt, destinations, expenses, meals, allowances, summary, ...tourInput } = tour;
        const createdTour = await this.createTour(tourInput);

        // Add subcollections
        if (destinations && destinations.length > 0) {
          await Promise.all(destinations.map((dest: Destination) => this.addDestination(createdTour.id, dest)));
        }
        if (expenses && expenses.length > 0) {
          await Promise.all(expenses.map((exp: Expense) => this.addExpense(createdTour.id, exp)));
        }
        if (meals && meals.length > 0) {
          await Promise.all(meals.map((meal: Meal) => this.addMeal(createdTour.id, meal)));
        }
        if (allowances && allowances.length > 0) {
          await Promise.all(allowances.map((allow: Allowance) => this.addAllowance(createdTour.id, allow)));
        }
        if (summary) {
          await this.updateTour(createdTour.id, { summary });
        }
      }
    }
  }

  async clearAllData(): Promise<void> {
    await Promise.all([
      this.supabase.from('tours').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      this.supabase.from('detailed_expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      this.supabase.from('expense_categories').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      this.supabase.from('shoppings').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      this.supabase.from('tourist_destinations').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      this.supabase.from('provinces').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      this.supabase.from('nationalities').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      this.supabase.from('companies').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      this.supabase.from('guides').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    ]);
  }
}
