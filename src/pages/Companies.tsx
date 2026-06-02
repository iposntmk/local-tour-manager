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
import { CompanyDialog } from '@/components/companies/CompanyDialog';
import { BulkImportDialog } from '@/components/master/BulkImportDialog';
import { useHeaderMode } from '@/hooks/useHeaderMode';
import MasterMobileCard from '@/components/master/MasterMobileCard';
import type { Company, CompanyInput } from '@/types/master';
import type { SearchQuery } from '@/types/datastore';
import { useAuth } from '@/contexts/AuthContext';
import { ensureCanModifyOwnedEntity } from '@/lib/master-ownership';
import type { UserProfile } from '@/types/user';

const Companies = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | undefined>();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [nameFilter, setNameFilter] = useState('');
  const [contactFilter, setContactFilter] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');
  const [idFilter, setIdFilter] = useState('');
  const { hasPermission, user, isAdmin } = useAuth();
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
  const canCreate = hasPermission('create_companies');
  const canEdit = hasPermission('edit_companies');
  const canDelete = hasPermission('delete_companies');
  const canImport = hasPermission('import_companies');
  const canExport = hasPermission('export_companies');

  const query: SearchQuery = {
    search,
  };

  const { data: companies = [], isLoading, error: companiesError } = useQuery({
    queryKey: ['companies', query],
    queryFn: () => store.listCompanies(query),
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: (data: CompanyInput) => store.createCompany(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Tạo công ty thành công');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Tạo công ty thất bại');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Company> }) =>
      store.updateCompany(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Cập nhật công ty thành công');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Cập nhật công ty thất bại');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => store.duplicateCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Nhân bản công ty thành công');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => store.deleteCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Xóa công ty thành công');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Xóa công ty thất bại');
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => store.deleteAllCompanies(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Đã xóa tất cả công ty');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Xóa tất cả công ty thất bại');
    },
  });

  const shareMutation = useMutation({
    mutationFn: ({ id, shared }: { id: string; shared: boolean }) =>
      store.setMasterDataShared('companies', id, shared),
    onSuccess: (_, { shared }) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success(shared ? 'Đã chia sẻ' : 'Đã đặt về riêng tư');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Thao tác chia sẻ thất bại');
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: (inputs: CompanyInput[]) => store.bulkCreateCompanies(inputs),
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success(`Đã import ${count} công ty`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Import công ty thất bại');
    },
  });

  const handleCreate = async (data: CompanyInput) => {
    if (!canCreate) {
      toast.error('Bạn không có quyền tạo công ty');
      return;
    }
    await createMutation.mutateAsync(data);
  };

  const handleEdit = async (data: CompanyInput) => {
    if (!canEdit) {
      toast.error('Bạn không có quyền sửa công ty');
      return;
    }
    if (!editingCompany) return;
    await updateMutation.mutateAsync({
      id: editingCompany.id,
      data,
    });
  };

  const handleOpenDialog = (company?: Company) => {
    if (company && !canEdit) return;
    if (!company && !canCreate) return;
    if (company && !ensureCanModifyOwnedEntity(company, user?.id, isAdmin)) return;
    setEditingCompany(company);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCompany(undefined);
  };

  const handleDeleteAll = async () => {
    if (!canDelete) {
      toast.error('Bạn không có quyền xóa công ty');
      return;
    }
    if (confirm('Bạn có chắc chắn muốn xóa TẤT CẢ công ty? Hành động này không thể hoàn tác.')) {
      await deleteAllMutation.mutateAsync();
    }
  };

  const handleBulkImport = async (items: CompanyInput[]) => {
    if (!canImport) {
      toast.error('Bạn không có quyền import công ty');
      return;
    }
    await bulkImportMutation.mutateAsync(items);
  };

  const parseCompanyItem = (parts: string[]): CompanyInput | null => {
    if (parts.length >= 1) {
      const name = parts[0];
      const contactName = parts[1] || '';
      const phone = parts[2] || '';
      const email = parts[3] || '';

      if (name) {
        return { name, contactName, phone, email };
      }
    }
    return null;
  };

  const handleExportTxt = () => {
    if (!canExport) {
      toast.error('Bạn không có quyền export công ty');
      return;
    }
    if (filteredCompanies.length === 0) {
      toast.error('Không có công ty nào để xuất');
      return;
    }

    const txtContent = filteredCompanies
      .map(company => {
        const parts = [company.name];
        if (company.contactName) parts.push(company.contactName);
        if (company.phone) parts.push(company.phone);
        if (company.email) parts.push(company.email);
        return parts.join(',');
      })
      .join('\n');

    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `companies-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất ${filteredCompanies.length} công ty`);
  };

  const filteredCompanies = useMemo(() => {
    return companies.filter(company => {
      const matchesId = !idFilter || company.id.toLowerCase().includes(idFilter.toLowerCase());
      const matchesName = !nameFilter || company.name.toLowerCase().includes(nameFilter.toLowerCase());
      const matchesContact = !contactFilter || (company.contactName?.toLowerCase().includes(contactFilter.toLowerCase()) ?? false);
      const matchesPhone = !phoneFilter || (company.phone?.toLowerCase().includes(phoneFilter.toLowerCase()) ?? false);
      return matchesId && matchesName && matchesContact && matchesPhone;
    });
  }, [companies, nameFilter, contactFilter, phoneFilter, idFilter]);

  const handleSetDefaultCompany = async (company: Company, checked: boolean) => {
    if (!canEdit) {
      toast.error('Bạn không có quyền sửa công ty');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: company.id,
        data: { isDefault: checked },
      });
    } catch {
      // Error toast handled by mutation
    }
  };

  const { classes: headerClasses } = useHeaderMode('companies.headerMode');

  return (
    <TooltipProvider>
      <div className="space-y-4 md:space-y-6">
        <div className={headerClasses}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-lg sm:text-xl md:text-3xl font-bold">Công ty</h1>
              <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground mt-0.5 sm:mt-1">Quản lý công ty đối tác</p>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2 sm:justify-end">
              {canExport && (
                <Button variant="outline" size="sm" onClick={handleExportTxt} className="h-8 px-2.5 text-xs md:h-9 md:px-4 md:text-sm">
                  <Download className="h-3.5 w-3.5 mr-1.5 md:mr-2" />
                  <span className="hidden sm:inline">Xuất TXT</span>
                  <span className="sm:hidden">Xuất</span>
                </Button>
              )}
              {canImport && (
                <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)} className="h-8 px-2.5 text-xs md:h-9 md:px-4 md:text-sm">
                  <Upload className="h-3.5 w-3.5 mr-1.5 md:mr-2" />
                  Nhập
                </Button>
              )}
              {canDelete && (
                <Button variant="outline" size="sm" onClick={handleDeleteAll} className="h-8 px-2.5 text-xs md:h-9 md:px-4 md:text-sm gap-1.5 text-destructive hover:text-destructive">
                  <Trash className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Xóa tất cả</span>
                  <span className="sm:hidden">Xóa</span>
                </Button>
              )}
              {canCreate && (
                <Button size="sm" onClick={() => handleOpenDialog()} className="h-8 px-3 text-xs md:h-9 md:px-4 md:text-sm">
                  <Plus className="h-3.5 w-3.5 mr-1.5 md:mr-2" />
                  Thêm công ty
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
                placeholder="Tìm công ty..."
              />
            </div>
          </div>

          {companiesError ? (
            <div className="text-center py-8 text-destructive">
              {companiesError instanceof Error ? companiesError.message : 'Tải danh sách công ty thất bại'}
            </div>
          ) : isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
          ) : companies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Không tìm thấy công ty nào. Hãy tạo công ty đầu tiên!
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Tên công ty</TableHead>
                      <TableHead>Liên hệ</TableHead>
                      <TableHead>Điện thoại</TableHead>
                      <TableHead>Mặc định</TableHead>
                      <TableHead>Email</TableHead>
                      {isAdmin && <TableHead>Người tạo</TableHead>}
                      <TableHead className="w-[70px]"></TableHead>
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
                          placeholder="Lọc theo liên hệ..."
                          value={contactFilter}
                          onChange={(e) => setContactFilter(e.target.value)}
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
                      {isAdmin && <TableHead></TableHead>}
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompanies.map((company) => (
                      <TableRow
                        key={company.id}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => canEdit && handleOpenDialog(company)}
                      >
                        <TableCell className="font-mono text-muted-foreground">{company.id}</TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {company.name}
                            <SharedBadge isShared={!!company.isShared} />
                          </div>
                        </TableCell>
                        <TableCell>{company.contactName || '-'}</TableCell>
                        <TableCell>{company.phone || '-'}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={company.isDefault}
                            onCheckedChange={(checked) => handleSetDefaultCompany(company, checked === true)}
                            disabled={!canEdit}
                            aria-label={`${company.name} là công ty mặc định`}
                          />
                        </TableCell>
                        <TableCell>{company.email || '-'}</TableCell>
                        {isAdmin && (
                          <TableCell className="text-sm text-muted-foreground">
                            {company.createdBy
                              ? (profileMap.get(company.createdBy)?.fullName || profileMap.get(company.createdBy)?.email || company.createdBy.slice(0, 8))
                              : '-'}
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {isAdmin && company.createdBy === user?.id && (
                              <ShareToggleButton
                                isShared={!!company.isShared}
                                onToggle={() => shareMutation.mutate({ id: company.id, shared: !company.isShared })}
                              />
                            )}
                            {canEdit && (
                              <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(company)} className="h-8 w-8 p-0">
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canCreate && (
                              <Button variant="ghost" size="sm" onClick={() => duplicateMutation.mutate(company.id)} className="h-8 w-8 p-0">
                                <Copy className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (!ensureCanModifyOwnedEntity(company, user?.id, isAdmin)) return;
                                  if (confirm('Bạn có chắc chắn muốn xóa công ty này?')) {
                                    deleteMutation.mutate(company.id);
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
              <div className="md:hidden space-y-2 md:space-y-3">
                {filteredCompanies.map((company) => (
                  <MasterMobileCard
                    key={company.id}
                    title={company.name}
                    id={company.id}
                    isDefault={company.isDefault}
                    subtitle={company.contactName || 'Không có liên hệ'}
                    onClick={() => canEdit && handleOpenDialog(company)}
                    onEdit={canEdit ? () => handleOpenDialog(company) : undefined}
                    onDuplicate={canCreate ? () => duplicateMutation.mutate(company.id) : undefined}
                    onDelete={canDelete ? () => {
                      if (!ensureCanModifyOwnedEntity(company, user?.id, isAdmin)) return;
                      if (confirm('Bạn có chắc chắn muốn xóa công ty này?')) {
                        deleteMutation.mutate(company.id);
                      }
                    } : undefined}
                    canEdit={canEdit}
                    canCreate={canCreate}
                    canDelete={canDelete}
                  >
                    {(company.phone || company.email) && (
                      <>
                        {company.phone && <p>{company.phone}</p>}
                        {company.email && <p>{company.email}</p>}
                      </>
                    )}
                  </MasterMobileCard>
                ))}
              </div>
            </>
          )}
        </Card>

        <CompanyDialog
          open={dialogOpen}
          onOpenChange={handleCloseDialog}
          company={editingCompany}
          onSubmit={editingCompany ? handleEdit : handleCreate}
        />

        <BulkImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          onImport={handleBulkImport}
          parseItem={parseCompanyItem}
          title="Import công ty"
          description="Import nhiều công ty cùng lúc. Định dạng: Tên công ty[,Liên hệ,Điện thoại,Email] (liên hệ, điện thoại, email không bắt buộc)"
          placeholder="Nhập công ty (mỗi dòng một công ty, định dạng: Tên công ty[,Liên hệ,Điện thoại,Email])
Ví dụ:
Công ty A
ABC Travel,Nguyễn Văn A,0123-456-789,abc@example.com
XYZ Tours,Trần Thị B,0987-654-321"
        />
      </div>
    </TooltipProvider>
  );
};

export default Companies;
