import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Copy, Trash2, Upload, Trash, Download } from 'lucide-react';
import { ShareToggleButton, SharedBadge } from '@/components/master/ShareToggleButton';
import { TooltipProvider } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { store } from '@/lib/datastore';
import { SearchInput } from '@/components/master/SearchInput';
import { useHeaderMode } from '@/hooks/useHeaderMode';
import MasterMobileCard from '@/components/master/MasterMobileCard';
import { BulkImportDialog } from '@/components/master/BulkImportDialog';

import { GuideDialog } from '@/components/guides/GuideDialog';
import type { Guide, GuideInput } from '@/types/master';
import type { SearchQuery } from '@/types/datastore';
import { useAuth } from '@/contexts/AuthContext';
import { ensureCanModifyOwnedEntity } from '@/lib/master-ownership';
import type { UserProfile } from '@/types/user';

const Guides = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<Guide | undefined>();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [nameFilter, setNameFilter] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');
  const [idFilter, setIdFilter] = useState('');
  const { hasPermission, user, isAdmin } = useAuth();
  const canCreate = hasPermission('create_guides');
  const canEdit = hasPermission('edit_guides');
  const canDelete = hasPermission('delete_guides');
  const canImport = hasPermission('import_guides');
  const canExport = hasPermission('export_guides');

  const { data: userProfiles = [] } = useQuery<UserProfile[]>({
    queryKey: ['userProfiles'],
    queryFn: () => store.listUserProfiles(),
    enabled: isAdmin,
  });
  const profileMap = useMemo(() => {
    const m = new Map<string, UserProfile>();
    userProfiles.forEach(p => m.set(p.id, p));
    return m;
  }, [userProfiles]);

  const query: SearchQuery = {
    search,
  };

  const { data: guides = [], isLoading, error: guidesError } = useQuery({
    queryKey: ['guides', query],
    queryFn: () => store.listGuides(query),
    retry: false,
  });

  const { data: languages = [] } = useQuery({
    queryKey: ['languages'],
    queryFn: () => store.listLanguages({ status: 'active' }),
  });

  const createMutation = useMutation({
    mutationFn: (data: GuideInput) => store.createGuide(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guides'] });
      toast.success('Tạo HDV thành công');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Tạo HDV thất bại');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<GuideInput> }) =>
      store.updateGuide(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guides'] });
      toast.success('Cập nhật HDV thành công');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Cập nhật HDV thất bại');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => store.duplicateGuide(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guides'] });
      toast.success('Nhân bản HDV thành công');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => store.deleteGuide(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guides'] });
      toast.success('Xóa HDV thành công');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Xóa HDV thất bại');
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => store.deleteAllGuides(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guides'] });
      toast.success('Đã xóa tất cả HDV');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Xóa tất cả HDV thất bại');
    },
  });

  const shareMutation = useMutation({
    mutationFn: ({ id, shared }: { id: string; shared: boolean }) =>
      store.setMasterDataShared('guides', id, shared),
    onSuccess: (_, { shared }) => {
      queryClient.invalidateQueries({ queryKey: ['guides'] });
      toast.success(shared ? 'Đã chia sẻ HDV' : 'Đã đặt HDV về riêng tư');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Thao tác chia sẻ thất bại');
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: (inputs: GuideInput[]) => store.bulkCreateGuides(inputs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guides'] });
      toast.success('Import HDV thành công');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Import HDV thất bại');
    },
  });

  const handleCreate = async (data: GuideInput) => {
    if (!canCreate) {
      toast.error('Bạn không có quyền tạo hướng dẫn viên');
      return;
    }
    await createMutation.mutateAsync(data);
  };

  const handleEdit = async (data: GuideInput) => {
    if (!canEdit) {
      toast.error('Bạn không có quyền sửa hướng dẫn viên');
      return;
    }
    if (!editingGuide) return;
    await updateMutation.mutateAsync({
      id: editingGuide.id,
      data,
    });
  };

  const handleOpenDialog = (guide?: Guide) => {
    if (guide && !canEdit) return;
    if (!guide && !canCreate) return;
    if (guide && !ensureCanModifyOwnedEntity(guide, user?.id, isAdmin)) return;
    setEditingGuide(guide);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingGuide(undefined);
  };

  const handleDeleteAll = async () => {
    if (!canDelete) {
      toast.error('Bạn không có quyền xóa hướng dẫn viên');
      return;
    }
    if (confirm('Bạn có chắc chắn muốn xóa tất cả HDV? Hành động này không thể hoàn tác.')) {
      await deleteAllMutation.mutateAsync();
    }
  };

  const handleBulkImport = async (items: GuideInput[]) => {
    if (!canImport) {
      toast.error('Bạn không có quyền import hướng dẫn viên');
      return;
    }
    await bulkImportMutation.mutateAsync(items);
  };

  const handleExportTxt = () => {
    if (!canExport) {
      toast.error('Bạn không có quyền export hướng dẫn viên');
      return;
    }
    if (filteredGuides.length === 0) {
      toast.error('Không có HDV nào để xuất');
      return;
    }

    const txtContent = filteredGuides
      .map(guide => {
        const parts = [guide.name];
        if (guide.phone) parts.push(guide.phone);
        if (guide.languages.length > 0) parts.push(guide.languages.map((language) => language.name).join('|'));
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
    toast.success(`Đã xuất ${filteredGuides.length} HDV`);
  };

  const filteredGuides = useMemo(() => {
    return guides.filter(guide => {
      const matchesId = !idFilter || guide.id.toLowerCase().includes(idFilter.toLowerCase());
      const matchesName = !nameFilter || guide.name.toLowerCase().includes(nameFilter.toLowerCase());
      const matchesPhone = !phoneFilter || (guide.phone && guide.phone.toLowerCase().includes(phoneFilter.toLowerCase()));
      return matchesId && matchesName && matchesPhone;
    });
  }, [guides, nameFilter, phoneFilter, idFilter]);

  const handleSetDefaultGuide = async (guide: Guide, checked: boolean) => {
    if (!canEdit) {
      toast.error('Bạn không có quyền sửa hướng dẫn viên');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: guide.id,
        data: { isDefault: checked },
      });
    } catch {
      // Error toast handled by mutation
    }
  };

  const { classes: headerClasses } = useHeaderMode('guides.headerMode');

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className={headerClasses}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Hướng dẫn viên</h1>
              <p className="text-muted-foreground">Quản lý hướng dẫn viên</p>
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
                  Thêm HDV
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
                placeholder="Tìm HDV..."
              />
            </div>
          </div>

          {guidesError ? (
            <div className="text-center py-8 text-destructive">
              {guidesError instanceof Error ? guidesError.message : 'Tải danh sách HDV thất bại'}
            </div>
          ) : isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
          ) : guides.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Không tìm thấy HDV nào. Hãy tạo HDV đầu tiên!
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Tên</TableHead>
                      <TableHead>Điện thoại</TableHead>
                      <TableHead>Ngôn ngữ</TableHead>
                      <TableHead>Mặc định</TableHead>
                      <TableHead>Ghi chú</TableHead>
                      {isAdmin && <TableHead>Người tạo</TableHead>}
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                    <TableRow>
                      <TableHead>
                        <Input
                          placeholder="Lọc theo ID..."
                          value={idFilter}
                          onChange={(e) => setIdFilter(e.target.value)}
                          className="h-8"
                        />
                      </TableHead>
                      <TableHead>
                        <Input
                          placeholder="Lọc theo tên..."
                          value={nameFilter}
                          onChange={(e) => setNameFilter(e.target.value)}
                          className="h-8"
                        />
                      </TableHead>
                      <TableHead>
                        <Input
                          placeholder="Lọc theo điện thoại..."
                          value={phoneFilter}
                          onChange={(e) => setPhoneFilter(e.target.value)}
                          className="h-8"
                        />
                      </TableHead>
                      <TableHead></TableHead>
                      <TableHead></TableHead>
                      <TableHead></TableHead>
                      {isAdmin && <TableHead></TableHead>}
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGuides.map((guide) => (
                      <TableRow
                        key={guide.id}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => canEdit && handleOpenDialog(guide)}
                      >
                        <TableCell className="font-mono text-muted-foreground">{guide.id}</TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {guide.name}
                            <SharedBadge isShared={!!guide.isShared} />
                          </div>
                        </TableCell>
                        <TableCell>{guide.phone || '-'}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {guide.languages.length > 0 ? guide.languages.map((language) => language.name).join(', ') : '-'}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={guide.isDefault}
                            onCheckedChange={(checked) => handleSetDefaultGuide(guide, checked === true)}
                            disabled={!canEdit}
                            aria-label={`${guide.name} là HDV mặc định`}
                          />
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{guide.note || '-'}</TableCell>
                        {isAdmin && (
                          <TableCell className="text-sm text-muted-foreground">
                            {guide.createdBy
                              ? (profileMap.get(guide.createdBy)?.fullName || profileMap.get(guide.createdBy)?.email || guide.createdBy.slice(0, 8))
                              : '-'}
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {isAdmin && guide.createdBy === user?.id && (
                              <ShareToggleButton
                                isShared={!!guide.isShared}
                                onToggle={() => shareMutation.mutate({ id: guide.id, shared: !guide.isShared })}
                              />
                            )}
                            {canEdit && (
                              <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(guide)} className="h-8 w-8 p-0">
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canCreate && (
                              <Button variant="ghost" size="sm" onClick={() => duplicateMutation.mutate(guide.id)} className="h-8 w-8 p-0">
                                <Copy className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (!ensureCanModifyOwnedEntity(guide, user?.id, isAdmin)) return;
                                  if (confirm('Bạn có chắc chắn muốn xóa HDV này?')) {
                                    deleteMutation.mutate(guide.id);
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
                {filteredGuides.map((guide) => (
                  <MasterMobileCard
                    key={guide.id}
                    title={guide.name}
                    id={guide.id}
                    isDefault={guide.isDefault}
                    subtitle={
                      <>
                        {guide.phone || 'Không có điện thoại'}
                        {guide.languages.length > 0 && (
                          <> • {guide.languages.map((l) => l.name).join(', ')}</>
                        )}
                      </>
                    }
                    onClick={() => canEdit && handleOpenDialog(guide)}
                    onEdit={canEdit ? () => handleOpenDialog(guide) : undefined}
                    onDuplicate={canCreate ? () => duplicateMutation.mutate(guide.id) : undefined}
                    onDelete={canDelete ? () => {
                      if (!ensureCanModifyOwnedEntity(guide, user?.id, isAdmin)) return;
                      if (confirm('Bạn có chắc chắn muốn xóa HDV này?')) {
                        deleteMutation.mutate(guide.id);
                      }
                    } : undefined}
                    canEdit={canEdit}
                    canCreate={canCreate}
                    canDelete={canDelete}
                  >
                    {guide.note && <p>{guide.note}</p>}
                  </MasterMobileCard>
                ))}
              </div>
            </>
          )}
        </Card>

        <GuideDialog
          open={dialogOpen}
          onOpenChange={handleCloseDialog}
          guide={editingGuide}
          languages={languages}
          onSubmit={editingGuide ? handleEdit : handleCreate}
        />

        <BulkImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          onImport={handleBulkImport}
          title="Import HDV"
          description="Import nhiều HDV cùng lúc. Định dạng: Tên HDV[,Điện thoại,Ghi chú] (điện thoại, ghi chú không bắt buộc)"
          placeholder="Nhập HDV (mỗi dòng một HDV, định dạng: Tên HDV[,Điện thoại,Ghi chú])
Ví dụ:
Nguyễn Văn An
Trần Thị Bình,0987654321,Nói được tiếng Anh
Lê Văn Cường,0111222333"
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
    </TooltipProvider>
  );
};

export default Guides;
