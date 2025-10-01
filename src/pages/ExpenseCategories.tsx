import { Layout } from '@/components/Layout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Copy, Trash2 } from 'lucide-react';
import { SearchInput } from '@/components/master/SearchInput';
import { ExpenseCategoryDialog } from '@/components/expense-categories/ExpenseCategoryDialog';
import type { ExpenseCategory, ExpenseCategoryInput } from '@/types/master';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { useHeaderMode } from '@/hooks/useHeaderMode';
import { HeaderModeControls } from '@/components/common/HeaderModeControls';

const ExpenseCategories = () => {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | undefined>();
  
  const queryClient = useQueryClient();

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

  const handleCreate = (input: ExpenseCategoryInput) => {
    createMutation.mutate(input);
  };

  const handleEdit = (input: ExpenseCategoryInput) => {
    if (editingCategory) {
      updateMutation.mutate({
        id: editingCategory.id,
        patch: { name: input.name },
      });
    }
  };

  const handleOpenDialog = (category?: ExpenseCategory) => {
    setEditingCategory(category);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCategory(undefined);
  };

  const { mode: headerMode, setMode: setHeaderMode, classes: headerClasses } = useHeaderMode('expensecategories.headerMode');

  return (
    <Layout>
      <div className="space-y-6">
        <div className={headerClasses}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Expense Categories</h1>
              <p className="text-muted-foreground">Manage expense categories</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
              <HeaderModeControls mode={headerMode} onChange={setHeaderMode} />
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
                    <th className="text-left p-4 font-medium">Name</th>
                    <th className="text-left p-4 font-medium">Updated</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr
                      key={category.id}
                      className="border-t hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleOpenDialog(category)}
                    >
                      <td className="p-4 font-medium">{category.name}</td>
                      <td className="p-4 text-muted-foreground text-sm">
                        {formatDate(category.updatedAt.split("T")[0])}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(category)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => duplicateMutation.mutate(category.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this category?')) {
                                deleteMutation.mutate(category.id);
                              }
                            }}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="rounded-lg border p-4 space-y-3 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleOpenDialog(category)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium">{category.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Updated {formatDate(category.updatedAt.split("T")[0])}
                      </p>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(category)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => duplicateMutation.mutate(category.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this category?')) {
                            deleteMutation.mutate(category.id);
                          }
                        }}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
    </Layout>
  );
};

export default ExpenseCategories;
