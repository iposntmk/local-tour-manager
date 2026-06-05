import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Plus, Trash, Download } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SearchInput } from '@/components/master/SearchInput';
import { DestinationFreeDialog } from '@/components/destinations-free/DestinationFreeDialog';
import { DestinationsFreeList, type DestinationsFreeFilters } from '@/components/destinations-free/DestinationsFreeList';
import type { DestinationFree, DestinationFreeInput } from '@/types/master';
import type { UserProfile } from '@/types/user';
import { toast } from 'sonner';
import { useHeaderMode } from '@/hooks/useHeaderMode';
import { useAuth } from '@/contexts/AuthContext';
import { ensureCanModifyOwnedEntity } from '@/lib/master-ownership';

const DestinationsFree = () => {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDestination, setEditingDestination] = useState<DestinationFree | undefined>();
  const [nameFilter, setNameFilter] = useState('');
  const [rawNameFilter, setRawNameFilter] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('all');

  const queryClient = useQueryClient();
  const { hasPermission, user, isAdmin } = useAuth();
  const { data: userProfiles = [] } = useQuery<UserProfile[]>({
    queryKey: ['userProfiles'],
    queryFn: () => store.listUserProfiles(),
    enabled: isAdmin,
  });
  const profileMap = useMemo(() => {
    const m = new Map<string, UserProfile>();
    userProfiles.forEach(p => m.set(p.id, p));
    return m;
  }, [userProfiles]);
  const canCreate = hasPermission('create_destinations_free');
  const canEdit = hasPermission('edit_destinations_free');
  const canDelete = hasPermission('delete_destinations_free');
  const canExport = hasPermission('export_destinations_free');

  const { data: destinations = [], isLoading } = useQuery({
    queryKey: ['destinationsFree', search],
    queryFn: () => store.listDestinationsFree({ search }),
  });

  const { data: provinces = [] } = useQuery({
    queryKey: ['provinces'],
    queryFn: () => store.listProvinces(),
  });

  const createMutation = useMutation({
    mutationFn: (input: DestinationFreeInput) => store.createDestinationFree(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinationsFree'] });
      toast.success('Tạo điểm tham quan thành công');
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<DestinationFree> }) =>
      store.updateDestinationFree(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinationsFree'] });
      toast.success('Cập nhật điểm tham quan thành công');
      setDialogOpen(false);
      setEditingDestination(undefined);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => store.duplicateDestinationFree(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinationsFree'] });
      toast.success('Nhân bản điểm tham quan thành công');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => store.deleteDestinationFree(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinationsFree'] });
      toast.success('Xóa điểm tham quan thành công');
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => store.deleteAllDestinationsFree(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinationsFree'] });
      toast.success('Đã xóa tất cả điểm tham quan');
    },
  });

  const shareMutation = useMutation({
    mutationFn: ({ id, shared }: { id: string; shared: boolean }) =>
      store.setMasterDataShared('destinations_free', id, shared),
    onSuccess: (_, { shared }) => {
      queryClient.invalidateQueries({ queryKey: ['destinationsFree'] });
      toast.success(shared ? 'Đã chia sẻ' : 'Đã đặt về riêng tư');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Thao tác chia sẻ thất bại');
    },
  });

  const handleCreate = (input: DestinationFreeInput) => {
    if (!canCreate) {
      toast.error('Bạn không có quyền tạo điểm tham quan');
      return;
    }
    createMutation.mutate(input);
  };

  const handleEdit = (input: DestinationFreeInput) => {
    if (!canEdit) {
      toast.error('Bạn không có quyền sửa điểm tham quan');
      return;
    }
    if (editingDestination) {
      updateMutation.mutate({
        id: editingDestination.id,
        patch: {
          name: input.name,
          rawName: input.rawName,
          provinceRef: input.provinceRef,
        },
      });
    }
  };

  const handleOpenDialog = (destination?: DestinationFree) => {
    if (destination && !canEdit) return;
    if (!destination && !canCreate) return;
    if (destination && !ensureCanModifyOwnedEntity(destination, user?.id, isAdmin)) return;
    setEditingDestination(destination);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingDestination(undefined);
  };

  const handleDeleteAll = () => {
    if (!canDelete) {
      toast.error('Bạn không có quyền xóa điểm tham quan');
      return;
    }
    if (confirm('Bạn có chắc chắn muốn xóa TẤT CẢ điểm tham quan? Hành động này không thể hoàn tác.')) {
      deleteAllMutation.mutate();
    }
  };

  const handleExportTxt = () => {
    if (!canExport) {
      toast.error('Bạn không có quyền export điểm tham quan');
      return;
    }
    if (filteredDestinations.length === 0) {
      toast.error('Không có điểm tham quan nào để xuất');
      return;
    }

    const txtContent = filteredDestinations
      .map(dest => `${dest.name},${dest.rawName ?? ''},${dest.provinceRef.nameAtBooking}`)
      .join('\n');

    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `destinations-free-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất ${filteredDestinations.length} điểm tham quan`);
  };

  const filteredDestinations = useMemo(() => {
    return destinations.filter(dest => {
      const matchesName = !nameFilter || dest.name.toLowerCase().includes(nameFilter.toLowerCase());
      const matchesRawName = !rawNameFilter || (dest.rawName || '').toLowerCase().includes(rawNameFilter.toLowerCase());
      const matchesProvince = !provinceFilter || provinceFilter === 'all' || dest.provinceRef.nameAtBooking === provinceFilter;
      return matchesName && matchesRawName && matchesProvince;
    });
  }, [destinations, nameFilter, rawNameFilter, provinceFilter]);

  const filters: DestinationsFreeFilters = {
    name: nameFilter,
    rawName: rawNameFilter,
    province: provinceFilter,
  };

  const handleFilterChange = (field: keyof DestinationsFreeFilters, value: string) => {
    if (field === 'name') setNameFilter(value);
    if (field === 'rawName') setRawNameFilter(value);
    if (field === 'province') setProvinceFilter(value);
  };

  const handleDeleteDestination = (destination: DestinationFree) => {
    if (!ensureCanModifyOwnedEntity(destination, user?.id, isAdmin)) return;
    if (confirm('Bạn có chắc chắn muốn xóa điểm tham quan này?')) {
      deleteMutation.mutate(destination.id);
    }
  };

  const { classes: headerClasses } = useHeaderMode('destinations.headerMode');

  return (
    <TooltipProvider>
      <div className="space-y-4 md:space-y-6">
        <div className={headerClasses}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-lg sm:text-xl md:text-3xl font-bold">Điểm tham quan miễn phí</h1>
              <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground mt-0.5 sm:mt-1">Quản lý điểm tham quan không thu phí</p>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2 sm:justify-end">
              {canExport && (
                <Button variant="outline" size="sm" onClick={handleExportTxt} className="h-8 px-2.5 text-xs md:h-9 md:px-4 md:text-sm">
                  <Download className="h-3.5 w-3.5 mr-1.5 md:mr-2" />
                  <span className="hidden sm:inline">Xuất TXT</span>
                  <span className="sm:hidden">Xuất</span>
                </Button>
              )}
              {canDelete && (
                <Button variant="outline" size="sm" onClick={handleDeleteAll} className="h-8 px-2.5 text-xs md:h-9 md:px-4 md:text-sm gap-1.5 text-destructive hover:text-destructive">
                  <Trash className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Xóa tất cả</span>
                  <span className="sm:hidden">Xóa</span>
                </Button>
              )}
              {canCreate && (
                <Button size="sm" onClick={() => handleOpenDialog()} className="h-8 px-3 text-xs md:h-9 md:px-4 md:text-sm">
                  <Plus className="h-3.5 w-3.5 mr-1.5 md:mr-2" />
                  Thêm điểm tham quan
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Tìm điểm tham quan..."
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 md:py-12">Đang tải...</div>
        ) : destinations.length === 0 ? (
          <div className="text-center py-8 md:py-12 text-muted-foreground">
            Không tìm thấy điểm tham quan nào. Hãy tạo điểm tham quan đầu tiên.
          </div>
        ) : (
          <DestinationsFreeList
            destinations={filteredDestinations}
            provinces={provinces}
            filters={filters}
            onFilterChange={handleFilterChange}
            canEdit={canEdit}
            canCreate={canCreate}
            canDelete={canDelete}
            isAdmin={isAdmin}
            currentUserId={user?.id}
            profileMap={profileMap}
            onOpen={handleOpenDialog}
            onDuplicate={(id) => duplicateMutation.mutate(id)}
            onDelete={handleDeleteDestination}
            onShareToggle={(destination) => shareMutation.mutate({ id: destination.id, shared: !destination.isShared })}
          />
        )}
      </div>

      <DestinationFreeDialog
        open={dialogOpen}
        onOpenChange={handleCloseDialog}
        onSubmit={editingDestination ? handleEdit : handleCreate}
        initialData={editingDestination}
        isEditing={!!editingDestination}
      />
    </TooltipProvider>
  );
};

export default DestinationsFree;
