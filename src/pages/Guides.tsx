import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, MoreVertical, Edit, Power, Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { store } from '@/lib/datastore';
import { SearchInput } from '@/components/master/SearchInput';
import { StatusBadge } from '@/components/master/StatusBadge';
import { GuideDialog } from '@/components/guides/GuideDialog';
import type { Guide, GuideInput } from '@/types/master';
import type { SearchQuery } from '@/types/datastore';

const Guides = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<Guide | undefined>();

  const query: SearchQuery = {
    search,
    status: statusFilter,
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

  const toggleStatusMutation = useMutation({
    mutationFn: (id: string) => store.toggleGuideStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guides'] });
      toast.success('Status updated');
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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Guides</h1>
            <p className="text-muted-foreground">Manage your tour guides</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Guide
          </Button>
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
            <Select
              value={statusFilter}
              onValueChange={(value: any) => setStatusFilter(value)}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
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
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {guides.map((guide) => (
                      <TableRow key={guide.id}>
                        <TableCell className="font-medium">{guide.name}</TableCell>
                        <TableCell>{guide.phone || '-'}</TableCell>
                        <TableCell className="max-w-xs truncate">{guide.note || '-'}</TableCell>
                        <TableCell>
                          <StatusBadge status={guide.status} />
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover">
                              <DropdownMenuItem onClick={() => handleOpenDialog(guide)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => duplicateMutation.mutate(guide.id)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleStatusMutation.mutate(guide.id)}>
                                <Power className="h-4 w-4 mr-2" />
                                {guide.status === 'active' ? 'Deactivate' : 'Activate'}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => deleteMutation.mutate(guide.id)}
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
                {guides.map((guide) => (
                  <Card key={guide.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold">{guide.name}</h3>
                        <p className="text-sm text-muted-foreground">{guide.phone || 'No phone'}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem onClick={() => handleOpenDialog(guide)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicateMutation.mutate(guide.id)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleStatusMutation.mutate(guide.id)}>
                            <Power className="h-4 w-4 mr-2" />
                            {guide.status === 'active' ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteMutation.mutate(guide.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="space-y-2">
                      {guide.note && (
                        <p className="text-sm text-muted-foreground">{guide.note}</p>
                      )}
                      <StatusBadge status={guide.status} />
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
      </div>
    </Layout>
  );
};

export default Guides;
