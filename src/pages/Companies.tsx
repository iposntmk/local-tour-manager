import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, MoreVertical, Edit, Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { store } from '@/lib/datastore';
import { SearchInput } from '@/components/master/SearchInput';
import { CompanyDialog } from '@/components/companies/CompanyDialog';
import type { Company, CompanyInput } from '@/types/master';
import type { SearchQuery } from '@/types/datastore';

const Companies = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | undefined>();

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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Companies</h1>
            <p className="text-muted-foreground">Manage partner travel companies</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Company
          </Button>
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
                  </TableHeader>
                  <TableBody>
                    {companies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell>{company.contactName || '-'}</TableCell>
                        <TableCell>{company.phone || '-'}</TableCell>
                        <TableCell>{company.email || '-'}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover">
                              <DropdownMenuItem onClick={() => handleOpenDialog(company)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => duplicateMutation.mutate(company.id)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => deleteMutation.mutate(company.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {companies.map((company) => (
                  <Card key={company.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold">{company.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {company.contactName || 'No contact'}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem onClick={() => handleOpenDialog(company)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicateMutation.mutate(company.id)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteMutation.mutate(company.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
      </div>
    </Layout>
  );
};

export default Companies;