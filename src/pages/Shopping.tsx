import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { formatCurrency } from '@/lib/currency-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Copy, Trash2, Upload, Trash, Download } from 'lucide-react';
import { SearchInput } from '@/components/master/SearchInput';
import { ShoppingDialog } from '@/components/shopping/ShoppingDialog';
import { BulkImportDialog } from '@/components/master/BulkImportDialog';
import type { Shopping, ShoppingInput } from '@/types/master';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { useHeaderMode } from '@/hooks/useHeaderMode';
import { useAuth } from '@/contexts/AuthContext';
import { ensureCanModifyOwnedEntity } from '@/lib/master-ownership';

const ShoppingPage = () => {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingShopping, setEditingShopping] = useState<Shopping | undefined>();
  const [nameFilter, setNameFilter] = useState('');
  const [idFilter, setIdFilter] = useState('');
  const [updatedFilter, setUpdatedFilter] = useState('');

  const queryClient = useQueryClient();
  const { hasPermission, user, isAdmin } = useAuth();
  const canCreate = hasPermission('create_shopping');
  const canEdit = hasPermission('edit_shopping');
  const canDelete = hasPermission('delete_shopping');
  const canImport = hasPermission('import_shopping');
  const canExport = hasPermission('export_shopping');

  const { data: shoppings = [], isLoading } = useQuery({
    queryKey: ['shoppings', search],
    queryFn: () => store.listShoppings({ search }),
  });

  const createMutation = useMutation({
    mutationFn: (input: ShoppingInput) => store.createShopping(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shoppings'] });
      toast.success('Tạo điểm mua sắm thành công');
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Shopping> }) =>
      store.updateShopping(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shoppings'] });
      toast.success('Cập nhật điểm mua sắm thành công');
      setDialogOpen(false);
      setEditingShopping(undefined);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => store.duplicateShopping(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shoppings'] });
      toast.success('Nhân bản điểm mua sắm thành công');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => store.deleteShopping(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shoppings'] });
      toast.success('Xóa điểm mua sắm thành công');
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => store.deleteAllShoppings(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shoppings'] });
      toast.success('Đã xóa tất cả điểm mua sắm');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Xóa tất cả điểm mua sắm thất bại');
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: (items: { name: string }[]) => store.bulkCreateShoppings(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shoppings'] });
      toast.success('Import điểm mua sắm thành công');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Import điểm mua sắm thất bại');
    },
  });

  const handleCreate = (input: ShoppingInput) => {
    if (!canCreate) {
      toast.error('Bạn không có quyền tạo điểm mua sắm');
      return;
    }
    createMutation.mutate(input);
  };

  const handleEdit = (input: ShoppingInput) => {
    if (!canEdit) {
      toast.error('Bạn không có quyền sửa điểm mua sắm');
      return;
    }
    if (editingShopping) {
      updateMutation.mutate({
        id: editingShopping.id,
        patch: { name: input.name },
      });
    }
  };

  const handleOpenDialog = (shopping?: Shopping) => {
    if (shopping && !canEdit) return;
    if (!shopping && !canCreate) return;
    if (shopping && !ensureCanModifyOwnedEntity(shopping, user?.id, isAdmin)) return;
    setEditingShopping(shopping);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingShopping(undefined);
  };

  const handleDeleteAll = async () => {
    if (!canDelete) {
      toast.error('Bạn không có quyền xóa điểm mua sắm');
      return;
    }
    if (confirm('Bạn có chắc chắn muốn xóa TẤT CẢ điểm mua sắm? Hành động này không thể hoàn tác.')) {
      await deleteAllMutation.mutateAsync();
    }
  };

  const handleBulkImport = async (items: { name: string }[]) => {
    if (!canImport) {
      toast.error('Bạn không có quyền import điểm mua sắm');
      return;
    }
    await bulkImportMutation.mutateAsync(items);
  };

  const handleExportTxt = () => {
    if (!canExport) {
      toast.error('Bạn không có quyền export điểm mua sắm');
      return;
    }
    if (filteredShoppings.length === 0) {
      toast.error('Không có điểm mua sắm nào để xuất');
      return;
    }

    const txtContent = filteredShoppings
      .map(shopping => shopping.name)
      .join('\n');

    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shopping-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất ${filteredShoppings.length} điểm mua sắm`);
  };

  const filteredShoppings = useMemo(() => {
    return shoppings.filter((shopping) => {
      const matchesId = idFilter === '' || shopping.id.toLowerCase().includes(idFilter.toLowerCase());
      const matchesName = nameFilter === '' ||
        shopping.name.toLowerCase().includes(nameFilter.toLowerCase());
      const matchesUpdated = updatedFilter === '' ||
        shopping.updatedAt.split("T")[0].includes(updatedFilter);
      return matchesId && matchesName && matchesUpdated;
    });
  }, [shoppings, nameFilter, idFilter, updatedFilter]);

  const { classes: headerClasses } = useHeaderMode('shopping.headerMode');

  return (
    <>
      <div className="space-y-6">
        <div className={headerClasses}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Mua sắm</h1>
              <p className="text-muted-foreground">Quản lý điểm mua sắm</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {canExport && (
                <Button onClick={handleExportTxt} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Xuất TXT
                </Button>
              )}
              {canImport && (
                <Button onClick={() => setImportDialogOpen(true)} variant="outline" className="gap-2">
                  <Upload className="h-4 w-4" />
                  Nhập
                </Button>
              )}
              {canDelete && (
                <Button onClick={handleDeleteAll} variant="outline" className="gap-2 text-destructive hover:text-destructive">
                  <Trash className="h-4 w-4" />
                  Xóa tất cả
                </Button>
              )}
              {canCreate && (
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm mua sắm
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
              placeholder="Tìm mua sắm..."
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Đang tải...</div>
        ) : shoppings.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Không tìm thấy điểm mua sắm nào. Hãy tạo điểm mua sắm đầu tiên.
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
                  <tr>
                    <th className="text-left p-4">
                      <Input
                        placeholder="Lọc theo ID..."
                        value={idFilter}
                        onChange={(e) => setIdFilter(e.target.value)}
                        className="h-8"
                      />
                    </th>
                    <th className="text-left p-4">
                      <Input
                        placeholder="Lọc theo tên..."
                        value={nameFilter}
                        onChange={(e) => setNameFilter(e.target.value)}
                        className="h-8"
                      />
                    </th>
                    <th className="text-left p-4">
                      <Input
                        placeholder="Lọc theo ngày..."
                        value={updatedFilter}
                        onChange={(e) => setUpdatedFilter(e.target.value)}
                        className="h-8"
                      />
                    </th>
                    <th className="text-right p-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShoppings.map((shopping) => (
                    <tr
                      key={shopping.id}
                      className="border-t hover:bg-muted/50 cursor-pointer"
                      onClick={() => canEdit && handleOpenDialog(shopping)}
                    >
                      <td className="p-4 text-muted-foreground text-sm font-mono">{shopping.id}</td>
                      <td className="p-4 font-medium">{shopping.name}</td>
                      <td className="p-4 text-muted-foreground text-sm">
                        {formatDate(shopping.updatedAt.split("T")[0])}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          {canEdit && (
                            <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(shopping)} className="h-8 w-8 p-0">
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canCreate && (
                            <Button variant="ghost" size="sm" onClick={() => duplicateMutation.mutate(shopping.id)} className="h-8 w-8 p-0">
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (!ensureCanModifyOwnedEntity(shopping, user?.id, isAdmin)) return;
                                if (confirm('Bạn có chắc chắn muốn xóa điểm mua sắm này?')) {
                                  deleteMutation.mutate(shopping.id);
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
              {filteredShoppings.map((shopping) => (
                <div
                  key={shopping.id}
                  className="rounded-lg border p-4 space-y-3 cursor-pointer hover:bg-muted/50"
                  onClick={() => canEdit && handleOpenDialog(shopping)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium">{shopping.name}</h3>
                      <p className="text-sm text-muted-foreground font-mono">ID: {shopping.id}</p>
                      <p className="text-sm text-muted-foreground">
                        Cập nhật {formatDate(shopping.updatedAt.split("T")[0])}
                      </p>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {canEdit && (
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(shopping)} className="h-8 w-8 p-0">
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {canCreate && (
                        <Button variant="ghost" size="sm" onClick={() => duplicateMutation.mutate(shopping.id)} className="h-8 w-8 p-0">
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (!ensureCanModifyOwnedEntity(shopping, user?.id, isAdmin)) return;
                            if (confirm('Bạn có chắc chắn muốn xóa điểm mua sắm này?')) {
                              deleteMutation.mutate(shopping.id);
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

      <ShoppingDialog
        open={dialogOpen}
        onOpenChange={handleCloseDialog}
        onSubmit={editingShopping ? handleEdit : handleCreate}
        initialData={editingShopping}
        isEditing={!!editingShopping}
      />

      <BulkImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleBulkImport}
        title="Import điểm mua sắm"
        description="Tải lên hoặc dán tên điểm mua sắm"
        placeholder="Nhập tên điểm mua sắm (mỗi dòng một tên hoặc cách nhau bằng dấu phẩy)
Ví dụ:
Chợ Bến Thành
Vincom Center
Big C"
        parseItem={(parts: string[]) => {
          if (parts.length >= 1 && parts[0].trim()) {
            return {
              name: parts[0].trim()
            };
          }
          return null;
        }}
      />
    </>
  );
};

export default ShoppingPage;
