import { useState, useMemo, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { toast } from 'sonner';
import type { Destination, Tour } from '@/types/tour';
import { invalidateTourAggregateCaches } from '@/lib/query-cache';
import { hasLineAttachments, isVatAmountValid } from '@/lib/tour-line-utils';
import { usePendingLineAttachments } from '@/hooks/usePendingLineAttachments';
import { useLineFormPersistence } from '@/hooks/useLineFormPersistence';
import { useTourLineAutosave } from '@/hooks/useTourLineAutosave';
import { DestinationForm } from '@/components/tours/DestinationForm';
import { NewDestinationDialog } from '@/components/tours/NewDestinationDialog';
import { DestinationsDesktopTable } from '@/components/tours/DestinationsDesktopTable';
import { DestinationsMobileList } from '@/components/tours/mobile/DestinationsMobileList';
import {
  canEditAnyTourLineField,
  canEditTourLineField,
  type Access,
  type TourLineFieldKey,
} from '@/lib/tour-detail-permissions';

interface DestinationsTabProps {
  tourId?: string;
  destinations: Destination[];
  onChange?: (destinations: Destination[]) => void;
  tour?: Tour | null;
  readOnly?: boolean;
  editRequest?: { index: number; key: number };
  lineFieldAccess?: Partial<Record<TourLineFieldKey, Access>>;
}

export function DestinationsTab({ tourId, destinations, onChange, tour, readOnly = false, editRequest, lineFieldAccess }: DestinationsTabProps) {
  const [showNewDestinationDialog, setShowNewDestinationDialog] = useState(false);
  const queryClient = useQueryClient();
  const tourStartDate = tour?.startDate || '';
  const tourTotalGuests = tour?.totalGuests || 0;
  const fallbackDestination = useMemo<Destination>(() => ({
    name: '',
    price: 0,
    date: tourStartDate,
    guests: !tourId && tourTotalGuests > 0 ? tourTotalGuests : undefined,
  }), [tourStartDate, tourTotalGuests, tourId]);
  const {
    formData, setFormData, editingIndex, setEditingIndex, resetForm,
  } = useLineFormPersistence<Destination>({
    storageKey: `destinations:${tourId || 'new'}`,
    fallback: fallbackDestination,
  });
  const { pendingFiles, setPendingFiles, clearPendingFiles, uploadPendingFiles } = usePendingLineAttachments(tourId, 'destination');
  const canEditLine = canEditAnyTourLineField(lineFieldAccess);
  const canCreateLine =
    canEditTourLineField(lineFieldAccess, 'name') &&
    canEditTourLineField(lineFieldAccess, 'date') &&
    canEditTourLineField(lineFieldAccess, 'price');

  const { data: touristDestinations = [] } = useQuery({
    queryKey: ['touristDestinations'],
    queryFn: () => store.listTouristDestinations({ status: 'active' }),
  });

  const nameToProvince = useMemo(() => {
    const map = new Map<string, string>();
    touristDestinations.forEach((td) => {
      const key = (td.name || '').trim().toLowerCase();
      if (!key) return;
      const provinceName = td.provinceRef?.nameAtBooking || 'Không xác định';
      if (!map.has(key)) map.set(key, provinceName);
    });
    return map;
  }, [touristDestinations]);

  const duplicateDestinationNames = useMemo(() => {
    const counts = new Map<string, number>();
    destinations.forEach((d) => {
      const k = (d.name || '').trim().toLowerCase();
      if (!k) return;
      counts.set(k, (counts.get(k) || 0) + 1);
    });
    return new Set(Array.from(counts.entries()).filter(([, c]) => c > 1).map(([k]) => k));
  }, [destinations]);

  const destinationGroups = useMemo(() => {
    const groups = new Map<string, any[]>();
    destinations.map((d, i) => ({ ...d, originalIndex: i })).forEach((item) => {
      const keyName = (item.name || '').trim().toLowerCase();
      const province = nameToProvince.get(keyName) || 'Unknown';
      const list = groups.get(province) || [];
      list.push(item);
      groups.set(province, list);
    });
    const sortedGroupNames = Array.from(groups.keys()).sort((a, b) => {
      if (a === 'Không xác định') return 1;
      if (b === 'Không xác định') return -1;
      return a.localeCompare(b);
    });
    return sortedGroupNames.map((groupName) => ({
      groupName,
      items: (groups.get(groupName) || []).sort((a: any, b: any) => {
        const da = a.date ? new Date(a.date).getTime() : Infinity;
        const db = b.date ? new Date(b.date).getTime() : Infinity;
        return da - db;
      }),
    }));
  }, [destinations, nameToProvince]);

  const destinationsTotalAmount = useMemo(
    () => destinations.reduce((sum, dest) => {
      const g = typeof (dest as any).guests === 'number' ? (dest as any).guests : 0;
      return sum + dest.price * g;
    }, 0),
    [destinations]
  );

  const addMutation = useMutation({
    mutationFn: async (destination: Destination) => {
      if (tourId) {
        return store.addDestination(tourId, destination);
      } else {
        onChange?.([...destinations, destination]);
        return undefined;
      }
    },
    onSuccess: async (lineId) => {
      await uploadPendingFiles('destination', lineId);
      if (tourId) {
        await queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
        void invalidateTourAggregateCaches(queryClient, 'none');
      }
      toast.success('Đã thêm điểm đến');
      clearPendingFiles();
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ index, destination }: { index: number; destination: Destination }) => {
      if (tourId) {
        await store.updateDestination(tourId, index, destination);
      } else {
        const newDests = [...destinations];
        newDests[index] = destination;
        onChange?.(newDests);
      }
    },
    onSuccess: async (_, { destination }) => {
      await uploadPendingFiles('destination', destination.id);
      if (tourId) {
        await queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
        void invalidateTourAggregateCaches(queryClient, 'none');
      }
      toast.success('Đã cập nhật điểm đến');
      clearPendingFiles();
      resetForm();
    },
  });

  const autosaveDestination = useTourLineAutosave<Destination>({
    tourId,
    collection: 'destinations',
    items: destinations,
    onChange,
    saveLine: (index, destination) => store.updateDestination(tourId!, index, destination),
    successMessage: 'Đã tự động lưu điểm đến',
  });

  const deleteMutation = useMutation({
    mutationFn: (index: number) => {
      if (tourId) return store.removeDestination(tourId, index);
      return Promise.resolve();
    },
    onSuccess: (_, index) => {
      if (tourId) {
        queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
        void invalidateTourAggregateCaches(queryClient, 'none');
      } else {
        onChange?.(destinations.filter((_, i) => i !== index));
      }
      toast.success('Đã xóa điểm đến');
    },
  });

  const handleEdit = (index: number) => {
    if (readOnly || !canEditLine) return;
    clearPendingFiles();
    setEditingIndex(index);
    setFormData(destinations[index]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    clearPendingFiles();
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) { toast.error('Bạn không có quyền sửa điểm đến trong tour.'); return; }
    if (editingIndex === null && !canCreateLine) { toast.error('Bạn không có quyền thêm dòng điểm đến.'); return; }
    if (editingIndex !== null && !canEditLine) { toast.error('Bạn không có quyền sửa trường trong dòng điểm đến.'); return; }
    if (!formData.name || !formData.date) { toast.error('Vui lòng điền đầy đủ các trường bắt buộc'); return; }
    if (!isVatAmountValid(formData, tour?.totalGuests || 0)) { toast.error('Tiền VAT không được vượt quá thành tiền.'); return; }
    if ((formData.vatRate || 0) > 0 && !hasLineAttachments(formData, pendingFiles)) {
      toast.warning('VAT lớn hơn 0 nhưng chưa có chứng từ.');
    }

    const targetName = formData.name.trim().toLowerCase();
    if (editingIndex !== null) {
      const isDuplicate = destinations.some((dest, idx) => idx !== editingIndex && dest.name.trim().toLowerCase() === targetName);
      if (isDuplicate) { toast.error('Tên điểm đến phải là duy nhất'); return; }
      updateMutation.mutate({ index: editingIndex, destination: formData });
    } else {
      const isDuplicate = destinations.some((dest) => dest.name.trim().toLowerCase() === targetName);
      if (isDuplicate) { toast.error('Đã tồn tại điểm đến với tên này'); return; }
      addMutation.mutate(formData);
    }
  };

  const handleGuestsChange = (originalIndex: number, destination: any, val: number | undefined) => {
    if (readOnly || !canEditTourLineField(lineFieldAccess, 'quantity')) return;
    const tourGuests = tour?.totalGuests || 0;
    let guestsVal = val;
    if (guestsVal !== undefined && tourGuests && guestsVal > tourGuests) {
      toast.warning(`Số khách không được vượt quá tổng khách của tour (${tourGuests}).`);
      guestsVal = tourGuests;
    }
    const updated = { ...destination, guests: guestsVal };
    autosaveDestination(originalIndex, updated);
  };

  useEffect(() => {
    if (!formData.date && tour?.startDate) {
      setFormData((prev) => ({ ...prev, date: tour.startDate! }));
    }
  }, [formData.date, setFormData, tour?.startDate]);

  useEffect(() => {
    if (editingIndex !== null || tourId || formData.guests !== undefined || !tour?.totalGuests) return;
    setFormData((prev) => ({ ...prev, guests: tour.totalGuests }));
  }, [editingIndex, formData.guests, setFormData, tour?.totalGuests, tourId]);

  useEffect(() => {
    if (editingIndex === null) return;
    const latest = destinations[editingIndex];
    if (!latest || latest.id !== formData.id) return;
    const latestKey = (latest.attachments || []).map((item) => item.id).join('|');
    const formKey = (formData.attachments || []).map((item) => item.id).join('|');
    if (latestKey !== formKey) setFormData((prev) => ({ ...prev, attachments: latest.attachments || [] }));
  }, [destinations, editingIndex, formData.attachments, formData.id, setFormData]);

  useEffect(() => {
    if (editRequest && editRequest.index >= 0 && editRequest.index < destinations.length) {
      handleEdit(editRequest.index);
    }
  }, [editRequest?.key]);

  return (
    <div className="space-y-6">
      {!readOnly && canEditLine && (
        <DestinationForm
          formData={formData}
          onChange={setFormData}
          editingIndex={editingIndex}
          tour={tour}
          touristDestinations={touristDestinations}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          onOpenNewDialog={() => setShowNewDestinationDialog(true)}
          tourId={tourId}
          pendingFiles={pendingFiles}
          onPendingFilesChange={setPendingFiles}
          lineFieldAccess={lineFieldAccess}
        />
      )}

      <div className="rounded-lg border">
        <div className="p-4 border-b bg-muted/50">
          <h3 className="font-semibold">Danh sách điểm đến</h3>
        </div>
        {destinations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Chưa có điểm đến nào</div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <DestinationsDesktopTable
                groups={destinationGroups}
                duplicateDestinationNames={duplicateDestinationNames}
                tourGuests={tour?.totalGuests || 0}
                readOnly={readOnly}
                lineFieldAccess={lineFieldAccess}
                onEdit={handleEdit}
                onDelete={(idx) => deleteMutation.mutate(idx)}
                onGuestsChange={handleGuestsChange}
                totalAmount={destinationsTotalAmount}
              />
            </div>
            <div className="md:hidden">
              <DestinationsMobileList
                groups={destinationGroups}
                duplicateDestinationNames={duplicateDestinationNames}
                tourGuests={tour?.totalGuests || 0}
                readOnly={readOnly}
                lineFieldAccess={lineFieldAccess}
                onEdit={handleEdit}
                onDelete={(idx) => deleteMutation.mutate(idx)}
                onGuestsChange={handleGuestsChange}
                totalAmount={destinationsTotalAmount}
              />
            </div>
          </>
        )}
      </div>

      <NewDestinationDialog
        open={showNewDestinationDialog}
        onOpenChange={setShowNewDestinationDialog}
        readOnly={readOnly || !canEditTourLineField(lineFieldAccess, 'name') || !canEditTourLineField(lineFieldAccess, 'price')}
        onCreated={(dest) => setFormData((prev) => ({ ...prev, name: dest.name, price: dest.price }))}
      />
    </div>
  );
}
