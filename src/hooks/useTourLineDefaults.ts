import { useEffect, useMemo, type Dispatch, type SetStateAction } from 'react';
import type { Tour } from '@/types/tour';

export interface TourLineDefaults {
  name: string;
  price: number;
  date: string;
  guests?: number;
}

type TourLineDateField = 'startDate' | 'endDate';

/**
 * Giá trị mặc định cho dòng mới: ngày và số pax luôn mượn từ tab thông tin tour
 * (áp dụng cho cả tour đã lưu, không chỉ tour mới). User vẫn tăng/giảm được sau đó.
 */
export function useTourLineFallback<T extends TourLineDefaults>(
  tour: Tour | null | undefined,
  dateField: TourLineDateField,
): T {
  const date = (dateField === 'endDate' ? tour?.endDate : tour?.startDate) || '';
  const totalGuests = tour?.totalGuests ?? 0;
  const guests = totalGuests > 0 ? totalGuests : undefined;
  return useMemo(() => ({ name: '', price: 0, date, guests } as T), [date, guests]);
}

interface ApplyTourLineDefaultsOptions<T extends TourLineDefaults> {
  fallback: T;
  editingIndex: number | null;
  setFormData: Dispatch<SetStateAction<T>>;
}

/**
 * Điền mặc định vào form đang trống (form được giữ lại giữa các lần chuyển tab, và
 * thông tin tour có thể về sau dòng đầu tiên). Không đụng vào dòng đang chỉnh sửa.
 */
export function useApplyTourLineDefaults<T extends TourLineDefaults>({
  fallback,
  editingIndex,
  setFormData,
}: ApplyTourLineDefaultsOptions<T>) {
  const { date: defaultDate, guests: defaultGuests } = fallback;

  useEffect(() => {
    if (editingIndex !== null) return;
    setFormData((prev) => {
      const nextDate = prev.date || defaultDate;
      const nextGuests = prev.guests ?? defaultGuests;
      if (nextDate === prev.date && nextGuests === prev.guests) return prev;
      return { ...prev, date: nextDate, guests: nextGuests };
    });
  }, [defaultDate, defaultGuests, editingIndex, setFormData]);
}
