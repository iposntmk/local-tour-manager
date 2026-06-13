import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type { LineType, LineStatus, SettlementStatus, SubmissionHistoryEvent } from '@/types/tour';

export class TourSettlementModule {
  declare protected supabase: SupabaseClient<Database>;

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
    actorId: string | undefined,
    note?: string
  ): Promise<void> {
    let actorRole: string | undefined;
    if (actorId) {
      const { data: profile } = await this.supabase
        .from('user_profiles').select('role, settlement_role').eq('id', actorId).maybeSingle();
      if (profile) actorRole = (profile as any).settlement_role || (profile as any).role || undefined;
    }
    const { error } = await this.supabase.from('tour_submission_history').insert({
      tour_id: tourId, event, actor_id: actorId ?? null, actor_role: actorRole ?? null, note: note ?? null,
    });
    if (error) throw error;
  }

  async submitTourSettlement(tourId: string, note?: string): Promise<void> {
    const [{ data: current, error: fetchError }, { data: authUser }] = await Promise.all([
      this.supabase.from('tours').select('settlement_status, submission_count').eq('id', tourId).single(),
      this.supabase.auth.getUser(),
    ]);
    if (fetchError) throw fetchError;
    const status = (current as any)?.settlement_status as string;
    if (status === 'approved' || status === 'closed') {
      throw new Error('Hồ sơ đã được duyệt hoặc đã đóng — không thể gửi lại.');
    }
    const nextCount = (Number((current as any)?.submission_count) || 0) + 1;
    const actorId = authUser.user?.id;
    const [{ error: updateError }, profile] = await Promise.all([
      this.supabase.from('tours')
        .update({ settlement_status: 'submitted', submitted_at: new Date().toISOString(), submission_count: nextCount } as any)
        .eq('id', tourId),
      actorId
        ? this.supabase.from('user_profiles').select('role, settlement_role').eq('id', actorId).maybeSingle().then((r) => r.data)
        : Promise.resolve(null),
    ]);
    if (updateError) throw updateError;
    const actorRole = profile ? ((profile as any).settlement_role || (profile as any).role || undefined) : undefined;
    const { error: historyError } = await this.supabase.from('tour_submission_history').insert({
      tour_id: tourId, event: 'submitted', actor_id: actorId ?? null, actor_role: actorRole ?? null, note: note ?? null,
    });
    if (historyError) throw historyError;
  }

  async returnTourSettlement(tourId: string, note?: string): Promise<void> {
    const [{ data: current, error: fetchError }, { data: authUser }] = await Promise.all([
      this.supabase.from('tours').select('settlement_status').eq('id', tourId).single(),
      this.supabase.auth.getUser(),
    ]);
    if (fetchError) throw fetchError;
    if ((current as any)?.settlement_status !== 'submitted') {
      throw new Error('Chỉ có thể trả lại hồ sơ ở trạng thái "Đã gửi".');
    }
    const actorId = authUser.user?.id;
    const [{ error: updateError }, profile] = await Promise.all([
      this.supabase.from('tours').update({ settlement_status: 'need_changes' } as any).eq('id', tourId),
      actorId
        ? this.supabase.from('user_profiles').select('role, settlement_role').eq('id', actorId).maybeSingle().then((r) => r.data)
        : Promise.resolve(null),
    ]);
    if (updateError) throw updateError;
    const actorRole = profile ? ((profile as any).settlement_role || (profile as any).role || undefined) : undefined;
    const { error: historyError } = await this.supabase.from('tour_submission_history').insert({
      tour_id: tourId, event: 'returned', actor_id: actorId ?? null, actor_role: actorRole ?? null, note: note ?? null,
    });
    if (historyError) throw historyError;
  }

  async approveTourSettlement(tourId: string, note?: string): Promise<void> {
    const [{ data: current, error: fetchError }, { data: authUser }] = await Promise.all([
      this.supabase.from('tours').select('settlement_status').eq('id', tourId).single(),
      this.supabase.auth.getUser(),
    ]);
    if (fetchError) throw fetchError;
    if ((current as any)?.settlement_status !== 'submitted') {
      throw new Error('Chỉ duyệt được hồ sơ ở trạng thái "Đã gửi".');
    }
    const actorId = authUser.user?.id;
    const now = new Date().toISOString();
    const [{ error: updateError }, profile] = await Promise.all([
      this.supabase.from('tours')
        .update({ settlement_status: 'approved', approved_at: now, approved_by: actorId ?? null, locked_at: now } as any)
        .eq('id', tourId),
      actorId
        ? this.supabase.from('user_profiles').select('role, settlement_role').eq('id', actorId).maybeSingle().then((r) => r.data)
        : Promise.resolve(null),
    ]);
    if (updateError) throw updateError;
    const actorRole = profile ? ((profile as any).settlement_role || (profile as any).role || undefined) : undefined;
    const { error: historyError } = await this.supabase.from('tour_submission_history').insert({
      tour_id: tourId, event: 'approved', actor_id: actorId ?? null, actor_role: actorRole ?? null, note: note ?? null,
    });
    if (historyError) throw historyError;
  }

  async reopenTourSettlement(tourId: string, note?: string): Promise<void> {
    const { data: authUser } = await this.supabase.auth.getUser();
    const actorId = authUser.user?.id;
    const [{ error: updateError }, profile] = await Promise.all([
      this.supabase.from('tours')
        .update({ settlement_status: 'draft', approved_at: null, approved_by: null, locked_at: null } as any)
        .eq('id', tourId),
      actorId
        ? this.supabase.from('user_profiles').select('role, settlement_role').eq('id', actorId).maybeSingle().then((r) => r.data)
        : Promise.resolve(null),
    ]);
    if (updateError) throw updateError;
    const actorRole = profile ? ((profile as any).settlement_role || (profile as any).role || undefined) : undefined;
    const { error: historyError } = await this.supabase.from('tour_submission_history').insert({
      tour_id: tourId, event: 'reopened', actor_id: actorId ?? null, actor_role: actorRole ?? null, note: note ?? null,
    });
    if (historyError) throw historyError;
  }

  async updateLineReview(
    tourId: string,
    lineType: LineType,
    lineId: string,
    review: { lineStatus: LineStatus; lineComment?: string }
  ): Promise<void> {
    const table = this.lineTypeToTable(lineType);
    const { data: authUser } = await this.supabase.auth.getUser();
    const { error } = await (this.supabase as any).from(table).update({
      line_status: review.lineStatus,
      line_comment: review.lineComment ?? null,
      reviewed_by: authUser.user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    }).eq('id', lineId).eq('tour_id', tourId);
    if (error) throw error;
  }

  async listSubmissionHistory(tourId: string): Promise<SubmissionHistoryEvent[]> {
    const { data, error } = await this.supabase
      .from('tour_submission_history').select('*').eq('tour_id', tourId).order('created_at', { ascending: false });
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
      .from('tours').select('id', { count: 'exact', head: true }).in('settlement_status', statuses);
    if (error) throw error;
    return count ?? 0;
  }
}
