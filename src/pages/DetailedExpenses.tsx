import { Layout } from '@/components/Layout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Plus, MoreVertical } from 'lucide-react';
import { SearchInput } from '@/components/master/SearchInput';
import { StatusBadge } from '@/components/master/StatusBadge';
import { DetailedExpenseDialog } from '@/components/detailed-expenses/DetailedExpenseDialog';
import type { DetailedExpense, DetailedExpenseInput } from '@/types/master';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const DetailedExpenses = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<DetailedExpense | undefined>();
  
  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['detailedExpenses', search, statusFilter],
    queryFn: () => store.listDetailedExpenses({ search, status: statusFilter }),
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

  const toggleStatusMutation = useMutation({
    mutationFn: (id: string) => store.toggleDetailedExpenseStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detailedExpenses'] });
      toast.success('Detailed expense status updated');
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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Detailed Expenses</h1>
            <p className="text-muted-foreground">Manage detailed expenses</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search expenses..."
            />
          </div>
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
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
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Updated</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="border-t hover:bg-muted/50">
                      <td className="p-4 font-medium">{expense.name}</td>
                      <td className="p-4 text-muted-foreground">{expense.categoryRef.nameAtBooking}</td>
                      <td className="p-4 text-muted-foreground">
                        {expense.price.toLocaleString()} ₫
                      </td>
                      <td className="p-4">
                        <StatusBadge status={expense.status} />
                      </td>
                      <td className="p-4 text-muted-foreground text-sm">
                        {new Date(expense.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(expense)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => toggleStatusMutation.mutate(expense.id)}
                            >
                              {expense.status === 'active' ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {expenses.map((expense) => (
                <div key={expense.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium">{expense.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {expense.categoryRef.nameAtBooking} • {expense.price.toLocaleString()} ₫
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Updated {new Date(expense.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(expense)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggleStatusMutation.mutate(expense.id)}
                        >
                          {expense.status === 'active' ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <StatusBadge status={expense.status} />
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
    </Layout>
  );
};

export default DetailedExpenses;
