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
      toast.success('Tạo ngôn ngữ thành công');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Tạo ngôn ngữ thất bại');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Language> }) => store.updateLanguage(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      queryClient.invalidateQueries({ queryKey: ['guide-users'] });
      toast.success('Cập nhật ngôn ngữ thành công');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Cập nhật ngôn ngữ thất bại');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => store.duplicateLanguage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      toast.success('Nhân bản ngôn ngữ thành công');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Nhân bản ngôn ngữ thất bại');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => store.deleteLanguage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      queryClient.invalidateQueries({ queryKey: ['guide-users'] });
      toast.success('Xóa ngôn ngữ thành công');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Xóa ngôn ngữ thất bại');
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => store.deleteAllLanguages(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      queryClient.invalidateQueries({ queryKey: ['guide-users'] });
      toast.success('Đã xóa tất cả ngôn ngữ');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Xóa tất cả ngôn ngữ thất bại');
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: (items: LanguageInput[]) => store.bulkCreateLanguages(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      toast.success('Import ngôn ngữ thành công');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Import ngôn ngữ thất bại');
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
    if (confirm('Bạn có chắc chắn muốn xóa TẤT CẢ ngôn ngữ? Hành động này không thể hoàn tác.')) {
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
      toast.error('Không có ngôn ngữ nào để xuất');
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
    toast.success(`Đã xuất ${filteredLanguages.length} ngôn ngữ`);
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
              <h1 className="text-3xl font-bold">Ngôn ngữ</h1>
              <p className="text-muted-foreground">Quản lý ngôn ngữ HDV</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {canExport && (
                <Button onClick={handleExportTxt} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Xuất TXT
                </Button>
              )}
              {canImport && (
                <Button onClick={() => setImportDialogOpen(true)} variant="outline" className="gap-2">
                  <Upload className="h-4 w-4" />
                  Nhập
                </Button>
              )}
              {canDelete && (
                <Button onClick={handleDeleteAll} variant="outline" className="gap-2 text-destructive hover:text-destructive">
                  <Trash className="h-4 w-4" />
                  Xóa tất cả
                </Button>
              )}
              {canCreate && (
                <Button onClick={() => handleOpenDialog()} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Thêm ngôn ngữ
                </Button>
              )}
            </div>
          </div>
        </div>

        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <SearchInput value={search} onChange={setSearch} placeholder="Tìm ngôn ngữ..." />
            </div>
          </div>

          {languagesError ? (
            <div className="text-center py-8 text-destructive">
              {languagesError instanceof Error ? languagesError.message : 'Tải danh sách ngôn ngữ thất bại'}
            </div>
          ) : isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
          ) : languages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Không tìm thấy ngôn ngữ nào. Hãy tạo ngôn ngữ đầu tiên!
            </div>
          ) : (
            <>
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Mã</TableHead>
                      <TableHead>Tên</TableHead>
                      <TableHead>Tên bản địa</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                    <TableRow>
                      <TableHead>
                        <Input placeholder="Lọc theo ID..." value={idFilter} onChange={(e) => setIdFilter(e.target.value)} className="h-8" />
                      </TableHead>
                      <TableHead>
                        <Input placeholder="Lọc theo mã..." value={codeFilter} onChange={(e) => setCodeFilter(e.target.value)} className="h-8" />
                      </TableHead>
                      <TableHead>
                        <Input placeholder="Lọc theo tên..." value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} className="h-8" />
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
                                  if (confirm('Bạn có chắc chắn muốn xóa ngôn ngữ này?')) {
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
                        <p className="text-sm text-muted-foreground">{language.nativeName || 'Không có tên bản địa'}</p>
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
                              if (confirm('Bạn có chắc chắn muốn xóa ngôn ngữ này?')) {
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
          title="Import ngôn ngữ"
          description="Import nhiều ngôn ngữ cùng lúc. Định dạng: mã,tên,tên bản địa"
          placeholder="Nhập ngôn ngữ (mỗi dòng một ngôn ngữ, định dạng: mã,tên,tên bản địa)
Ví dụ:
vi,Tiếng Việt,Tiếng Việt
en,Tiếng Anh,English
fr,Tiếng Pháp,Français"
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
