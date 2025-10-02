import { Layout } from '@/components/Layout';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Copy, Trash2, Upload, Trash } from 'lucide-react';
import { SearchInput } from '@/components/master/SearchInput';
import { ProvinceDialog } from '@/components/provinces/ProvinceDialog';
import { BulkImportDialog } from '@/components/master/BulkImportDialog';
import type { Province, ProvinceInput } from '@/types/master';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { useHeaderMode } from '@/hooks/useHeaderMode';

const Provinces = () => {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProvince, setEditingProvince] = useState<Province | undefined>();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [nameFilter, setNameFilter] = useState('');

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

  const deleteAllMutation = useMutation({
    mutationFn: () => store.deleteAllProvinces(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provinces'] });
      toast.success('All provinces deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: (items: ProvinceInput[]) => store.bulkCreateProvinces(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provinces'] });
      toast.success('Provinces imported successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
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

  const handleDeleteAll = () => {
    if (confirm('Are you sure you want to delete ALL provinces? This action cannot be undone.')) {
      deleteAllMutation.mutate();
    }
  };

  const handleBulkImport = async (items: ProvinceInput[]) => {
    await bulkImportMutation.mutateAsync(items);
  };

  const filteredProvinces = useMemo(() => {
    if (!nameFilter) return provinces;
    return provinces.filter((province) =>
      province.name.toLowerCase().includes(nameFilter.toLowerCase())
    );
  }, [provinces, nameFilter]);

  const { classes: headerClasses } = useHeaderMode('provinces.headerMode');

  return (
    <Layout>
      <div className="space-y-6">
        <div className={headerClasses}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Provinces</h1>
              <p className="text-muted-foreground">Manage provinces and cities</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setImportDialogOpen(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button
                variant="outline"
                onClick={handleDeleteAll}
              >
                <Trash className="h-4 w-4 mr-2" />
                Delete All
              </Button>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Province
              </Button>
            </div>
          </div>
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
                  <tr className="border-t">
                    <th className="p-2">
                      <Input
                        placeholder="Filter by name..."
                        value={nameFilter}
                        onChange={(e) => setNameFilter(e.target.value)}
                        className="h-8"
                      />
                    </th>
                    <th className="p-2"></th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProvinces.map((province) => (
                    <tr
                      key={province.id}
                      className="border-t hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleOpenDialog(province)}
                    >
                      <td className="p-4 font-medium">{province.name}</td>
                      <td className="p-4 text-muted-foreground text-sm">
                        {formatDate(province.updatedAt.split("T")[0])}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(province)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => duplicateMutation.mutate(province.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this province?')) {
                                deleteMutation.mutate(province.id);
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
              {filteredProvinces.map((province) => (
                <div
                  key={province.id}
                  className="rounded-lg border p-4 space-y-3 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleOpenDialog(province)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium">{province.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Updated {formatDate(province.updatedAt.split("T")[0])}
                      </p>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(province)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => duplicateMutation.mutate(province.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this province?')) {
                            deleteMutation.mutate(province.id);
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

      <ProvinceDialog
        open={dialogOpen}
        onOpenChange={handleCloseDialog}
        onSubmit={editingProvince ? handleEdit : handleCreate}
        initialData={editingProvince}
        isEditing={!!editingProvince}
      />

      <BulkImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleBulkImport}
        title="Import Provinces"
        description="Import multiple provinces at once. Enter one province name per line or use comma format."
        placeholder="Enter province names (one per line)&#10;Example:&#10;Ha Noi&#10;Ho Chi Minh&#10;Da Nang&#10;&#10;Or comma format:&#10;Ha Noi,Ho Chi Minh,Da Nang"
        parseItem={(parts) => {
          // Support both single name format and comma-separated format
          const name = parts[0];
          if (name) {
            return { name };
          }
          return null;
        }}
      />
    </Layout>
  );
};

export default Provinces;
