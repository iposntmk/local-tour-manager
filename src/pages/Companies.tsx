import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Copy, Trash2, Upload, Trash } from 'lucide-react';
import { toast } from 'sonner';
import { store } from '@/lib/datastore';
import { SearchInput } from '@/components/master/SearchInput';
import { CompanyDialog } from '@/components/companies/CompanyDialog';
import { BulkImportDialog } from '@/components/master/BulkImportDialog';
import { useHeaderMode } from '@/hooks/useHeaderMode';
import type { Company, CompanyInput } from '@/types/master';
import type { SearchQuery } from '@/types/datastore';

const Companies = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | undefined>();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [nameFilter, setNameFilter] = useState('');
  const [contactFilter, setContactFilter] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');

  const query: SearchQuery = {
    search,
  };

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies', query],
    queryFn: () => store.listCompanies(query),
  });

  const createMutation = useMutation({
    mutationFn: (data: CompanyInput) => store.createCompany(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Company created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create company');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Company> }) =>
      store.updateCompany(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Company updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update company');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => store.duplicateCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Company duplicated successfully');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => store.deleteCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Company deleted successfully');
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => store.deleteAllCompanies(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('All companies deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete all companies');
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: (inputs: CompanyInput[]) => store.bulkCreateCompanies(inputs),
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success(`Successfully imported ${count} companies`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to import companies');
    },
  });

  const handleCreate = async (data: CompanyInput) => {
    await createMutation.mutateAsync(data);
  };

  const handleEdit = async (data: CompanyInput) => {
    if (!editingCompany) return;
    await updateMutation.mutateAsync({
      id: editingCompany.id,
      data,
    });
  };

  const handleOpenDialog = (company?: Company) => {
    setEditingCompany(company);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCompany(undefined);
  };

  const handleDeleteAll = async () => {
    if (confirm('Are you sure you want to delete ALL companies? This action cannot be undone.')) {
      await deleteAllMutation.mutateAsync();
    }
  };

  const handleBulkImport = async (items: CompanyInput[]) => {
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

  const filteredCompanies = useMemo(() => {
    return companies.filter(company => {
      const matchesName = !nameFilter || company.name.toLowerCase().includes(nameFilter.toLowerCase());
      const matchesContact = !contactFilter || (company.contactName?.toLowerCase().includes(contactFilter.toLowerCase()) ?? false);
      const matchesPhone = !phoneFilter || (company.phone?.toLowerCase().includes(phoneFilter.toLowerCase()) ?? false);
      return matchesName && matchesContact && matchesPhone;
    });
  }, [companies, nameFilter, contactFilter, phoneFilter]);

  const { classes: headerClasses } = useHeaderMode('companies.headerMode');

  return (
    <Layout>
      <div className="space-y-6">
        <div className={headerClasses}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-3xl font-bold">Companies</h1>
              <p className="text-muted-foreground">Manage partner travel companies</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setImportDialogOpen(true)} variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                Import
              </Button>
              <Button onClick={handleDeleteAll} variant="outline" className="gap-2 text-destructive hover:text-destructive">
                <Trash className="h-4 w-4" />
                Delete All
              </Button>
              <Button onClick={() => handleOpenDialog()} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Company
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
                placeholder="Search companies..."
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : companies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No companies found. Create your first company!
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
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
                          placeholder="Filter by contact..."
                          value={contactFilter}
                          onChange={(e) => setContactFilter(e.target.value)}
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
                    {filteredCompanies.map((company) => (
                      <TableRow
                        key={company.id}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => handleOpenDialog(company)}
                      >
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell>{company.contactName || '-'}</TableCell>
                        <TableCell>{company.phone || '-'}</TableCell>
                        <TableCell>{company.email || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(company)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => duplicateMutation.mutate(company.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this company?')) {
                                  deleteMutation.mutate(company.id);
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
                {filteredCompanies.map((company) => (
                  <Card
                    key={company.id}
                    className="p-4 cursor-pointer hover:bg-accent/50"
                    onClick={() => handleOpenDialog(company)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold">{company.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {company.contactName || 'No contact'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(company)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => duplicateMutation.mutate(company.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this company?')) {
                              deleteMutation.mutate(company.id);
                            }
                          }}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      {company.phone && (
                        <p className="text-muted-foreground">{company.phone}</p>
                      )}
                      {company.email && (
                        <p className="text-muted-foreground">{company.email}</p>
                      )}
                    </div>
                  </Card>
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
          title="Import Companies"
          description="Import multiple companies at once. Format: Company Name[,Contact,Phone,Email] (contact, phone, email are optional)"
          placeholder="Enter companies (one per line, format: Company Name[,Contact,Phone,Email])
Example:
Company A
ABC Travel,John Doe,123-456-7890,john@abc.com
XYZ Tours,Jane Smith,098-765-4321"
        />
      </div>
    </Layout>
  );
};

export default Companies;
