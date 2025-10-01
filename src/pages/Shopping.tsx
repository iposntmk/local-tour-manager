import { Layout } from '@/components/Layout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Plus, MoreVertical } from 'lucide-react';
import { SearchInput } from '@/components/master/SearchInput';
import { StatusBadge } from '@/components/master/StatusBadge';
import { ShoppingDialog } from '@/components/shopping/ShoppingDialog';
import type { Shopping, ShoppingInput } from '@/types/master';
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

const ShoppingPage = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShopping, setEditingShopping] = useState<Shopping | undefined>();
  
  const queryClient = useQueryClient();

  const { data: shoppings = [], isLoading } = useQuery({
    queryKey: ['shoppings', search, statusFilter],
    queryFn: () => store.listShoppings({ search, status: statusFilter }),
  });

  const createMutation = useMutation({
    mutationFn: (input: ShoppingInput) => store.createShopping(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shoppings'] });
      toast.success('Shopping created successfully');
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
      toast.success('Shopping updated successfully');
      setDialogOpen(false);
      setEditingShopping(undefined);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id: string) => store.toggleShoppingStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shoppings'] });
      toast.success('Shopping status updated');
    },
  });

  const handleCreate = (input: ShoppingInput) => {
    createMutation.mutate(input);
  };

  const handleEdit = (input: ShoppingInput) => {
    if (editingShopping) {
      updateMutation.mutate({
        id: editingShopping.id,
        patch: { name: input.name },
      });
    }
  };

  const handleOpenDialog = (shopping?: Shopping) => {
    setEditingShopping(shopping);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingShopping(undefined);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Shopping</h1>
            <p className="text-muted-foreground">Manage shopping locations</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Shopping
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search shopping..."
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
        ) : shoppings.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No shopping locations found. Create your first shopping location to get started.
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block rounded-lg border">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Name</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Updated</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shoppings.map((shopping) => (
                    <tr key={shopping.id} className="border-t hover:bg-muted/50">
                      <td className="p-4 font-medium">{shopping.name}</td>
                      <td className="p-4">
                        <StatusBadge status={shopping.status} />
                      </td>
                      <td className="p-4 text-muted-foreground text-sm">
                        {new Date(shopping.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(shopping)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => toggleStatusMutation.mutate(shopping.id)}
                            >
                              {shopping.status === 'active' ? 'Deactivate' : 'Activate'}
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
              {shoppings.map((shopping) => (
                <div key={shopping.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium">{shopping.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Updated {new Date(shopping.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(shopping)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggleStatusMutation.mutate(shopping.id)}
                        >
                          {shopping.status === 'active' ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <StatusBadge status={shopping.status} />
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
    </Layout>
  );
};

export default ShoppingPage;
