import { Layout } from '@/components/Layout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Plus, MoreVertical, Edit, Copy, Trash2 } from 'lucide-react';
import { SearchInput } from '@/components/master/SearchInput';
import { ProvinceDialog } from '@/components/provinces/ProvinceDialog';
import type { Province, ProvinceInput } from '@/types/master';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Provinces = () => {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProvince, setEditingProvince] = useState<Province | undefined>();
  
  const queryClient = useQueryClient();

  const { data: provinces = [], isLoading } = useQuery({
    queryKey: ['provinces', search],
    queryFn: () => store.listProvinces({ search }),
  });

  const createMutation = useMutation({
    mutationFn: (input: ProvinceInput) => store.createProvince(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provinces'] });
      toast.success('Province created successfully');
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
      toast.success('Province updated successfully');
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
      toast.success('Province duplicated successfully');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => store.deleteProvince(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provinces'] });
      toast.success('Province deleted successfully');
    },
  });

  const handleCreate = (input: ProvinceInput) => {
    createMutation.mutate(input);
  };

  const handleEdit = (input: ProvinceInput) => {
    if (editingProvince) {
      updateMutation.mutate({
        id: editingProvince.id,
        patch: { name: input.name },
      });
    }
  };

  const handleOpenDialog = (province?: Province) => {
    setEditingProvince(province);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingProvince(undefined);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Provinces</h1>
            <p className="text-muted-foreground">Manage provinces and cities</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Province
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search provinces..."
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : provinces.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No provinces found. Create your first province to get started.
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
                  {provinces.map((province) => (
                    <tr key={province.id} className="border-t hover:bg-muted/50">
                      <td className="p-4 font-medium">{province.name}</td>
                      <td className="p-4 text-muted-foreground text-sm">
                        {formatDate(province.updatedAt.split("T")[0])}
                      </td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(province)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicateMutation.mutate(province.id)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => deleteMutation.mutate(province.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
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
              {provinces.map((province) => (
                <div key={province.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium">{province.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Updated {formatDate(province.updatedAt.split("T")[0])}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(province)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateMutation.mutate(province.id)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteMutation.mutate(province.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
    </Layout>
  );
};

export default Provinces;