import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Copy, Trash2, Upload, Trash, Download } from 'lucide-react';
import { toast } from 'sonner';
import { store } from '@/lib/datastore';
import { SearchInput } from '@/components/master/SearchInput';
import { NationalityDialog } from '@/components/nationalities/NationalityDialog';
import { BulkImportDialog } from '@/components/master/BulkImportDialog';
import { useHeaderMode } from '@/hooks/useHeaderMode';
import type { Nationality, NationalityInput } from '@/types/master';
import type { SearchQuery } from '@/types/datastore';
import { useAuth } from '@/contexts/AuthContext';
import { ensureCanModifyOwnedEntity } from '@/lib/master-ownership';

const Nationalities = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingNationality, setEditingNationality] = useState<Nationality | undefined>();
  const [nameFilter, setNameFilter] = useState('');
  const [iso2Filter, setIso2Filter] = useState('');
  const [idFilter, setIdFilter] = useState('');
  const { hasPermission, user, isAdmin } = useAuth();
  const canCreate = hasPermission('create_nationalities');
  const canEdit = hasPermission('edit_nationalities');
  const canDelete = hasPermission('delete_nationalities');
  const canImport = hasPermission('import_nationalities');
  const canExport = hasPermission('export_nationalities');

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

  const deleteAllMutation = useMutation({
    mutationFn: () => store.deleteAllNationalities(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nationalities'] });
      toast.success('All nationalities deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete all nationalities');
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: (items: { name: string; iso2?: string; emoji?: string }[]) =>
      store.bulkCreateNationalities(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nationalities'] });
      toast.success('Nationalities imported successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to import nationalities');
    },
  });

  const handleCreate = async (data: NationalityInput) => {
    if (!canCreate) {
      toast.error('Bạn không có quyền tạo quốc tịch');
      return;
    }
    await createMutation.mutateAsync(data);
  };

  const handleEdit = async (data: NationalityInput) => {
    if (!canEdit) {
      toast.error('Bạn không có quyền sửa quốc tịch');
      return;
    }
    if (!editingNationality) return;
    await updateMutation.mutateAsync({
      id: editingNationality.id,
      data,
    });
  };

  const handleOpenDialog = (nationality?: Nationality) => {
    if (nationality && !canEdit) return;
    if (!nationality && !canCreate) return;
    if (nationality && !ensureCanModifyOwnedEntity(nationality, user?.id, isAdmin)) return;
    setEditingNationality(nationality);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingNationality(undefined);
  };

  const handleDeleteAll = async () => {
    if (!canDelete) {
      toast.error('Bạn không có quyền xóa quốc tịch');
      return;
    }
    if (confirm('Are you sure you want to delete ALL nationalities? This action cannot be undone.')) {
      await deleteAllMutation.mutateAsync();
    }
  };

  const handleBulkImport = async (items: { name: string; iso2?: string; emoji?: string }[]) => {
    if (!canImport) {
      toast.error('Bạn không có quyền import quốc tịch');
      return;
    }
    await bulkImportMutation.mutateAsync(items);
  };

  const handleExportTxt = () => {
    if (!canExport) {
      toast.error('Bạn không có quyền export quốc tịch');
      return;
    }
    if (filteredNationalities.length === 0) {
      toast.error('No nationalities to export');
      return;
    }

    const txtContent = filteredNationalities
      .map(nat => {
        const parts = [nat.name];
        if (nat.iso2) parts.push(nat.iso2);
        if (nat.emoji) parts.push(nat.emoji);
        return parts.join(',');
      })
      .join('\n');

    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nationalities-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredNationalities.length} nationalities`);
  };

  const filteredNationalities = useMemo(() => {
    return nationalities.filter((nationality) => {
      const matchesId = !idFilter || nationality.id.toLowerCase().includes(idFilter.toLowerCase());
      const matchesName = nameFilter === '' ||
        nationality.name.toLowerCase().includes(nameFilter.toLowerCase());
      const matchesIso2 = iso2Filter === '' ||
        (nationality.iso2?.toLowerCase() || '').includes(iso2Filter.toLowerCase());
      return matchesId && matchesName && matchesIso2;
    });
  }, [nationalities, nameFilter, iso2Filter, idFilter]);

  const { classes: headerClasses } = useHeaderMode('nationalities.headerMode');

  return (
    <>
      <div className="space-y-6">
        <div className={headerClasses}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Nationalities</h1>
              <p className="text-muted-foreground">Manage client nationalities</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {canExport && (
                <Button onClick={handleExportTxt} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export TXT
                </Button>
              )}
              {canImport && (
                <Button onClick={() => setImportDialogOpen(true)} variant="outline" className="gap-2">
                  <Upload className="h-4 w-4" />
                  Import
                </Button>
              )}
              {canDelete && (
                <Button onClick={handleDeleteAll} variant="outline" className="gap-2 text-destructive hover:text-destructive">
                  <Trash className="h-4 w-4" />
                  Delete All
                </Button>
              )}
              {canCreate && (
                <Button onClick={() => handleOpenDialog()} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Nationality
                </Button>
              )}
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
                      <TableHead>ID</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>ISO Code</TableHead>
                      <TableHead>Flag</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                    <TableRow>
                      <TableHead>
                        <Input
                          placeholder="Filter by ID..."
                          value={idFilter}
                          onChange={(e) => setIdFilter(e.target.value)}
                          className="h-8"
                        />
                      </TableHead>
                      <TableHead>
                        <Input
                          placeholder="Filter by name..."
                          value={nameFilter}
                          onChange={(e) => setNameFilter(e.target.value)}
                          className="h-8"
                        />
                      </TableHead>
                      <TableHead>
                        <Input
                          placeholder="Filter by ISO2..."
                          value={iso2Filter}
                          onChange={(e) => setIso2Filter(e.target.value)}
                          className="h-8"
                        />
                      </TableHead>
                      <TableHead></TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNationalities.map((nationality) => (
                      <TableRow
                        key={nationality.id}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => canEdit && handleOpenDialog(nationality)}
                      >
                        <TableCell className="font-mono text-muted-foreground">{nationality.id}</TableCell>
                        <TableCell className="font-medium">{nationality.name}</TableCell>
                        <TableCell>{nationality.iso2 || '-'}</TableCell>
                        <TableCell>
                          <span className="text-2xl">{nationality.emoji || '-'}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {canEdit && (
                              <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(nationality)} className="h-8 w-8 p-0">
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canCreate && (
                              <Button variant="ghost" size="sm" onClick={() => duplicateMutation.mutate(nationality.id)} className="h-8 w-8 p-0">
                                <Copy className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (!ensureCanModifyOwnedEntity(nationality, user?.id, isAdmin)) return;
                                  if (confirm('Are you sure you want to delete this nationality?')) {
                                    deleteMutation.mutate(nationality.id);
                                  }
                                }}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {filteredNationalities.map((nationality) => (
                  <Card
                    key={nationality.id}
                    className="p-4 cursor-pointer hover:bg-accent/50"
                    onClick={() => canEdit && handleOpenDialog(nationality)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-3xl">{nationality.emoji || '🌍'}</span>
                        <div>
                          <h3 className="font-semibold">{nationality.name}</h3>
                          <p className="text-xs text-muted-foreground font-mono">
                            {nationality.id}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {nationality.iso2 || 'No ISO code'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {canEdit && (
                          <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(nationality)} className="h-8 w-8 p-0">
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {canCreate && (
                          <Button variant="ghost" size="sm" onClick={() => duplicateMutation.mutate(nationality.id)} className="h-8 w-8 p-0">
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (!ensureCanModifyOwnedEntity(nationality, user?.id, isAdmin)) return;
                              if (confirm('Are you sure you want to delete this nationality?')) {
                                deleteMutation.mutate(nationality.id);
                              }
                            }}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
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

        <BulkImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          onImport={handleBulkImport}
          title="Import Nationalities"
          description="Upload or paste nationality data in CSV format"
          placeholder="Enter nationalities (one per line, format: Country Name[,ISO2,Emoji])
Example:
United States
United Kingdom,GB,🇬🇧
France,FR,🇫🇷
Germany,DE"
          parseItem={(parts: string[]) => {
            if (parts.length >= 1 && parts[0].trim()) {
              return {
                name: parts[0].trim(),
                iso2: parts[1]?.trim() || undefined,
                emoji: parts[2]?.trim() || undefined
              };
            }
            return null;
          }}
        />
      </div>
    </>
  );
};

export default Nationalities;
