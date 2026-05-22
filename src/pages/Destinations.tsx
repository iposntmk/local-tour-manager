import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Copy, Trash2, Upload, Trash, Download } from 'lucide-react';
import { SearchInput } from '@/components/master/SearchInput';
import { DestinationDialog } from '@/components/destinations/DestinationDialog';
import { BulkImportDialog } from '@/components/master/BulkImportDialog';
import type { TouristDestination, TouristDestinationInput } from '@/types/master';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import { useHeaderMode } from '@/hooks/useHeaderMode';
import { useAuth } from '@/contexts/AuthContext';
import { ensureCanModifyOwnedEntity } from '@/lib/master-ownership';

const Destinations = () => {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingDestination, setEditingDestination] = useState<TouristDestination | undefined>();
  const [nameFilter, setNameFilter] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('');

  const queryClient = useQueryClient();
  const { hasPermission, user, isAdmin } = useAuth();
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

  const bulkImportMutation = useMutation({
    mutationFn: async (items: { name: string; price: number }[]) => {
      const provinces = await store.listProvinces();
      const defaultProvince = provinces[0] || { id: '', name: 'Unknown' };

      const inputs: TouristDestinationInput[] = items.map(item => ({
        name: item.name,
        price: item.price,
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
        patch: { name: input.name, price: input.price, provinceRef: input.provinceRef },
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

  const handleBulkImport = async (items: { name: string; price: number }[]) => {
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
      .map(dest => `${dest.name},${dest.price}`)
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
      const matchesProvince = !provinceFilter || provinceFilter === 'all' || dest.provinceRef.nameAtBooking === provinceFilter;
      const matchesPrice = !priceFilter || dest.price.toString().includes(priceFilter);
      return matchesName && matchesProvince && matchesPrice;
    });
  }, [destinations, nameFilter, provinceFilter, priceFilter]);

  const { classes: headerClasses } = useHeaderMode('destinations.headerMode');

  return (
    <>
      <div className="space-y-6">
        <div className={headerClasses}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Điểm đến</h1>
              <p className="text-muted-foreground">Quản lý điểm đến du lịch</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {canExport && (
                <Button variant="outline" onClick={handleExportTxt}>
                  <Download className="h-4 w-4 mr-2" />
                  Xuất TXT
                </Button>
              )}
              {canImport && (
                <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Nhập
                </Button>
              )}
              {canDelete && (
                <Button variant="outline" onClick={handleDeleteAll} className="gap-2 text-destructive hover:text-destructive">
                  <Trash className="h-4 w-4" />
                  Xóa tất cả
                </Button>
              )}
              {canCreate && (
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
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
          <div className="text-center py-12">Đang tải...</div>
        ) : destinations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Không tìm thấy điểm đến nào. Hãy tạo điểm đến đầu tiên.
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block rounded-lg border">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Tên</th>
                    <th className="text-left p-4 font-medium">Tỉnh</th>
                    <th className="text-left p-4 font-medium">Đơn giá</th>
                    <th className="text-left p-4 font-medium">Cập nhật</th>
                    <th className="text-right p-4 font-medium">Thao tác</th>
                  </tr>
                  <tr>
                    <th className="p-2">
                      <Input
                        placeholder="Lọc theo tên..."
                        value={nameFilter}
                        onChange={(e) => setNameFilter(e.target.value)}
                        className="h-8"
                      />
                    </th>
                    <th className="p-2">
                      <Select value={provinceFilter} onValueChange={setProvinceFilter}>
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Tất cả tỉnh" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả</SelectItem>
                          {provinces.map((province) => (
                            <SelectItem key={province.id} value={province.name}>
                              {province.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </th>
                    <th className="p-2">
                      <Input
                        placeholder="Lọc theo giá..."
                        value={priceFilter}
                        onChange={(e) => setPriceFilter(e.target.value)}
                        className="h-8"
                      />
                    </th>
                    <th className="p-2"></th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDestinations.map((destination) => (
                    <tr
                      key={destination.id}
                      className="border-t hover:bg-muted/50 cursor-pointer"
                      onClick={() => canEdit && handleOpenDialog(destination)}
                    >
                      <td className="p-4 font-medium">{destination.name}</td>
                      <td className="p-4 text-muted-foreground">{destination.provinceRef.nameAtBooking}</td>
                      <td className="p-4 text-muted-foreground">
                        {formatCurrency(destination.price)}
                      </td>
                      <td className="p-4 text-muted-foreground text-sm">
                        {formatDate(destination.updatedAt.split("T")[0])}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          {canEdit && (
                            <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(destination)} className="h-8 w-8 p-0">
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canCreate && (
                            <Button variant="ghost" size="sm" onClick={() => duplicateMutation.mutate(destination.id)} className="h-8 w-8 p-0">
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (!ensureCanModifyOwnedEntity(destination, user?.id, isAdmin)) return;
                                if (confirm('Bạn có chắc chắn muốn xóa điểm đến này?')) {
                                  deleteMutation.mutate(destination.id);
                                }
                              }}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {filteredDestinations.map((destination) => (
                <div
                  key={destination.id}
                  className="rounded-lg border p-4 space-y-3 cursor-pointer hover:bg-muted/50"
                  onClick={() => canEdit && handleOpenDialog(destination)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium">{destination.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {destination.provinceRef.nameAtBooking} • {formatCurrency(destination.price)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Cập nhật {formatDate(destination.updatedAt.split("T")[0])}
                      </p>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {canEdit && (
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(destination)} className="h-8 w-8 p-0">
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {canCreate && (
                        <Button variant="ghost" size="sm" onClick={() => duplicateMutation.mutate(destination.id)} className="h-8 w-8 p-0">
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (!ensureCanModifyOwnedEntity(destination, user?.id, isAdmin)) return;
                            if (confirm('Bạn có chắc chắn muốn xóa điểm đến này?')) {
                              deleteMutation.mutate(destination.id);
                            }
                          }}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <DestinationDialog
        open={dialogOpen}
        onOpenChange={handleCloseDialog}
        onSubmit={editingDestination ? handleEdit : handleCreate}
        initialData={editingDestination}
        isEditing={!!editingDestination}
      />

      <BulkImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleBulkImport}
        title="Import điểm đến"
        description="Import điểm đến từ file hoặc dán dữ liệu. Mỗi dòng gồm: tên,đơn giá"
        placeholder="Nhập điểm đến (mỗi dòng một điểm, định dạng: tên,đơn giá)&#10;Ví dụ:&#10;Vịnh Hạ Long,1500000&#10;Sa Pa,2000000&#10;Phố cổ Hội An,800000"
        parseItem={(parts: string[]) => {
          if (parts.length >= 2 && parts[0].trim()) {
            const name = parts[0].trim();
            const price = parseFloat(parts[1].replace(/[^\d.-]/g, ''));
            if (!isNaN(price) && price > 0) {
              return { name, price };
            }
          }
          return null;
        }}
      />
    </>
  );
};

export default Destinations;
