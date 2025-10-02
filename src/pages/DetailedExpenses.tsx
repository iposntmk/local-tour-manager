import { Layout } from '@/components/Layout';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Copy, Trash2, Upload, Trash } from 'lucide-react';
import { SearchInput } from '@/components/master/SearchInput';
import { DetailedExpenseDialog } from '@/components/detailed-expenses/DetailedExpenseDialog';
import { BulkImportDialog } from '@/components/master/BulkImportDialog';
import type { DetailedExpense, DetailedExpenseInput } from '@/types/master';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { useHeaderMode } from '@/hooks/useHeaderMode';

const DetailedExpenses = () => {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<DetailedExpense | undefined>();
  const [nameFilter, setNameFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priceFilter, setPriceFilter] = useState('');

  const queryClient = useQueryClient();

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
      toast.success('Detailed expense created successfully');
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
      toast.success('Detailed expense updated successfully');
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
      toast.success('Detailed expense duplicated successfully');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => store.deleteDetailedExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detailedExpenses'] });
      toast.success('Detailed expense deleted successfully');
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => store.deleteAllDetailedExpenses(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detailedExpenses'] });
      toast.success('All detailed expenses deleted successfully');
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
  });

  const handleCreate = (input: DetailedExpenseInput) => {
    createMutation.mutate(input);
  };

  const handleEdit = (input: DetailedExpenseInput) => {
    if (editingExpense) {
      updateMutation.mutate({
        id: editingExpense.id,
        patch: { name: input.name, price: input.price, categoryRef: input.categoryRef },
      });
    }
  };

  const handleOpenDialog = (expense?: DetailedExpense) => {
    setEditingExpense(expense);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingExpense(undefined);
  };

  const handleDeleteAll = () => {
    if (confirm('Are you sure you want to delete ALL detailed expenses? This action cannot be undone.')) {
      deleteAllMutation.mutate();
    }
  };

  const handleBulkImport = async (items: { name: string; price: number }[]) => {
    await bulkImportMutation.mutateAsync(items);
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
    <Layout>
      <div className="space-y-6">
        <div className={headerClasses}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Detailed Expenses</h1>
              <p className="text-muted-foreground">Manage detailed expenses</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" onClick={handleDeleteAll} className="gap-2 text-destructive hover:text-destructive">
                <Trash className="h-4 w-4" />
                Delete All
              </Button>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search expenses..."
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No detailed expenses found. Create your first expense to get started.
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block rounded-lg border">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Name</th>
                    <th className="text-left p-4 font-medium">Category</th>
                    <th className="text-left p-4 font-medium">Price</th>
                    <th className="text-left p-4 font-medium">Updated</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                  <tr>
                    <th className="p-2">
                      <Input
                        placeholder="Filter name..."
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
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
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
                        placeholder="Filter price..."
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
                      className="border-t hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleOpenDialog(expense)}
                    >
                      <td className="p-4 font-medium">{expense.name}</td>
                      <td className="p-4 text-muted-foreground">{expense.categoryRef.nameAtBooking}</td>
                      <td className="p-4 text-muted-foreground">
                        {expense.price.toLocaleString()} ₫
                      </td>
                      <td className="p-4 text-muted-foreground text-sm">
                        {formatDate(expense.updatedAt.split("T")[0])}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(expense)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => duplicateMutation.mutate(expense.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this expense?')) {
                                deleteMutation.mutate(expense.id);
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
              {filteredExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="rounded-lg border p-4 space-y-3 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleOpenDialog(expense)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium">{expense.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {expense.categoryRef.nameAtBooking} • {expense.price.toLocaleString()} ₫
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Updated {formatDate(expense.updatedAt.split("T")[0])}
                      </p>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(expense)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => duplicateMutation.mutate(expense.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this expense?')) {
                            deleteMutation.mutate(expense.id);
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
        title="Import Detailed Expenses"
        description="Import detailed expenses from a text file or paste data. Each line should have: name,price"
        placeholder="Enter expenses (one per line, format: name,price)&#10;Example:&#10;Airport Transfer,500000&#10;Hotel Booking,3000000&#10;Tour Guide Fee,800000"
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
    </Layout>
  );
};

export default DetailedExpenses;
