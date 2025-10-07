import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Copy, Trash2, Upload, Trash, Download } from 'lucide-react';
import { toast } from 'sonner';
import { store } from '@/lib/datastore';
import { SearchInput } from '@/components/master/SearchInput';
import { useHeaderMode } from '@/hooks/useHeaderMode';
import { BulkImportDialog } from '@/components/master/BulkImportDialog';

import { GuideDialog } from '@/components/guides/GuideDialog';
import type { Guide, GuideInput } from '@/types/master';
import type { SearchQuery } from '@/types/datastore';

const Guides = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<Guide | undefined>();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [nameFilter, setNameFilter] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');

  const query: SearchQuery = {
    search,
  };

  const { data: guides = [], isLoading } = useQuery({
    queryKey: ['guides', query],
    queryFn: () => store.listGuides(query),
  });

  const createMutation = useMutation({
    mutationFn: (data: GuideInput) => store.createGuide(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guides'] });
      toast.success('Guide created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create guide');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Guide> }) =>
      store.updateGuide(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guides'] });
      toast.success('Guide updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update guide');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => store.duplicateGuide(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guides'] });
      toast.success('Guide duplicated successfully');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => store.deleteGuide(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guides'] });
      toast.success('Guide deleted successfully');
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => store.deleteAllGuides(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guides'] });
      toast.success('All guides deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete all guides');
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: (inputs: GuideInput[]) => store.bulkCreateGuides(inputs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guides'] });
      toast.success('Guides imported successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to import guides');
    },
  });

  const handleCreate = async (data: GuideInput) => {
    await createMutation.mutateAsync(data);
  };

  const handleEdit = async (data: GuideInput) => {
    if (!editingGuide) return;
    await updateMutation.mutateAsync({
      id: editingGuide.id,
      data,
    });
  };

  const handleOpenDialog = (guide?: Guide) => {
    setEditingGuide(guide);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingGuide(undefined);
  };

  const handleDeleteAll = async () => {
    if (confirm('Are you sure you want to delete all guides? This action cannot be undone.')) {
      await deleteAllMutation.mutateAsync();
    }
  };

  const handleBulkImport = async (items: GuideInput[]) => {
    await bulkImportMutation.mutateAsync(items);
  };

  const handleExportTxt = () => {
    if (filteredGuides.length === 0) {
      toast.error('No guides to export');
      return;
    }

    const txtContent = filteredGuides
      .map(guide => {
        const parts = [guide.name];
        if (guide.phone) parts.push(guide.phone);
        if (guide.note) parts.push(guide.note);
        return parts.join(',');
      })
      .join('\n');

    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guides-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredGuides.length} guides`);
  };

  const filteredGuides = useMemo(() => {
    return guides.filter(guide => {
      const matchesName = !nameFilter || guide.name.toLowerCase().includes(nameFilter.toLowerCase());
      const matchesPhone = !phoneFilter || (guide.phone && guide.phone.toLowerCase().includes(phoneFilter.toLowerCase()));
      return matchesName && matchesPhone;
    });
  }, [guides, nameFilter, phoneFilter]);

  const { classes: headerClasses } = useHeaderMode('guides.headerMode');

  return (
    <Layout>
      <div className="space-y-6">
        <div className={headerClasses}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Guides</h1>
              <p className="text-muted-foreground">Manage your tour guides</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Button
                onClick={handleExportTxt}
                variant="outline"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export TXT
              </Button>
              <Button
                onClick={() => setImportDialogOpen(true)}
                variant="outline"
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Import
              </Button>
              <Button
                onClick={handleDeleteAll}
                variant="outline"
                className="gap-2 text-destructive hover:text-destructive"
              >
                <Trash className="h-4 w-4" />
                Delete All
              </Button>
              <Button onClick={() => handleOpenDialog()} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Guide
              </Button>
            </div>
          </div>
        </div>

        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search guides..."
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : guides.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No guides found. Create your first guide!
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                    <TableRow>
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
                          placeholder="Filter by phone..."
                          value={phoneFilter}
                          onChange={(e) => setPhoneFilter(e.target.value)}
                          className="h-8"
                        />
                      </TableHead>
                      <TableHead></TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGuides.map((guide) => (
                      <TableRow
                        key={guide.id}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => handleOpenDialog(guide)}
                      >
                        <TableCell className="font-medium">{guide.name}</TableCell>
                        <TableCell>{guide.phone || '-'}</TableCell>
                        <TableCell className="max-w-xs truncate">{guide.note || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(guide)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => duplicateMutation.mutate(guide.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this guide?')) {
                                  deleteMutation.mutate(guide.id);
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
                {filteredGuides.map((guide) => (
                  <Card
                    key={guide.id}
                    className="p-4 cursor-pointer hover:bg-accent/50"
                    onClick={() => handleOpenDialog(guide)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold">{guide.name}</h3>
                        <p className="text-sm text-muted-foreground">{guide.phone || 'No phone'}</p>
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(guide)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => duplicateMutation.mutate(guide.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this guide?')) {
                              deleteMutation.mutate(guide.id);
                            }
                          }}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {guide.note && (
                        <p className="text-sm text-muted-foreground">{guide.note}</p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </Card>

        <GuideDialog
          open={dialogOpen}
          onOpenChange={handleCloseDialog}
          guide={editingGuide}
          onSubmit={editingGuide ? handleEdit : handleCreate}
        />

        <BulkImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          onImport={handleBulkImport}
          title="Import Guides"
          description="Import multiple guides at once. Format: Guide Name[,Phone,Note] (phone and note are optional)"
          placeholder="Enter guides (one per line, format: Guide Name[,Phone,Note])\nExample:\nJohn Smith\nJane Doe,0987654321,Speaks English and French\nBob Wilson,0111222333"
          parseItem={(parts: string[]) => {
            if (parts.length >= 1 && parts[0].trim()) {
              return {
                name: parts[0].trim(),
                phone: parts[1]?.trim() || undefined,
                note: parts[2]?.trim() || undefined,
              };
            }
            return null;
          }}
        />
      </div>
    </Layout>
  );
};

export default Guides;
