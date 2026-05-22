import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { formatCurrency } from '@/lib/currency-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Copy, Trash2, Upload, Trash, Download, Eye, EyeOff } from 'lucide-react';
import { SearchInput } from '@/components/master/SearchInput';
import { DetailedExpenseDialog } from '@/components/detailed-expenses/DetailedExpenseDialog';
import { BulkImportDialog } from '@/components/master/BulkImportDialog';
import type { DetailedExpense, DetailedExpenseInput } from '@/types/master';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { useHeaderMode } from '@/hooks/useHeaderMode';
import { useAuth } from '@/contexts/AuthContext';
import { ensureCanModifyOwnedEntity } from '@/lib/master-ownership';

const DetailedExpenses = () => {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<DetailedExpense | undefined>();
  const [nameFilter, setNameFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priceFilter, setPriceFilter] = useState('');

  const queryClient = useQueryClient();
  const { hasPermission, user, isAdmin } = useAuth();
  const canCreate = hasPermission('create_detailed_expenses');
  const canEdit = hasPermission('edit_detailed_expenses');
  const canDelete = hasPermission('delete_detailed_expenses');
  const canImport = hasPermission('import_detailed_expenses');
  const canExport = hasPermission('export_detailed_expenses');

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['detailedExpenses', search],
    queryFn: () => store.listDetailedExpenses({ search }),
  });

  const { data: expenseCategories = [] } = useQuery({
    queryKey: ['expenseCategories'],
    queryFn: () => store.listExpenseCategories(),
  });

  const createMutation = useMutation({
    mutationFn: (input: DetailedExpenseInput) => store.createDetailedExpense(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detailedExpenses'] });
      toast.success('Tạo chi phí chi tiết thành công');
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<DetailedExpense> }) =>
      store.updateDetailedExpense(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detailedExpenses'] });
      toast.success('Cập nhật chi phí chi tiết thành công');
      setDialogOpen(false);
      setEditingExpense(undefined);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => store.duplicateDetailedExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detailedExpenses'] });
      toast.success('Nhân bản chi phí chi tiết thành công');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => store.deleteDetailedExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detailedExpenses'] });
      toast.success('Đã ẩn chi phí chi tiết');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id: string) => store.toggleDetailedExpenseStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detailedExpenses'] });
      toast.success('Cập nhật trạng thái thành công');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => store.deleteAllDetailedExpenses(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detailedExpenses'] });
      toast.success('Đã xóa tất cả chi phí chi tiết');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (items: { name: string; price: number }[]) => {
      const categories = await store.listExpenseCategories();
      const defaultCategory = categories[0] || { id: '', name: 'Other' };

      const inputs: DetailedExpenseInput[] = items.map(item => ({
        name: item.name,
        price: item.price,
        categoryRef: { id: defaultCategory.id, nameAtBooking: defaultCategory.name },
      }));

      return store.bulkCreateDetailedExpenses(inputs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detailedExpenses'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleCreate = (input: DetailedExpenseInput) => {
    if (!canCreate) {
      toast.error('Bạn không có quyền tạo chi phí chi tiết');
      return;
    }
    createMutation.mutate(input);
  };

  const handleEdit = (input: DetailedExpenseInput) => {
    if (!canEdit) {
      toast.error('Bạn không có quyền sửa chi phí chi tiết');
      return;
    }
    if (editingExpense) {
      updateMutation.mutate({
        id: editingExpense.id,
        patch: { name: input.name, price: input.price, categoryRef: input.categoryRef },
      });
    }
  };

  const handleOpenDialog = (expense?: DetailedExpense) => {
    if (expense && !canEdit) return;
    if (!expense && !canCreate) return;
    if (expense && !ensureCanModifyOwnedEntity(expense, user?.id, isAdmin)) return;
    setEditingExpense(expense);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingExpense(undefined);
  };

  const handleDeleteAll = () => {
    if (!canDelete) {
      toast.error('Bạn không có quyền xóa chi phí chi tiết');
      return;
    }
    if (confirm('Bạn có chắc chắn muốn xóa TẤT CẢ chi phí chi tiết? Hành động này không thể hoàn tác.')) {
      deleteAllMutation.mutate();
    }
  };

  const handleBulkImport = async (items: { name: string; price: number }[]) => {
    if (!canImport) {
      toast.error('Bạn không có quyền import chi phí chi tiết');
      return;
    }
    await bulkImportMutation.mutateAsync(items);
  };

  const handleExportTxt = () => {
    if (!canExport) {
      toast.error('Bạn không có quyền export chi phí chi tiết');
      return;
    }
    if (filteredExpenses.length === 0) {
      toast.error('Không có chi phí chi tiết nào để xuất');
      return;
    }

    const txtContent = filteredExpenses
      .map(expense => `${expense.name},${expense.price}`)
      .join('\n');

    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `detailed-expenses-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất ${filteredExpenses.length} chi phí chi tiết`);
  };

  // Filter expenses based on column filters
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const matchesName = !nameFilter || expense.name.toLowerCase().includes(nameFilter.toLowerCase());
      const matchesCategory = !categoryFilter || expense.categoryRef.nameAtBooking === categoryFilter;
      const matchesPrice = !priceFilter || expense.price.toString().includes(priceFilter);
      return matchesName && matchesCategory && matchesPrice;
    });
  }, [expenses, nameFilter, categoryFilter, priceFilter]);

  const { classes: headerClasses } = useHeaderMode('detailedexpenses.headerMode');

  return (
    <>
      <div className="space-y-6">
        <div className={headerClasses}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Chi phí chi tiết</h1>
              <p className="text-muted-foreground">Quản lý chi phí chi tiết</p>
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
                  Thêm chi phí
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
              placeholder="Tìm chi phí..."
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Đang tải...</div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Không tìm thấy chi phí chi tiết nào. Hãy tạo chi phí đầu tiên.
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block rounded-lg border">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Tên</th>
                    <th className="text-left p-4 font-medium">Danh mục</th>
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
                      <Select
                        value={categoryFilter}
                        onValueChange={(value) => setCategoryFilter(value === 'all' ? '' : value)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Tất cả danh mục" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả</SelectItem>
                          {expenseCategories.map((category) => (
                            <SelectItem key={category.id} value={category.name}>
                              {category.name}
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
                  {filteredExpenses.map((expense) => (
                    <tr
                      key={expense.id}
                      className={`border-t hover:bg-muted/50 cursor-pointer ${expense.status === 'inactive' ? 'opacity-50 bg-muted/30' : ''}`}
                      onClick={() => canEdit && handleOpenDialog(expense)}
                    >
                      <td className="p-4 font-medium">
                        {expense.name}
                        {expense.status === 'inactive' && (
                          <span className="ml-2 text-xs text-muted-foreground">(Đã ẩn)</span>
                        )}
                      </td>
                      <td className="p-4 text-muted-foreground">{expense.categoryRef.nameAtBooking}</td>
                      <td className="p-4 text-muted-foreground">
                        {formatCurrency(expense.price)}
                      </td>
                      <td className="p-4 text-muted-foreground text-sm">
                        {formatDate(expense.updatedAt.split("T")[0])}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          {canEdit && (
                            <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(expense)} className="h-8 w-8 p-0">
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canCreate && (
                            <Button variant="ghost" size="sm" onClick={() => duplicateMutation.mutate(expense.id)} className="h-8 w-8 p-0">
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleStatusMutation.mutate(expense.id)}
                              className="h-8 w-8 p-0"
                              title={expense.status === 'active' ? 'Ẩn chi phí' : 'Hiện chi phí'}
                            >
                              {expense.status === 'active' ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (!ensureCanModifyOwnedEntity(expense, user?.id, isAdmin)) return;
                                if (confirm('Bạn có chắc chắn muốn ẩn chi phí này?')) {
                                  deleteMutation.mutate(expense.id);
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
              {filteredExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className={`rounded-lg border p-4 space-y-3 cursor-pointer hover:bg-muted/50 ${expense.status === 'inactive' ? 'opacity-50 bg-muted/30' : ''}`}
                  onClick={() => canEdit && handleOpenDialog(expense)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium">
                        {expense.name}
                        {expense.status === 'inactive' && (
                          <span className="ml-2 text-xs text-muted-foreground">(Đã ẩn)</span>
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {expense.categoryRef.nameAtBooking} • {formatCurrency(expense.price)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Cập nhật {formatDate(expense.updatedAt.split("T")[0])}
                      </p>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {canEdit && (
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(expense)} className="h-8 w-8 p-0">
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {canCreate && (
                        <Button variant="ghost" size="sm" onClick={() => duplicateMutation.mutate(expense.id)} className="h-8 w-8 p-0">
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleStatusMutation.mutate(expense.id)}
                          className="h-8 w-8 p-0"
                          title={expense.status === 'active' ? 'Ẩn chi phí' : 'Hiện chi phí'}
                        >
                          {expense.status === 'active' ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (!ensureCanModifyOwnedEntity(expense, user?.id, isAdmin)) return;
                            if (confirm('Bạn có chắc chắn muốn ẩn chi phí này?')) {
                              deleteMutation.mutate(expense.id);
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

      <DetailedExpenseDialog
        open={dialogOpen}
        onOpenChange={handleCloseDialog}
        onSubmit={editingExpense ? handleEdit : handleCreate}
        initialData={editingExpense}
        isEditing={!!editingExpense}
      />

      <BulkImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleBulkImport}
        title="Import chi phí chi tiết"
        description="Import chi phí chi tiết từ file hoặc dán dữ liệu. Mỗi dòng gồm: tên,đơn giá"
        placeholder="Nhập chi phí (mỗi dòng một chi phí, định dạng: tên,đơn giá)&#10;Ví dụ:&#10;Xe đón sân bay,500000&#10;Đặt phòng khách sạn,3000000&#10;Phí HDV,800000"
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

export default DetailedExpenses;
