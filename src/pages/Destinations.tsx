import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Plus, Upload, Trash, Download } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SearchInput } from '@/components/master/SearchInput';
import { DestinationDialog } from '@/components/destinations/DestinationDialog';
import { DestinationsList, type DestinationFilters } from '@/components/destinations/DestinationsList';
import { DestinationImportDialog, type DestinationImportItem } from '@/components/destinations/DestinationImportDialog';
import type { TouristDestination, TouristDestinationInput } from '@/types/master';
import { toast } from 'sonner';
import { useHeaderMode } from '@/hooks/useHeaderMode';
import { useAuth } from '@/contexts/AuthContext';
import { ensureCanModifyOwnedEntity } from '@/lib/master-ownership';
import type { UserProfile } from '@/types/user';

const Destinations = () => {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingDestination, setEditingDestination] = useState<TouristDestination | undefined>();
  const [nameFilter, setNameFilter] = useState('');
  const [rawNameFilter, setRawNameFilter] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('');

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
  const canCreate = hasPermission('create_tourist_destinations');
  const canEdit = hasPermission('edit_tourist_destinations');
  const canDelete = hasPermission('delete_tourist_destinations');
  const canImport = hasPermission('import_tourist_destinations');
  const canExport = hasPermission('export_tourist_destinations');

  const { data: destinations = [], isLoading } = useQuery({
    queryKey: ['touristDestinations', search],
    queryFn: () => store.listTouristDestinations({ search }),
  });

  const { data: provinces = [] } = useQuery({
    queryKey: ['provinces'],
    queryFn: () => store.listProvinces(),
  });

  const createMutation = useMutation({
    mutationFn: (input: TouristDestinationInput) => store.createTouristDestination(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['touristDestinations'] });
      toast.success('Tạo điểm đến thành công');
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<TouristDestination> }) =>
      store.updateTouristDestination(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['touristDestinations'] });
      toast.success('Cập nhật điểm đến thành công');
      setDialogOpen(false);
      setEditingDestination(undefined);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => store.duplicateTouristDestination(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['touristDestinations'] });
      toast.success('Nhân bản điểm đến thành công');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => store.deleteTouristDestination(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['touristDestinations'] });
      toast.success('Xóa điểm đến thành công');
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => store.deleteAllTouristDestinations(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['touristDestinations'] });
      toast.success('Đã xóa tất cả điểm đến');
    },
  });

  const shareMutation = useMutation({
    mutationFn: ({ id, shared }: { id: string; shared: boolean }) =>
      store.setMasterDataShared('tourist_destinations', id, shared),
    onSuccess: (_, { shared }) => {
      queryClient.invalidateQueries({ queryKey: ['touristDestinations'] });
      toast.success(shared ? 'Đã chia sẻ' : 'Đã đặt về riêng tư');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Thao tác chia sẻ thất bại');
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (items: DestinationImportItem[]) => {
      const provinces = await store.listProvinces();
      const defaultProvince = provinces[0] || { id: '', name: 'Unknown' };

      const inputs: TouristDestinationInput[] = items.map(item => ({
        name: item.name,
        price: item.price,
        rawName: item.rawName,
        provinceRef: { id: defaultProvince.id, nameAtBooking: defaultProvince.name },
      }));

      return store.bulkCreateTouristDestinations(inputs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['touristDestinations'] });
    },
  });

  const handleCreate = (input: TouristDestinationInput) => {
    if (!canCreate) {
      toast.error('Bạn không có quyền tạo điểm đến');
      return;
    }
    createMutation.mutate(input);
  };

  const handleEdit = (input: TouristDestinationInput) => {
    if (!canEdit) {
      toast.error('Bạn không có quyền sửa điểm đến');
      return;
    }
    if (editingDestination) {
      updateMutation.mutate({
        id: editingDestination.id,
        patch: {
          name: input.name,
          price: input.price,
          rawName: input.rawName,
          provinceRef: input.provinceRef,
        },
      });
    }
  };

  const handleOpenDialog = (destination?: TouristDestination) => {
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
      toast.error('Bạn không có quyền xóa điểm đến');
      return;
    }
    if (confirm('Bạn có chắc chắn muốn xóa TẤT CẢ điểm đến? Hành động này không thể hoàn tác.')) {
      deleteAllMutation.mutate();
    }
  };

  const handleBulkImport = async (items: DestinationImportItem[]) => {
    if (!canImport) {
      toast.error('Bạn không có quyền import điểm đến');
      return;
    }
    await bulkImportMutation.mutateAsync(items);
  };

  const handleExportTxt = () => {
    if (!canExport) {
      toast.error('Bạn không có quyền export điểm đến');
      return;
    }
    if (filteredDestinations.length === 0) {
      toast.error('Không có điểm đến nào để xuất');
      return;
    }

    const txtContent = filteredDestinations
      .map(dest => `${dest.name},${dest.price},${dest.rawName ?? ''}`)
      .join('\n');

    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `destinations-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất ${filteredDestinations.length} điểm đến`);
  };

  // Filter destinations based on column filters
  const filteredDestinations = useMemo(() => {
    return destinations.filter(dest => {
      const matchesName = !nameFilter || dest.name.toLowerCase().includes(nameFilter.toLowerCase());
      const matchesRawName = !rawNameFilter || (dest.rawName || '').toLowerCase().includes(rawNameFilter.toLowerCase());
      const matchesProvince = !provinceFilter || provinceFilter === 'all' || dest.provinceRef.nameAtBooking === provinceFilter;
      const matchesPrice = !priceFilter || dest.price.toString().includes(priceFilter);
      return matchesName && matchesRawName && matchesProvince && matchesPrice;
    });
  }, [destinations, nameFilter, rawNameFilter, provinceFilter, priceFilter]);

  const filters: DestinationFilters = {
    name: nameFilter,
    rawName: rawNameFilter,
    province: provinceFilter,
    price: priceFilter,
  };

  const handleFilterChange = (field: keyof DestinationFilters, value: string) => {
    if (field === 'name') setNameFilter(value);
    if (field === 'rawName') setRawNameFilter(value);
    if (field === 'province') setProvinceFilter(value);
    if (field === 'price') setPriceFilter(value);
  };

  const handleDeleteDestination = (destination: TouristDestination) => {
    if (!ensureCanModifyOwnedEntity(destination, user?.id, isAdmin)) return;
    if (confirm('Bạn có chắc chắn muốn xóa điểm đến này?')) {
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
              <h1 className="text-lg sm:text-xl md:text-3xl font-bold">Điểm đến</h1>
              <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground mt-0.5 sm:mt-1">Quản lý điểm đến du lịch</p>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2 sm:justify-end">
              {canExport && (
                <Button variant="outline" size="sm" onClick={handleExportTxt} className="h-8 px-2.5 text-xs md:h-9 md:px-4 md:text-sm">
                  <Download className="h-3.5 w-3.5 mr-1.5 md:mr-2" />
                  <span className="hidden sm:inline">Xuất TXT</span>
                  <span className="sm:hidden">Xuất</span>
                </Button>
              )}
              {canImport && (
                <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)} className="h-8 px-2.5 text-xs md:h-9 md:px-4 md:text-sm">
                  <Upload className="h-3.5 w-3.5 mr-1.5 md:mr-2" />
                  Nhập
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
                  Thêm điểm đến
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
              placeholder="Tìm điểm đến..."
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 md:py-12">Đang tải...</div>
        ) : destinations.length === 0 ? (
          <div className="text-center py-8 md:py-12 text-muted-foreground">
            Không tìm thấy điểm đến nào. Hãy tạo điểm đến đầu tiên.
          </div>
        ) : (
          <DestinationsList
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

      <DestinationDialog
        open={dialogOpen}
        onOpenChange={handleCloseDialog}
        onSubmit={editingDestination ? handleEdit : handleCreate}
        initialData={editingDestination}
        isEditing={!!editingDestination}
      />

      <DestinationImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleBulkImport}
      />
    </TooltipProvider>
  );
};

export default Destinations;
