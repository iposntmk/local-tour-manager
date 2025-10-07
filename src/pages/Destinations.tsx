import { Layout } from '@/components/Layout';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Copy, Trash2, Upload, Trash, Download } from 'lucide-react';
import { SearchInput } from '@/components/master/SearchInput';
import { DestinationDialog } from '@/components/destinations/DestinationDialog';
import { BulkImportDialog } from '@/components/master/BulkImportDialog';
import type { TouristDestination, TouristDestinationInput } from '@/types/master';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import { useHeaderMode } from '@/hooks/useHeaderMode';

const Destinations = () => {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingDestination, setEditingDestination] = useState<TouristDestination | undefined>();
  const [nameFilter, setNameFilter] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('');

  const queryClient = useQueryClient();

  const { data: destinations = [], isLoading } = useQuery({
    queryKey: ['touristDestinations', search],
    queryFn: () => store.listTouristDestinations({ search }),
  });

  const { data: provinces = [] } = useQuery({
    queryKey: ['provinces'],
    queryFn: () => store.listProvinces(),
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

  const deleteAllMutation = useMutation({
    mutationFn: () => store.deleteAllTouristDestinations(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['touristDestinations'] });
      toast.success('All destinations deleted successfully');
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (items: { name: string; price: number }[]) => {
      const provinces = await store.listProvinces();
      const defaultProvince = provinces[0] || { id: '', name: 'Unknown' };

      const inputs: TouristDestinationInput[] = items.map(item => ({
        name: item.name,
        price: item.price,
        provinceRef: { id: defaultProvince.id, nameAtBooking: defaultProvince.name },
      }));

      return store.bulkCreateTouristDestinations(inputs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['touristDestinations'] });
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

  const handleDeleteAll = () => {
    if (confirm('Are you sure you want to delete ALL destinations? This action cannot be undone.')) {
      deleteAllMutation.mutate();
    }
  };

  const handleBulkImport = async (items: { name: string; price: number }[]) => {
    await bulkImportMutation.mutateAsync(items);
  };

  const handleExportTxt = () => {
    if (filteredDestinations.length === 0) {
      toast.error('No destinations to export');
      return;
    }

    const txtContent = filteredDestinations
      .map(dest => `${dest.name},${dest.price}`)
      .join('\n');

    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `destinations-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredDestinations.length} destinations`);
  };

  // Filter destinations based on column filters
  const filteredDestinations = useMemo(() => {
    return destinations.filter(dest => {
      const matchesName = !nameFilter || dest.name.toLowerCase().includes(nameFilter.toLowerCase());
      const matchesProvince = !provinceFilter || provinceFilter === 'all' || dest.provinceRef.nameAtBooking === provinceFilter;
      const matchesPrice = !priceFilter || dest.price.toString().includes(priceFilter);
      return matchesName && matchesProvince && matchesPrice;
    });
  }, [destinations, nameFilter, provinceFilter, priceFilter]);

  const { classes: headerClasses } = useHeaderMode('destinations.headerMode');

  return (
    <Layout>
      <div className="space-y-6">
        <div className={headerClasses}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Destinations</h1>
              <p className="text-muted-foreground">Manage tourist destinations</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Button variant="outline" onClick={handleExportTxt}>
                <Download className="h-4 w-4 mr-2" />
                Export TXT
              </Button>
              <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" onClick={handleDeleteAll} className="gap-2 text-destructive hover:text-destructive">
                <Trash className="h-4 w-4" />
                Delete All
              </Button>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Destination
              </Button>
            </div>
          </div>
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
                  <tr>
                    <th className="p-2">
                      <Input
                        placeholder="Filter name..."
                        value={nameFilter}
                        onChange={(e) => setNameFilter(e.target.value)}
                        className="h-8"
                      />
                    </th>
                    <th className="p-2">
                      <Select value={provinceFilter} onValueChange={setProvinceFilter}>
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="All Provinces" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {provinces.map((province) => (
                            <SelectItem key={province.id} value={province.name}>
                              {province.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </th>
                    <th className="p-2">
                      <Input
                        placeholder="Filter price..."
                        value={priceFilter}
                        onChange={(e) => setPriceFilter(e.target.value)}
                        className="h-8"
                      />
                    </th>
                    <th className="p-2"></th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDestinations.map((destination) => (
                    <tr
                      key={destination.id}
                      className="border-t hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleOpenDialog(destination)}
                    >
                      <td className="p-4 font-medium">{destination.name}</td>
                      <td className="p-4 text-muted-foreground">{destination.provinceRef.nameAtBooking}</td>
                      <td className="p-4 text-muted-foreground">
                        {formatCurrency(destination.price)}
                      </td>
                      <td className="p-4 text-muted-foreground text-sm">
                        {formatDate(destination.updatedAt.split("T")[0])}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(destination)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => duplicateMutation.mutate(destination.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this destination?')) {
                                deleteMutation.mutate(destination.id);
                              }
                            }}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {filteredDestinations.map((destination) => (
                <div
                  key={destination.id}
                  className="rounded-lg border p-4 space-y-3 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleOpenDialog(destination)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium">{destination.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {destination.provinceRef.nameAtBooking} • {formatCurrency(destination.price)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Updated {formatDate(destination.updatedAt.split("T")[0])}
                      </p>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(destination)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => duplicateMutation.mutate(destination.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this destination?')) {
                            deleteMutation.mutate(destination.id);
                          }
                        }}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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

      <BulkImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleBulkImport}
        title="Import Destinations"
        description="Import destinations from a text file or paste data. Each line should have: name,price"
        placeholder="Enter destinations (one per line, format: name,price)&#10;Example:&#10;Ha Long Bay,1500000&#10;Sapa Trek,2000000&#10;Hoi An Ancient Town,800000"
        parseItem={(parts: string[]) => {
          if (parts.length >= 2 && parts[0].trim()) {
            const name = parts[0].trim();
            const price = parseFloat(parts[1].replace(/[^\d.-]/g, ''));
            if (!isNaN(price) && price > 0) {
              return { name, price };
            }
          }
          return null;
        }}
      />
    </Layout>
  );
};

export default Destinations;
