import type { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTourImport } from '@/hooks/useTourImport';
import type { Tour, TourQuery } from '@/types/tour';

type UseTourImportActionsArgs = {
  queryClient: QueryClient;
  baseTourQuery: TourQuery;
  canImportTours: boolean;
};

export const useTourImportActions = ({
  queryClient,
  baseTourQuery,
  canImportTours,
}: UseTourImportActionsArgs) => {
  const { handleImport: handleImportFromHook, importToursAsync } = useTourImport(queryClient, baseTourQuery);

  const handleImport = (tours: Partial<Tour>[]) => {
    if (!canImportTours) {
      toast.error('Bạn không có quyền nhập tour.');
      return;
    }
    handleImportFromHook(tours);
  };

  const handleImportAsync = (tours: Partial<Tour>[]) => {
    if (!canImportTours) {
      toast.error('Bạn không có quyền nhập tour.');
      return Promise.reject(new Error('Không có quyền nhập tour'));
    }
    return importToursAsync(tours);
  };

  return { handleImport, handleImportAsync };
};
