import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Info } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { store } from '@/lib/datastore';
import { SearchInput } from '@/components/master/SearchInput';
import { useHeaderMode } from '@/hooks/useHeaderMode';
import MasterMobileCard from '@/components/master/MasterMobileCard';
import type { SearchQuery } from '@/types/datastore';
import { useAuth } from '@/contexts/AuthContext';

// Guides are user_profiles with settlement_role = 'guide'. This page is a
// read-only roster; creating and editing guides happens on the Users page.
const Guides = () => {
  const [search, setSearch] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');
  const [idFilter, setIdFilter] = useState('');
  const { hasPermission } = useAuth();
  const canExport = hasPermission('export_guides');

  const query: SearchQuery = { search };

  const { data: guides = [], isLoading, error: guidesError } = useQuery({
    queryKey: ['guide-users', query],
    queryFn: () => store.listGuideUsers(query),
    retry: false,
  });

  const filteredGuides = useMemo(() => {
    return guides.filter((guide) => {
      const matchesId = !idFilter || guide.id.toLowerCase().includes(idFilter.toLowerCase());
      const matchesName = !nameFilter || guide.name.toLowerCase().includes(nameFilter.toLowerCase());
      const matchesPhone = !phoneFilter || (guide.phone && guide.phone.toLowerCase().includes(phoneFilter.toLowerCase()));
      return matchesId && matchesName && matchesPhone;
    });
  }, [guides, nameFilter, phoneFilter, idFilter]);

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
      .map((guide) => {
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

  const { classes: headerClasses } = useHeaderMode('guides.headerMode');

  return (
    <TooltipProvider>
      <div className="space-y-4 md:space-y-6">
        <div className={headerClasses}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-lg sm:text-xl md:text-3xl font-bold">Hướng dẫn viên</h1>
              <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                Danh sách hướng dẫn viên (quản lý tại trang Người dùng)
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2 sm:justify-end">
              {canExport && (
                <Button variant="outline" size="sm" onClick={handleExportTxt} className="h-8 px-2.5 text-xs md:h-9 md:px-4 md:text-sm">
                  <Download className="h-3.5 w-3.5 mr-1.5 md:mr-2" />
                  <span className="hidden sm:inline">Xuất TXT</span>
                  <span className="sm:hidden">Xuất</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        <Card className="p-4">
          <div className="mb-4 flex items-start gap-2 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground md:text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Hướng dẫn viên là người dùng có "Vai trò quyết toán = Hướng dẫn viên". Để thêm, sửa thông tin,
              ngôn ngữ hoặc đặt HDV mặc định, hãy vào trang <strong>Người dùng</strong>.
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <SearchInput value={search} onChange={setSearch} placeholder="Tìm HDV..." />
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
              Chưa có hướng dẫn viên nào. Tạo người dùng với vai trò quyết toán "Hướng dẫn viên" tại trang Người dùng.
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
                    </TableRow>
                    <TableRow>
                      <TableHead>
                        <Input placeholder="Lọc theo ID..." value={idFilter} onChange={(e) => setIdFilter(e.target.value)} className="h-8" />
                      </TableHead>
                      <TableHead>
                        <Input placeholder="Lọc theo tên..." value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} className="h-8" />
                      </TableHead>
                      <TableHead>
                        <Input placeholder="Lọc theo điện thoại..." value={phoneFilter} onChange={(e) => setPhoneFilter(e.target.value)} className="h-8" />
                      </TableHead>
                      <TableHead></TableHead>
                      <TableHead></TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGuides.map((guide) => (
                      <TableRow key={guide.id}>
                        <TableCell className="font-mono text-muted-foreground">{guide.id}</TableCell>
                        <TableCell className="font-medium">{guide.name}</TableCell>
                        <TableCell>{guide.phone || '-'}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {guide.languages.length > 0 ? guide.languages.map((language) => language.name).join(', ') : '-'}
                        </TableCell>
                        <TableCell>
                          <Checkbox checked={guide.isDefault} disabled aria-label={`${guide.name} là HDV mặc định`} />
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{guide.note || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-2 md:space-y-3">
                {filteredGuides.map((guide) => (
                  <MasterMobileCard
                    key={guide.id}
                    title={guide.name}
                    id={guide.id}
                    isDefault={guide.isDefault}
                    subtitle={
                      <>
                        {guide.phone || 'Không có điện thoại'}
                        {guide.languages.length > 0 && (<> • {guide.languages.map((l) => l.name).join(', ')}</>)}
                      </>
                    }
                  >
                    {guide.note && <p>{guide.note}</p>}
                  </MasterMobileCard>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </TooltipProvider>
  );
};

export default Guides;
