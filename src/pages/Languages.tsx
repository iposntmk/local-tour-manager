import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Copy, Trash2, Upload, Trash, Download } from 'lucide-react';
import { toast } from 'sonner';
import { store } from '@/lib/datastore';
import { SearchInput } from '@/components/master/SearchInput';
import { BulkImportDialog } from '@/components/master/BulkImportDialog';
import { useHeaderMode } from '@/hooks/useHeaderMode';
import { LanguageDialog } from '@/components/languages/LanguageDialog';
import type { Language, LanguageInput } from '@/types/master';
import type { SearchQuery } from '@/types/datastore';
import { useAuth } from '@/contexts/AuthContext';
import { ensureCanModifyOwnedEntity } from '@/lib/master-ownership';

const Languages = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<Language | undefined>();
  const [idFilter, setIdFilter] = useState('');
  const [codeFilter, setCodeFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const { hasPermission, user, isAdmin } = useAuth();
  const canCreate = hasPermission('create_languages');
  const canEdit = hasPermission('edit_languages');
  const canDelete = hasPermission('delete_languages');
  const canImport = hasPermission('import_languages');
  const canExport = hasPermission('export_languages');

  const query: SearchQuery = { search };

  const { data: languages = [], isLoading, error: languagesError } = useQuery({
    queryKey: ['languages', query],
    queryFn: () => store.listLanguages(query),
  });

  const createMutation = useMutation({
    mutationFn: (data: LanguageInput) => store.createLanguage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      toast.success('Language created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create language');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Language> }) => store.updateLanguage(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      queryClient.invalidateQueries({ queryKey: ['guides'] });
      toast.success('Language updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update language');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => store.duplicateLanguage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      toast.success('Language duplicated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to duplicate language');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => store.deleteLanguage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      queryClient.invalidateQueries({ queryKey: ['guides'] });
      toast.success('Language deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete language');
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => store.deleteAllLanguages(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      queryClient.invalidateQueries({ queryKey: ['guides'] });
      toast.success('All languages deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete all languages');
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: (items: LanguageInput[]) => store.bulkCreateLanguages(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      toast.success('Languages imported successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to import languages');
    },
  });

  const handleCreate = async (data: LanguageInput) => {
    if (!canCreate) {
      toast.error('Bạn không có quyền tạo ngôn ngữ');
      return;
    }
    await createMutation.mutateAsync(data);
  };

  const handleEdit = async (data: LanguageInput) => {
    if (!canEdit) {
      toast.error('Bạn không có quyền sửa ngôn ngữ');
      return;
    }
    if (!editingLanguage) return;
    await updateMutation.mutateAsync({ id: editingLanguage.id, data });
  };

  const handleOpenDialog = (language?: Language) => {
    if (language && !canEdit) return;
    if (!language && !canCreate) return;
    if (language && !ensureCanModifyOwnedEntity(language, user?.id, isAdmin)) return;
    setEditingLanguage(language);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingLanguage(undefined);
  };

  const handleDeleteAll = async () => {
    if (!canDelete) {
      toast.error('Bạn không có quyền xóa ngôn ngữ');
      return;
    }
    if (confirm('Are you sure you want to delete ALL languages? This action cannot be undone.')) {
      await deleteAllMutation.mutateAsync();
    }
  };

  const handleBulkImport = async (items: LanguageInput[]) => {
    if (!canImport) {
      toast.error('Bạn không có quyền import ngôn ngữ');
      return;
    }
    await bulkImportMutation.mutateAsync(items);
  };

  const handleExportTxt = () => {
    if (!canExport) {
      toast.error('Bạn không có quyền export ngôn ngữ');
      return;
    }
    if (filteredLanguages.length === 0) {
      toast.error('No languages to export');
      return;
    }

    const txtContent = filteredLanguages
      .map((language) => [language.code, language.name, language.nativeName || ''].join(','))
      .join('\n');

    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `languages-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredLanguages.length} languages`);
  };

  const filteredLanguages = useMemo(() => {
    return languages.filter((language) => {
      const matchesId = !idFilter || language.id.toLowerCase().includes(idFilter.toLowerCase());
      const matchesCode = !codeFilter || language.code.toLowerCase().includes(codeFilter.toLowerCase());
      const matchesName = !nameFilter || language.name.toLowerCase().includes(nameFilter.toLowerCase());
      return matchesId && matchesCode && matchesName;
    });
  }, [languages, idFilter, codeFilter, nameFilter]);

  const { classes: headerClasses } = useHeaderMode('languages.headerMode');

  return (
    <>
      <div className="space-y-6">
        <div className={headerClasses}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Languages</h1>
              <p className="text-muted-foreground">Manage guide languages</p>
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
                  Add Language
                </Button>
              )}
            </div>
          </div>
        </div>

        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <SearchInput value={search} onChange={setSearch} placeholder="Search languages..." />
            </div>
          </div>

          {languagesError ? (
            <div className="text-center py-8 text-destructive">
              {languagesError instanceof Error ? languagesError.message : 'Failed to load languages'}
            </div>
          ) : isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : languages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No languages found. Create your first language!
            </div>
          ) : (
            <>
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Native Name</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                    <TableRow>
                      <TableHead>
                        <Input placeholder="Filter by ID..." value={idFilter} onChange={(e) => setIdFilter(e.target.value)} className="h-8" />
                      </TableHead>
                      <TableHead>
                        <Input placeholder="Filter by code..." value={codeFilter} onChange={(e) => setCodeFilter(e.target.value)} className="h-8" />
                      </TableHead>
                      <TableHead>
                        <Input placeholder="Filter by name..." value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} className="h-8" />
                      </TableHead>
                      <TableHead></TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLanguages.map((language) => (
                      <TableRow
                        key={language.id}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => canEdit && handleOpenDialog(language)}
                      >
                        <TableCell className="font-mono text-muted-foreground">{language.id}</TableCell>
                        <TableCell className="font-medium uppercase">{language.code}</TableCell>
                        <TableCell>{language.name}</TableCell>
                        <TableCell>{language.nativeName || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {canEdit && (
                              <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(language)} className="h-8 w-8 p-0">
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canCreate && (
                              <Button variant="ghost" size="sm" onClick={() => duplicateMutation.mutate(language.id)} className="h-8 w-8 p-0">
                                <Copy className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (!ensureCanModifyOwnedEntity(language, user?.id, isAdmin)) return;
                                  if (confirm('Are you sure you want to delete this language?')) {
                                    deleteMutation.mutate(language.id);
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

              <div className="md:hidden space-y-4">
                {filteredLanguages.map((language) => (
                  <Card
                    key={language.id}
                    className="p-4 cursor-pointer hover:bg-accent/50"
                    onClick={() => canEdit && handleOpenDialog(language)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold uppercase">{language.code}</span>
                          <h3 className="truncate font-semibold">{language.name}</h3>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground font-mono">{language.id}</p>
                        <p className="text-sm text-muted-foreground">{language.nativeName || 'No native name'}</p>
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {canEdit && (
                          <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(language)} className="h-8 w-8 p-0">
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {canCreate && (
                          <Button variant="ghost" size="sm" onClick={() => duplicateMutation.mutate(language.id)} className="h-8 w-8 p-0">
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (!ensureCanModifyOwnedEntity(language, user?.id, isAdmin)) return;
                              if (confirm('Are you sure you want to delete this language?')) {
                                deleteMutation.mutate(language.id);
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

        <LanguageDialog
          open={dialogOpen}
          onOpenChange={handleCloseDialog}
          language={editingLanguage}
          onSubmit={editingLanguage ? handleEdit : handleCreate}
        />

        <BulkImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          onImport={handleBulkImport}
          title="Import Languages"
          description="Import multiple languages at once. Format: code,name,native name"
          placeholder="Enter languages (one per line, format: code,name,native name)
Example:
en,English,English
fr,French,Francais
vi,Vietnamese,Tieng Viet"
          parseItem={(parts: string[]) => {
            if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
              return {
                code: parts[0].trim().toLowerCase(),
                name: parts[1].trim(),
                nativeName: parts[2]?.trim() || undefined,
              };
            }
            return null;
          }}
        />
      </div>
    </>
  );
};

export default Languages;
