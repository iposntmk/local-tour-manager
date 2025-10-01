import { Layout } from '@/components/Layout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Plus, MoreVertical, Edit, Copy, Trash2 } from 'lucide-react';
import { SearchInput } from '@/components/master/SearchInput';
import { DestinationDialog } from '@/components/destinations/DestinationDialog';
import type { TouristDestination, TouristDestinationInput } from '@/types/master';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Destinations = () => {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDestination, setEditingDestination] = useState<TouristDestination | undefined>();
  
  const queryClient = useQueryClient();

  const { data: destinations = [], isLoading } = useQuery({
    queryKey: ['touristDestinations', search],
    queryFn: () => store.listTouristDestinations({ search }),
  });

  const createMutation = useMutation({
    mutationFn: (input: TouristDestinationInput) => store.createTouristDestination(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['touristDestinations'] });
      toast.success('Destination created successfully');
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<TouristDestination> }) =>
      store.updateTouristDestination(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['touristDestinations'] });
      toast.success('Destination updated successfully');
      setDialogOpen(false);
      setEditingDestination(undefined);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => store.duplicateTouristDestination(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['touristDestinations'] });
      toast.success('Destination duplicated successfully');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => store.deleteTouristDestination(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['touristDestinations'] });
      toast.success('Destination deleted successfully');
    },
  });

  const handleCreate = (input: TouristDestinationInput) => {
    createMutation.mutate(input);
  };

  const handleEdit = (input: TouristDestinationInput) => {
    if (editingDestination) {
      updateMutation.mutate({
        id: editingDestination.id,
        patch: { name: input.name, price: input.price, provinceRef: input.provinceRef },
      });
    }
  };

  const handleOpenDialog = (destination?: TouristDestination) => {
    setEditingDestination(destination);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingDestination(undefined);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Destinations</h1>
            <p className="text-muted-foreground">Manage tourist destinations</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Destination
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search destinations..."
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : destinations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No destinations found. Create your first destination to get started.
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block rounded-lg border">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Name</th>
                    <th className="text-left p-4 font-medium">Province</th>
                    <th className="text-left p-4 font-medium">Price</th>
                    <th className="text-left p-4 font-medium">Updated</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {destinations.map((destination) => (
                    <tr key={destination.id} className="border-t hover:bg-muted/50">
                      <td className="p-4 font-medium">{destination.name}</td>
                      <td className="p-4 text-muted-foreground">{destination.provinceRef.nameAtBooking}</td>
                      <td className="p-4 text-muted-foreground">
                        {destination.price.toLocaleString()} ₫
                      </td>
                      <td className="p-4 text-muted-foreground text-sm">
                        {formatDate(destination.updatedAt.split("T")[0])}
                      </td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(destination)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicateMutation.mutate(destination.id)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => deleteMutation.mutate(destination.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {destinations.map((destination) => (
                <div key={destination.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium">{destination.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {destination.provinceRef.nameAtBooking} • {destination.price.toLocaleString()} ₫
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Updated {formatDate(destination.updatedAt.split("T")[0])}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(destination)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateMutation.mutate(destination.id)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteMutation.mutate(destination.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <DestinationDialog
        open={dialogOpen}
        onOpenChange={handleCloseDialog}
        onSubmit={editingDestination ? handleEdit : handleCreate}
        initialData={editingDestination}
        isEditing={!!editingDestination}
      />
    </Layout>
  );
};

export default Destinations;