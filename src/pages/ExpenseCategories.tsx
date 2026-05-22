import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Copy, Trash2, Upload, Trash, Download } from 'lucide-react';
import { SearchInput } from '@/components/master/SearchInput';
import { ExpenseCategoryDialog } from '@/components/expense-categories/ExpenseCategoryDialog';
import { BulkImportDialog } from '@/components/master/BulkImportDialog';
import type { ExpenseCategory, ExpenseCategoryInput } from '@/types/master';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { useHeaderMode } from '@/hooks/useHeaderMode';
import { useAuth } from '@/contexts/AuthContext';
import { ensureCanModifyOwnedEntity } from '@/lib/master-ownership';

const ExpenseCategories = () => {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | undefined>();
  const [nameFilter, setNameFilter] = useState('');
  const [idFilter, setIdFilter] = useState('');
  const [updatedFilter, setUpdatedFilter] = useState('');

  const queryClient = useQueryClient();
  const { hasPermission, user, isAdmin } = useAuth();
  const canCreate = hasPermission('create_expense_categories');
  const canEdit = hasPermission('edit_expense_categories');
  const canDelete = hasPermission('delete_expense_categories');
  const canImport = hasPermission('import_expense_categories');
  const canExport = hasPermission('export_expense_categories');

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['expenseCategories', search],
    queryFn: () => store.listExpenseCategories({ search }),
  });

  const createMutation = useMutation({
    mutationFn: (input: ExpenseCategoryInput) => store.createExpenseCategory(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseCategories'] });
      toast.success('Tạo danh mục chi phí thành công');
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ExpenseCategory> }) =>
      store.updateExpenseCategory(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseCategories'] });
      toast.success('Cập nhật danh mục chi phí thành công');
      setDialogOpen(false);
      setEditingCategory(undefined);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => store.duplicateExpenseCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseCategories'] });
      toast.success('Nhân bản danh mục chi phí thành công');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => store.deleteExpenseCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseCategories'] });
      toast.success('Xóa danh mục chi phí thành công');
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => store.deleteAllExpenseCategories(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseCategories'] });
      toast.success('Đã xóa tất cả danh mục chi phí');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: (items: ExpenseCategoryInput[]) => store.bulkCreateExpenseCategories(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseCategories'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleCreate = (input: ExpenseCategoryInput) => {
    if (!canCreate) {
      toast.error('Bạn không có quyền tạo danh mục chi phí');
      return;
    }
    createMutation.mutate(input);
  };

  const handleEdit = (input: ExpenseCategoryInput) => {
    if (!canEdit) {
      toast.error('Bạn không có quyền sửa danh mục chi phí');
      return;
    }
    if (editingCategory) {
      updateMutation.mutate({
        id: editingCategory.id,
        patch: { name: input.name },
      });
    }
  };

  const handleOpenDialog = (category?: ExpenseCategory) => {
    if (category && !canEdit) return;
    if (!category && !canCreate) return;
    if (category && !ensureCanModifyOwnedEntity(category, user?.id, isAdmin)) return;
    setEditingCategory(category);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCategory(undefined);
  };

  const handleDeleteAll = () => {
    if (!canDelete) {
      toast.error('Bạn không có quyền xóa danh mục chi phí');
      return;
    }
    if (confirm('Bạn có chắc chắn muốn xóa TẤT CẢ danh mục chi phí? Hành động này không thể hoàn tác.')) {
      deleteAllMutation.mutate();
    }
  };

  const handleBulkImport = async (items: ExpenseCategoryInput[]) => {
    if (!canImport) {
      toast.error('Bạn không có quyền import danh mục chi phí');
      return;
    }
    await bulkImportMutation.mutateAsync(items);
  };

  const handleExportTxt = () => {
    if (!canExport) {
      toast.error('Bạn không có quyền export danh mục chi phí');
      return;
    }
    if (filteredCategories.length === 0) {
      toast.error('Không có danh mục chi phí nào để xuất');
      return;
    }

    const txtContent = filteredCategories
      .map(category => category.name)
      .join('\n');

    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense-categories-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất ${filteredCategories.length} danh mục chi phí`);
  };

  const filteredCategories = useMemo(() => {
    return categories.filter(category => {
      const matchesId = !idFilter || category.id.toLowerCase().includes(idFilter.toLowerCase());
      const matchesName = !nameFilter || category.name.toLowerCase().includes(nameFilter.toLowerCase());
      const matchesUpdated = !updatedFilter || category.updatedAt.split("T")[0].includes(updatedFilter);
      return matchesId && matchesName && matchesUpdated;
    });
  }, [categories, nameFilter, idFilter, updatedFilter]);

  const { classes: headerClasses } = useHeaderMode('expensecategories.headerMode');

  return (
    <>
      <div className="space-y-6">
        <div className={headerClasses}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Danh mục chi phí</h1>
              <p className="text-muted-foreground">Quản lý danh mục chi phí</p>
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
                  Thêm danh mục
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
              placeholder="Tìm danh mục..."
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Đang tải...</div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Không tìm thấy danh mục chi phí nào. Hãy tạo danh mục đầu tiên.
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
                  {filteredCategories.map((category) => (
                    <tr
                      key={category.id}
                      className="border-t hover:bg-muted/50 cursor-pointer"
                      onClick={() => canEdit && handleOpenDialog(category)}
                    >
                      <td className="p-4 text-muted-foreground text-sm font-mono">{category.id}</td>
                      <td className="p-4 font-medium">{category.name}</td>
                      <td className="p-4 text-muted-foreground text-sm">
                        {formatDate(category.updatedAt.split("T")[0])}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          {canEdit && (
                            <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(category)} className="h-8 w-8 p-0">
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canCreate && (
                            <Button variant="ghost" size="sm" onClick={() => duplicateMutation.mutate(category.id)} className="h-8 w-8 p-0">
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (!ensureCanModifyOwnedEntity(category, user?.id, isAdmin)) return;
                                if (confirm('Bạn có chắc chắn muốn xóa danh mục này?')) {
                                  deleteMutation.mutate(category.id);
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
              {filteredCategories.map((category) => (
                <div
                  key={category.id}
                  className="rounded-lg border p-4 space-y-3 cursor-pointer hover:bg-muted/50"
                  onClick={() => canEdit && handleOpenDialog(category)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium">{category.name}</h3>
                      <p className="text-sm text-muted-foreground font-mono">ID: {category.id}</p>
                      <p className="text-sm text-muted-foreground">
                        Cập nhật {formatDate(category.updatedAt.split("T")[0])}
                      </p>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {canEdit && (
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(category)} className="h-8 w-8 p-0">
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {canCreate && (
                        <Button variant="ghost" size="sm" onClick={() => duplicateMutation.mutate(category.id)} className="h-8 w-8 p-0">
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (!ensureCanModifyOwnedEntity(category, user?.id, isAdmin)) return;
                            if (confirm('Bạn có chắc chắn muốn xóa danh mục này?')) {
                              deleteMutation.mutate(category.id);
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

      <ExpenseCategoryDialog
        open={dialogOpen}
        onOpenChange={handleCloseDialog}
        onSubmit={editingCategory ? handleEdit : handleCreate}
        initialData={editingCategory}
        isEditing={!!editingCategory}
      />

      <BulkImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleBulkImport}
        title="Import danh mục chi phí"
        description="Import nhiều danh mục chi phí cùng lúc. Nhập mỗi dòng một tên danh mục."
        placeholder="Nhập tên danh mục (mỗi dòng một danh mục)\nVí dụ:\nDi chuyển\nLưu trú\nĂn uống\nGiải trí"
        parseItem={(parts) => {
          // Accept both single name per line and comma-separated format
          const name = parts[0];
          if (name && name.trim()) {
            return { name: name.trim() };
          }
          return null;
        }}
      />
    </>
  );
};

export default ExpenseCategories;
