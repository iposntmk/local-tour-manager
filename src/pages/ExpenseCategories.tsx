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
      toast.success('Expense category created successfully');
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
      toast.success('Expense category updated successfully');
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
      toast.success('Expense category duplicated successfully');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => store.deleteExpenseCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseCategories'] });
      toast.success('Expense category deleted successfully');
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => store.deleteAllExpenseCategories(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseCategories'] });
      toast.success('All expense categories deleted successfully');
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
    if (confirm('Are you sure you want to delete ALL expense categories? This action cannot be undone.')) {
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
      toast.error('No expense categories to export');
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
    toast.success(`Exported ${filteredCategories.length} expense categories`);
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
              <h1 className="text-3xl font-bold">Expense Categories</h1>
              <p className="text-muted-foreground">Manage expense categories</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {canExport && (
                <Button variant="outline" onClick={handleExportTxt}>
                  <Download className="h-4 w-4 mr-2" />
                  Export TXT
                </Button>
              )}
              {canImport && (
                <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
              )}
              {canDelete && (
                <Button variant="outline" onClick={handleDeleteAll} className="gap-2 text-destructive hover:text-destructive">
                  <Trash className="h-4 w-4" />
                  Delete All
                </Button>
              )}
              {canCreate && (
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
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
              placeholder="Search categories..."
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No expense categories found. Create your first category to get started.
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block rounded-lg border">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">ID</th>
                    <th className="text-left p-4 font-medium">Name</th>
                    <th className="text-left p-4 font-medium">Updated</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                  <tr className="border-t">
                    <th className="p-2">
                      <Input
                        placeholder="Filter by ID..."
                        value={idFilter}
                        onChange={(e) => setIdFilter(e.target.value)}
                        className="h-8"
                      />
                    </th>
                    <th className="p-2">
                      <Input
                        placeholder="Filter by name..."
                        value={nameFilter}
                        onChange={(e) => setNameFilter(e.target.value)}
                        className="h-8"
                      />
                    </th>
                    <th className="p-2">
                      <Input
                        placeholder="Filter by date..."
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
                                if (confirm('Are you sure you want to delete this category?')) {
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
                        Updated {formatDate(category.updatedAt.split("T")[0])}
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
                            if (confirm('Are you sure you want to delete this category?')) {
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
        title="Import Expense Categories"
        description="Import multiple expense categories at once. Enter one category name per line."
        placeholder="Enter category names (one per line)\nExample:\nTransportation\nAccommodation\nFood & Beverage\nEntertainment"
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
