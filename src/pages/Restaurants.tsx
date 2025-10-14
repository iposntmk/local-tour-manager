import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { PublicLayout } from '@/components/PublicLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Copy, Trash2, Upload, Trash, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { store } from '@/lib/datastore';
import { SearchInput } from '@/components/master/SearchInput';
import { RestaurantDialog } from '@/components/restaurants/RestaurantDialog';
import { BulkImportDialog } from '@/components/master/BulkImportDialog';
import { useHeaderMode } from '@/hooks/useHeaderMode';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { Restaurant, RestaurantInput, RestaurantType } from '@/types/master';
import type { SearchQuery } from '@/types/datastore';

const restaurantTypeLabels: Record<RestaurantType, string> = {
  asian: 'Asian',
  indian: 'Indian',
  western: 'Western',
  local: 'Local',
  other: 'Other',
};

const Restaurants = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | undefined>();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [nameFilter, setNameFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');
  const [commissionFilter, setCommissionFilter] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const query: SearchQuery = {
    search,
  };

  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ['restaurants', query],
    queryFn: () => store.listRestaurants(query),
  });

  const createMutation = useMutation({
    mutationFn: (data: RestaurantInput) => store.createRestaurant(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      toast.success('Restaurant created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create restaurant');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Restaurant> }) =>
      store.updateRestaurant(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      toast.success('Restaurant updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update restaurant');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => store.duplicateRestaurant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      toast.success('Restaurant duplicated successfully');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => store.deleteRestaurant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      toast.success('Restaurant deleted successfully');
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => store.deleteAllRestaurants(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      toast.success('All restaurants deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete all restaurants');
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: (inputs: RestaurantInput[]) => store.bulkCreateRestaurants(inputs),
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      toast.success(`Successfully imported ${count} restaurants`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to import restaurants');
    },
  });

  const handleCreate = async (data: RestaurantInput) => {
    await createMutation.mutateAsync(data);
  };

  const handleEdit = async (data: RestaurantInput) => {
    if (!editingRestaurant) return;
    await updateMutation.mutateAsync({
      id: editingRestaurant.id,
      data,
    });
  };

  const handleOpenDialog = (restaurant?: Restaurant) => {
    setEditingRestaurant(restaurant);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingRestaurant(undefined);
  };

  const handleDeleteAll = async () => {
    if (confirm('Are you sure you want to delete ALL restaurants? This action cannot be undone.')) {
      await deleteAllMutation.mutateAsync();
    }
  };

  const handleBulkImport = async (items: RestaurantInput[]) => {
    await bulkImportMutation.mutateAsync(items);
  };

  const parseRestaurantItem = (parts: string[]): RestaurantInput | null => {
    if (parts.length >= 2) {
      const name = parts[0];
      const restaurantType = parts[1] as RestaurantType;
      const phone = parts[2] || '';
      const address = parts[3] || '';
      const commissionForGuide = parts[4] ? Number(parts[4]) : 0;

      if (name && ['asian', 'indian', 'western', 'local', 'other'].includes(restaurantType)) {
        return { name, restaurantType, phone, address, commissionForGuide };
      }
    }
    return null;
  };

  const handleExportTxt = () => {
    if (filteredRestaurants.length === 0) {
      toast.error('No restaurants to export');
      return;
    }

    const txtContent = filteredRestaurants
      .map(restaurant => {
        const parts = [restaurant.name, restaurant.restaurantType];
        if (restaurant.phone) parts.push(restaurant.phone);
        else parts.push('');
        if (restaurant.address) parts.push(restaurant.address);
        else parts.push('');
        parts.push(String(restaurant.commissionForGuide || 0));
        return parts.join(',');
      })
      .join('\n');

    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `restaurants-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredRestaurants.length} restaurants`);
  };

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter(restaurant => {
      const matchesName = !nameFilter || restaurant.name.toLowerCase().includes(nameFilter.toLowerCase());
      const matchesType = !typeFilter || restaurant.restaurantType.toLowerCase().includes(typeFilter.toLowerCase());
      const matchesProvince = !provinceFilter || (restaurant.provinceRef.nameAtBooking?.toLowerCase().includes(provinceFilter.toLowerCase()) ?? false);
      const matchesPhone = !phoneFilter || (restaurant.phone?.toLowerCase().includes(phoneFilter.toLowerCase()) ?? false);
      const matchesCommission = !commissionFilter || String(restaurant.commissionForGuide || 0).includes(commissionFilter);
      return matchesName && matchesType && matchesProvince && matchesPhone && matchesCommission;
    });
  }, [restaurants, nameFilter, typeFilter, provinceFilter, phoneFilter, commissionFilter]);

  const { classes: headerClasses } = useHeaderMode('restaurants.headerMode');
  const LayoutComponent = user ? Layout : PublicLayout;

  return (
    <LayoutComponent>
      <div className="space-y-6">
        <div className={headerClasses}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Restaurants</h1>
              <p className="text-muted-foreground">{user ? 'Manage restaurant partners' : 'Browse available restaurants'}</p>
            </div>
            {user && (
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Button onClick={handleExportTxt} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export TXT
                </Button>
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
                  Add Restaurant
                </Button>
              </div>
            )}
          </div>
        </div>

        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search restaurants..."
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : restaurants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No restaurants found. Create your first restaurant!
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Restaurant Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Province</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Commission</TableHead>
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
                          placeholder="Filter by type..."
                          value={typeFilter}
                          onChange={(e) => setTypeFilter(e.target.value)}
                          className="h-8"
                        />
                      </TableHead>
                      <TableHead>
                        <Input
                          placeholder="Filter by province..."
                          value={provinceFilter}
                          onChange={(e) => setProvinceFilter(e.target.value)}
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
                      <TableHead>
                        <Input
                          placeholder="Filter by commission..."
                          value={commissionFilter}
                          onChange={(e) => setCommissionFilter(e.target.value)}
                          className="h-8"
                        />
                      </TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRestaurants.map((restaurant) => (
                      <TableRow
                        key={restaurant.id}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => navigate(`/restaurants/${restaurant.id}`)}
                      >
                        <TableCell className="font-medium">{restaurant.name}</TableCell>
                        <TableCell>{restaurantTypeLabels[restaurant.restaurantType]}</TableCell>
                        <TableCell>{restaurant.provinceRef.nameAtBooking || '-'}</TableCell>
                        <TableCell>{restaurant.phone || '-'}</TableCell>
                        <TableCell>{restaurant.address || '-'}</TableCell>
                        <TableCell>{restaurant.commissionForGuide}%</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {user ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDialog(restaurant)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => duplicateMutation.mutate(restaurant.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm('Are you sure you want to delete this restaurant?')) {
                                      deleteMutation.mutate(restaurant.id);
                                    }
                                  }}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/restaurants/${restaurant.id}`)}
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="h-4 w-4" />
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
                {filteredRestaurants.map((restaurant) => (
                  <Card
                    key={restaurant.id}
                    className="p-4 cursor-pointer hover:bg-accent/50"
                    onClick={() => navigate(`/restaurants/${restaurant.id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold">{restaurant.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {restaurantTypeLabels[restaurant.restaurantType]}
                        </p>
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {user ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(restaurant)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => duplicateMutation.mutate(restaurant.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this restaurant?')) {
                                  deleteMutation.mutate(restaurant.id);
                                }
                              }}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/restaurants/${restaurant.id}`)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      {restaurant.provinceRef.nameAtBooking && (
                        <p className="text-muted-foreground">Province: {restaurant.provinceRef.nameAtBooking}</p>
                      )}
                      {restaurant.phone && (
                        <p className="text-muted-foreground">{restaurant.phone}</p>
                      )}
                      {restaurant.address && (
                        <p className="text-muted-foreground">{restaurant.address}</p>
                      )}
                      <p className="text-muted-foreground">Commission: {restaurant.commissionForGuide}%</p>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </Card>

        {user && (
          <>
            <RestaurantDialog
              open={dialogOpen}
              onOpenChange={handleCloseDialog}
              restaurant={editingRestaurant}
              onSubmit={editingRestaurant ? handleEdit : handleCreate}
            />

            <BulkImportDialog
              open={importDialogOpen}
              onOpenChange={setImportDialogOpen}
              onImport={handleBulkImport}
              parseItem={parseRestaurantItem}
              title="Import Restaurants"
              description="Import multiple restaurants. Format: Name,Type,Phone,Address,Commission (type: asian/indian/western/local/other)"
              placeholder="Enter restaurants (one per line, format: Name,Type[,Phone,Address,Commission])
Example:
Golden Dragon,asian,123-456-7890,123 Main St,5
Taj Mahal,indian,098-765-4321,456 Park Ave,10"
            />
          </>
        )}
      </div>
    </LayoutComponent>
  );
};

export default Restaurants;
