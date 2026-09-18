import type { EntityRef, Tour, TourNationality } from '@/types/tour';
import type { TourNationalityRow } from '../store-types';

export function mapTourNationality(row: TourNationalityRow): TourNationality {
  return {
    id: row.nationality_id,
    nameAtBooking: row.nationality_name_at_booking || '',
    paxCount: Number(row.pax_count) || 0,
  };
}

/** Gắn danh sách quốc tịch đã đọc từ DB vào tour; fallback về ref đơn khi bảng con rỗng. */
export function applyTourNationalities(tour: Tour, rows?: TourNationalityRow[] | null): Tour {
  const nationalities = (rows || []).map(mapTourNationality).filter((n) => n.id);
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

/** Chuẩn hóa danh sách quốc tịch trước khi ghi: bỏ id rỗng, gộp trùng, pax tối thiểu 1. */
export function normalizeTourNationalitiesForWrite(
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
    byId.set(n.id, {
      id: n.id,
      nameAtBooking: n.nameAtBooking || '',
      paxCount: Math.max(1, Math.floor(Number(n.paxCount) || 0)),
    });
  });
  return Array.from(byId.values());
}

export function validateTourNationalities(nationalities: TourNationality[], totalGuests: number): void {
  if (nationalities.length === 0) throw new Error('Vui lòng chọn ít nhất một quốc tịch.');
  const totalPax = nationalities.reduce((sum, n) => sum + n.paxCount, 0);
  if (totalGuests > 0 && totalPax !== totalGuests) throw new Error('Tổng pax theo quốc tịch phải bằng tổng khách.');
}
