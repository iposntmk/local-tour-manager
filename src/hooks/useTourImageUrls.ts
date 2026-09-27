import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import type { TourImage } from '@/types/tour';

interface SignedEntry {
  url: string;
  signedAt: number;
}
type SignedMap = Record<string, SignedEntry>;

/** Signed URL sống 60 phút; chỉ tái dùng khi còn ≥ 30 phút. */
const REUSE_WINDOW = 30 * 60 * 1000;

/**
 * Ký URL cho ảnh tour. Khi danh sách đổi (vừa upload/xóa), chỉ ký các ảnh mới
 * trong MỘT request batch; ảnh cũ tái dùng URL còn hạn → không tải lại/nhấp nháy.
 */
export function useTourImageUrls(tourId: string, images: TourImage[]) {
  const queryClient = useQueryClient();
  const pathKey = images.map((image) => image.storage_path).join('|');

  const { data = {} } = useQuery({
    queryKey: ['tourImageUrls', tourId, pathKey],
    queryFn: async (): Promise<SignedMap> => {
      const now = Date.now();
      const reusable: SignedMap = {};
      for (const [, map] of queryClient.getQueriesData<SignedMap>({ queryKey: ['tourImageUrls', tourId] })) {
        for (const [path, entry] of Object.entries(map ?? {})) {
          if (now - entry.signedAt < REUSE_WINDOW) reusable[path] = entry;
        }
      }
      const paths = images.map((image) => image.storage_path);
      const missing = paths.filter((path) => !reusable[path]);
      const fresh = await store.getTourImageUrls(missing);
      const result: SignedMap = {};
      for (const path of paths) {
        if (reusable[path]) result[path] = reusable[path];
        else if (fresh[path]) result[path] = { url: fresh[path], signedAt: now };
      }
      return result;
    },
    enabled: images.length > 0,
    staleTime: REUSE_WINDOW,
    placeholderData: keepPreviousData,
  });

  return (storagePath: string): string => data[storagePath]?.url ?? '';
}
