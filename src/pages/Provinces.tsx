import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Copy, Trash2, Upload, Trash, Download } from 'lucide-react';
import { SearchInput } from '@/components/master/SearchInput';
import { ProvinceDialog } from '@/components/provinces/ProvinceDialog';
import { BulkImportDialog } from '@/components/master/BulkImportDialog';
import type { Province, ProvinceInput } from '@/types/master';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { useHeaderMode } from '@/hooks/useHeaderMode';
import { useAuth } from '@/contexts/AuthContext';
import { ensureCanModifyOwnedEntity } from '@/lib/master-ownership';

const Provinces = () => {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProvince, setEditingProvince] = useState<Province | undefined>();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [nameFilter, setNameFilter] = useState('');
  const [idFilter, setIdFilter] = useState('');
  const [updatedFilter, setUpdatedFilter] = useState('');

  const queryClient = useQueryClient();
  const { hasPermission, user, isAdmin } = useAuth();
  const canCreate = hasPermission('create_provinces');
  const canEdit = hasPermission('edit_provinces');
  const canDelete = hasPermission('delete_provinces');
  const canImport = hasPermission('import_provinces');
  const canExport = hasPermission('export_provinces');

  const { data: provinces = [], isLoading } = useQuery({
    queryKey: ['provinces', search],
    queryFn: () => store.listProvinces({ search }),
  });

  const createMutation = useMutation({
    mutationFn: (input: ProvinceInput) => store.createProvince(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provinces'] });
      toast.success('Tạo tỉnh thành thành công');
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Province> }) =>
      store.updateProvince(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provinces'] });
      toast.success('Cập nhật tỉnh thành thành công');
      setDialogOpen(false);
      setEditingProvince(undefined);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => store.duplicateProvince(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provinces'] });
      toast.success('Nhân bản tỉnh thành thành công');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => store.deleteProvince(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provinces'] });
      toast.success('Xóa tỉnh thành thành công');
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => store.deleteAllProvinces(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provinces'] });
      toast.success('Đã xóa tất cả tỉnh thành');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: (items: ProvinceInput[]) => store.bulkCreateProvinces(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provinces'] });
      toast.success('Import tỉnh thành thành công');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleCreate = (input: ProvinceInput) => {
    if (!canCreate) {
      toast.error('Bạn không có quyền tạo tỉnh thành');
      return;
    }
    createMutation.mutate(input);
  };

  const handleEdit = (input: ProvinceInput) => {
    if (!canEdit) {
      toast.error('Bạn không có quyền sửa tỉnh thành');
      return;
    }
    if (editingProvince) {
      updateMutation.mutate({
        id: editingProvince.id,
        patch: { name: input.name },
      });
    }
  };

  const handleOpenDialog = (province?: Province) => {
    if (province && !canEdit) return;
    if (!province && !canCreate) return;
    if (province && !ensureCanModifyOwnedEntity(province, user?.id, isAdmin)) return;
    setEditingProvince(province);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingProvince(undefined);
  };

  const handleDeleteAll = () => {
    if (!canDelete) {
      toast.error('Bạn không có quyền xóa tỉnh thành');
      return;
    }
    if (confirm('Bạn có chắc chắn muốn xóa TẤT CẢ tỉnh thành? Hành động này không thể hoàn tác.')) {
      deleteAllMutation.mutate();
    }
  };

  const handleBulkImport = async (items: ProvinceInput[]) => {
    if (!canImport) {
      toast.error('Bạn không có quyền import tỉnh thành');
      return;
    }
    await bulkImportMutation.mutateAsync(items);
  };

  const handleExportTxt = () => {
    if (!canExport) {
      toast.error('Bạn không có quyền export tỉnh thành');
      return;
    }
    if (filteredProvinces.length === 0) {
      toast.error('Không có tỉnh thành nào để xuất');
      return;
    }

    const txtContent = filteredProvinces
      .map(province => province.name)
      .join('\n');

    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `provinces-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất ${filteredProvinces.length} tỉnh thành`);
  };

  const filteredProvinces = useMemo(() => {
    return provinces.filter((province) => {
      const matchesId = !idFilter || province.id.toLowerCase().includes(idFilter.toLowerCase());
      const matchesName = !nameFilter || province.name.toLowerCase().includes(nameFilter.toLowerCase());
      const matchesUpdated = !updatedFilter || province.updatedAt.split("T")[0].includes(updatedFilter);
      return matchesId && matchesName && matchesUpdated;
    });
  }, [provinces, nameFilter, idFilter, updatedFilter]);

  const { classes: headerClasses } = useHeaderMode('provinces.headerMode');

  return (
    <>
      <div className="space-y-6">
        <div className={headerClasses}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Tỉnh thành</h1>
              <p className="text-muted-foreground">Quản lý tỉnh thành</p>
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
                <Button variant="outline" onClick={handleDeleteAll}>
                  <Trash className="h-4 w-4 mr-2" />
                  Xóa tất cả
                </Button>
              )}
              {canCreate && (
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm tỉnh thành
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
              placeholder="Tìm tỉnh thành..."
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Đang tải...</div>
        ) : provinces.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Không tìm thấy tỉnh thành nào. Hãy tạo tỉnh thành đầu tiên.
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block rounded-lg border">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">ID</th>
                    <th className="text-left p-4 font-medium">Tên</th>
                    <th className="text-left p-4 font-medium">Cập nhật</th>
                    <th className="text-right p-4 font-medium">Thao tác</th>
                  </tr>
                  <tr className="border-t">
                    <th className="p-2">
                      <Input
                        placeholder="Lọc theo ID..."
                        value={idFilter}
                        onChange={(e) => setIdFilter(e.target.value)}
                        className="h-8"
                      />
                    </th>
                    <th className="p-2">
                      <Input
                        placeholder="Lọc theo tên..."
                        value={nameFilter}
                        onChange={(e) => setNameFilter(e.target.value)}
                        className="h-8"
                      />
                    </th>
                    <th className="p-2">
                      <Input
                        placeholder="Lọc theo ngày..."
                        value={updatedFilter}
                        onChange={(e) => setUpdatedFilter(e.target.value)}
                        className="h-8"
                      />
                    </th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProvinces.map((province) => (
                    <tr
                      key={province.id}
                      className="border-t hover:bg-muted/50 cursor-pointer"
                      onClick={() => canEdit && handleOpenDialog(province)}
                    >
                      <td className="p-4 text-muted-foreground text-sm font-mono">{province.id}</td>
                      <td className="p-4 font-medium">{province.name}</td>
                      <td className="p-4 text-muted-foreground text-sm">
                        {formatDate(province.updatedAt.split("T")[0])}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          {canEdit && (
                            <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(province)} className="h-8 w-8 p-0">
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canCreate && (
                            <Button variant="ghost" size="sm" onClick={() => duplicateMutation.mutate(province.id)} className="h-8 w-8 p-0">
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (!ensureCanModifyOwnedEntity(province, user?.id, isAdmin)) return;
                                if (confirm('Bạn có chắc chắn muốn xóa tỉnh thành này?')) {
                                  deleteMutation.mutate(province.id);
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
              {filteredProvinces.map((province) => (
                <div
                  key={province.id}
                  className="rounded-lg border p-4 space-y-3 cursor-pointer hover:bg-muted/50"
                  onClick={() => canEdit && handleOpenDialog(province)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium">{province.name}</h3>
                      <p className="text-sm text-muted-foreground font-mono">ID: {province.id}</p>
                      <p className="text-sm text-muted-foreground">
                        Cập nhật {formatDate(province.updatedAt.split("T")[0])}
                      </p>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {canEdit && (
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(province)} className="h-8 w-8 p-0">
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {canCreate && (
                        <Button variant="ghost" size="sm" onClick={() => duplicateMutation.mutate(province.id)} className="h-8 w-8 p-0">
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (!ensureCanModifyOwnedEntity(province, user?.id, isAdmin)) return;
                            if (confirm('Bạn có chắc chắn muốn xóa tỉnh thành này?')) {
                              deleteMutation.mutate(province.id);
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

      <ProvinceDialog
        open={dialogOpen}
        onOpenChange={handleCloseDialog}
        onSubmit={editingProvince ? handleEdit : handleCreate}
        initialData={editingProvince}
        isEditing={!!editingProvince}
      />

      <BulkImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleBulkImport}
        title="Import tỉnh thành"
        description="Import nhiều tỉnh thành cùng lúc. Nhập mỗi dòng một tên tỉnh hoặc dùng định dạng dấu phẩy."
        placeholder="Nhập tên tỉnh thành (mỗi dòng một tên)&#10;Ví dụ:&#10;Hà Nội&#10;TP. Hồ Chí Minh&#10;Đà Nẵng&#10;&#10;Hoặc định dạng dấu phẩy:&#10;Hà Nội,TP. Hồ Chí Minh,Đà Nẵng"
        parseItem={(parts) => {
          // Support both single name format and comma-separated format
          const name = parts[0];
          if (name) {
            return { name };
          }
          return null;
        }}
      />
    </>
  );
};

export default Provinces;
