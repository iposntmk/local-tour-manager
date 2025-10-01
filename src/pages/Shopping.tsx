import { Layout } from '@/components/Layout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Copy, Trash2 } from 'lucide-react';
import { SearchInput } from '@/components/master/SearchInput';
import { ShoppingDialog } from '@/components/shopping/ShoppingDialog';
import type { Shopping, ShoppingInput } from '@/types/master';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { useHeaderMode } from '@/hooks/useHeaderMode';
import { HeaderModeControls } from '@/components/common/HeaderModeControls';

const ShoppingPage = () => {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShopping, setEditingShopping] = useState<Shopping | undefined>();
  
  const queryClient = useQueryClient();

  const { data: shoppings = [], isLoading } = useQuery({
    queryKey: ['shoppings', search],
    queryFn: () => store.listShoppings({ search }),
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

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => store.duplicateShopping(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shoppings'] });
      toast.success('Shopping duplicated successfully');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => store.deleteShopping(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shoppings'] });
      toast.success('Shopping deleted successfully');
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

  const { mode: headerMode, setMode: setHeaderMode, classes: headerClasses } = useHeaderMode('shopping.headerMode');

  return (
    <Layout>
      <div className="space-y-6">
        <div className={headerClasses}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Shopping</h1>
              <p className="text-muted-foreground">Manage shopping locations</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Shopping
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
              placeholder="Search shopping..."
            />
          </div>
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
                    <th className="text-left p-4 font-medium">Updated</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shoppings.map((shopping) => (
                    <tr
                      key={shopping.id}
                      className="border-t hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleOpenDialog(shopping)}
                    >
                      <td className="p-4 font-medium">{shopping.name}</td>
                      <td className="p-4 text-muted-foreground text-sm">
                        {formatDate(shopping.updatedAt.split("T")[0])}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(shopping)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => duplicateMutation.mutate(shopping.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this shopping location?')) {
                                deleteMutation.mutate(shopping.id);
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
              {shoppings.map((shopping) => (
                <div
                  key={shopping.id}
                  className="rounded-lg border p-4 space-y-3 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleOpenDialog(shopping)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium">{shopping.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Updated {formatDate(shopping.updatedAt.split("T")[0])}
                      </p>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(shopping)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => duplicateMutation.mutate(shopping.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this shopping location?')) {
                            deleteMutation.mutate(shopping.id);
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
