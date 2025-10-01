import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { store } from '@/lib/datastore';
import { SearchInput } from '@/components/master/SearchInput';
import { NationalityDialog } from '@/components/nationalities/NationalityDialog';
import { useHeaderMode } from '@/hooks/useHeaderMode';
import { HeaderModeControls } from '@/components/common/HeaderModeControls';
import type { Nationality, NationalityInput } from '@/types/master';
import type { SearchQuery } from '@/types/datastore';

const Nationalities = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNationality, setEditingNationality] = useState<Nationality | undefined>();

  const query: SearchQuery = {
    search,
  };

  const { data: nationalities = [], isLoading } = useQuery({
    queryKey: ['nationalities', query],
    queryFn: () => store.listNationalities(query),
  });

  const createMutation = useMutation({
    mutationFn: (data: NationalityInput) => store.createNationality(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nationalities'] });
      toast.success('Nationality created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create nationality');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Nationality> }) =>
      store.updateNationality(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nationalities'] });
      toast.success('Nationality updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update nationality');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => store.duplicateNationality(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nationalities'] });
      toast.success('Nationality duplicated successfully');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => store.deleteNationality(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nationalities'] });
      toast.success('Nationality deleted successfully');
    },
  });

  const handleCreate = async (data: NationalityInput) => {
    await createMutation.mutateAsync(data);
  };

  const handleEdit = async (data: NationalityInput) => {
    if (!editingNationality) return;
    await updateMutation.mutateAsync({
      id: editingNationality.id,
      data,
    });
  };

  const handleOpenDialog = (nationality?: Nationality) => {
    setEditingNationality(nationality);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingNationality(undefined);
  };

  const { mode: headerMode, setMode: setHeaderMode, classes: headerClasses } = useHeaderMode('nationalities.headerMode');

  return (
    <Layout>
      <div className="space-y-6">
        <div className={headerClasses}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-3xl font-bold">Nationalities</h1>
              <p className="text-muted-foreground">Manage client nationalities</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => handleOpenDialog()} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Nationality
              </Button>
              <HeaderModeControls mode={headerMode} onChange={setHeaderMode} />
            </div>
          </div>
        </div>

        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search nationalities..."
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : nationalities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No nationalities found. Create your first nationality!
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Country</TableHead>
                      <TableHead>ISO Code</TableHead>
                      <TableHead>Flag</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nationalities.map((nationality) => (
                      <TableRow
                        key={nationality.id}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => handleOpenDialog(nationality)}
                      >
                        <TableCell className="font-medium">{nationality.name}</TableCell>
                        <TableCell>{nationality.iso2 || '-'}</TableCell>
                        <TableCell>
                          <span className="text-2xl">{nationality.emoji || '-'}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(nationality)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => duplicateMutation.mutate(nationality.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this nationality?')) {
                                  deleteMutation.mutate(nationality.id);
                                }
                              }}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {nationalities.map((nationality) => (
                  <Card
                    key={nationality.id}
                    className="p-4 cursor-pointer hover:bg-accent/50"
                    onClick={() => handleOpenDialog(nationality)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-3xl">{nationality.emoji || '🌍'}</span>
                        <div>
                          <h3 className="font-semibold">{nationality.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {nationality.iso2 || 'No ISO code'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(nationality)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => duplicateMutation.mutate(nationality.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this nationality?')) {
                              deleteMutation.mutate(nationality.id);
                            }
                          }}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </Card>

        <NationalityDialog
          open={dialogOpen}
          onOpenChange={handleCloseDialog}
          nationality={editingNationality}
          onSubmit={editingNationality ? handleEdit : handleCreate}
        />
      </div>
    </Layout>
  );
};

export default Nationalities;
