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
import { ShopPlaceDialog } from '@/components/shop-places/ShopPlaceDialog';
import { BulkImportDialog } from '@/components/master/BulkImportDialog';
import { useHeaderMode } from '@/hooks/useHeaderMode';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { ShopPlace, ShopPlaceInput, ShopPlaceType } from '@/types/master';
import type { SearchQuery } from '@/types/datastore';

const shopPlaceTypeLabels: Record<ShopPlaceType, string> = {
  clothing: 'Clothing',
  food_and_beverage: 'F&B',
  souvenirs: 'Souvenirs',
  handicrafts: 'Handicrafts',
  electronics: 'Electronics',
  other: 'Other',
};

const ShopPlaces = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShopPlace, setEditingShopPlace] = useState<ShopPlace | undefined>();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [nameFilter, setNameFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');
  const [addressFilter, setAddressFilter] = useState('');
  const [commissionFilter, setCommissionFilter] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const query: SearchQuery = {
    search,
  };

  const { data: shopPlaces = [], isLoading } = useQuery({
    queryKey: ['shop-places', query],
    queryFn: () => store.listShopPlaces(query),
  });

  const createMutation = useMutation({
    mutationFn: (data: ShopPlaceInput) => store.createShopPlace(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-places'] });
      toast.success('Shop place created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create shop place');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ShopPlace> }) =>
      store.updateShopPlace(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-places'] });
      toast.success('Shop place updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update shop place');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => store.duplicateShopPlace(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-places'] });
      toast.success('Shop place duplicated successfully');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => store.deleteShopPlace(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-places'] });
      toast.success('Shop place deleted successfully');
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => store.deleteAllShopPlaces(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-places'] });
      toast.success('All shop places deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete all shop places');
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: (inputs: ShopPlaceInput[]) => store.bulkCreateShopPlaces(inputs),
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['shop-places'] });
      toast.success(`Successfully imported ${count} shop places`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to import shop places');
    },
  });

  const handleCreate = async (data: ShopPlaceInput) => {
    await createMutation.mutateAsync(data);
  };

  const handleEdit = async (data: ShopPlaceInput) => {
    if (!editingShopPlace) return;
    await updateMutation.mutateAsync({
      id: editingShopPlace.id,
      data,
    });
  };

  const handleOpenDialog = (shopPlace?: ShopPlace) => {
    setEditingShopPlace(shopPlace);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingShopPlace(undefined);
  };

  const handleDeleteAll = async () => {
    if (confirm('Are you sure you want to delete ALL shop places? This action cannot be undone.')) {
      await deleteAllMutation.mutateAsync();
    }
  };

  const handleBulkImport = async (items: ShopPlaceInput[]) => {
    await bulkImportMutation.mutateAsync(items);
  };

  const parseShopPlaceItem = (parts: string[]): ShopPlaceInput | null => {
    if (parts.length >= 2) {
      const name = parts[0];
      const shopType = parts[1] as ShopPlaceType;
      const phone = parts[2] || '';
      const address = parts[3] || '';
      const commissionForGuide = parts[4] ? Number(parts[4]) : 0;

      if (name && ['clothing', 'food_and_beverage', 'souvenirs', 'handicrafts', 'electronics', 'other'].includes(shopType)) {
        return { name, shopType, phone, address, commissionForGuide };
      }
    }
    return null;
  };

  const handleExportTxt = () => {
    if (filteredShopPlaces.length === 0) {
      toast.error('No shop places to export');
      return;
    }

    const txtContent = filteredShopPlaces
      .map(shopPlace => {
        const parts = [shopPlace.name, shopPlace.shopType];
        if (shopPlace.phone) parts.push(shopPlace.phone);
        else parts.push('');
        if (shopPlace.address) parts.push(shopPlace.address);
        else parts.push('');
        parts.push(String(shopPlace.commissionForGuide || 0));
        return parts.join(',');
      })
      .join('\n');

    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shop-places-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredShopPlaces.length} shop places`);
  };

  const filteredShopPlaces = useMemo(() => {
    return shopPlaces.filter(shopPlace => {
      const matchesName = !nameFilter || shopPlace.name.toLowerCase().includes(nameFilter.toLowerCase());
      const matchesType = !typeFilter || shopPlace.shopType.toLowerCase().includes(typeFilter.toLowerCase());
      const matchesProvince = !provinceFilter || (shopPlace.provinceRef.nameAtBooking?.toLowerCase().includes(provinceFilter.toLowerCase()) ?? false);
      const matchesPhone = !phoneFilter || (shopPlace.phone?.toLowerCase().includes(phoneFilter.toLowerCase()) ?? false);
      const matchesAddress = !addressFilter || (shopPlace.address?.toLowerCase().includes(addressFilter.toLowerCase()) ?? false);
      const matchesCommission = !commissionFilter || String(shopPlace.commissionForGuide || 0).includes(commissionFilter);
      return matchesName && matchesType && matchesProvince && matchesPhone && matchesAddress && matchesCommission;
    });
  }, [shopPlaces, nameFilter, typeFilter, provinceFilter, phoneFilter, addressFilter, commissionFilter]);

  const { classes: headerClasses } = useHeaderMode('shop-places.headerMode');
  const LayoutComponent = user ? Layout : PublicLayout;

  return (
    <LayoutComponent>
      <div className="space-y-6">
        <div className={headerClasses}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Shop Places</h1>
              <p className="text-muted-foreground">{user ? 'Manage shopping locations for tourists' : 'Browse available shop places'}</p>
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
                  Add Shop Place
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
                placeholder="Search shop places..."
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : shopPlaces.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No shop places found. Create your first shop place!
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shop Name</TableHead>
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
                      <TableHead>
                        <Input
                          placeholder="Filter by address..."
                          value={addressFilter}
                          onChange={(e) => setAddressFilter(e.target.value)}
                          className="h-8"
                        />
                      </TableHead>
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
                    {filteredShopPlaces.map((shopPlace) => (
                      <TableRow
                        key={shopPlace.id}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => navigate(`/shop-places/${shopPlace.id}`)}
                      >
                        <TableCell className="font-medium">{shopPlace.name}</TableCell>
                        <TableCell>{shopPlaceTypeLabels[shopPlace.shopType]}</TableCell>
                        <TableCell>{shopPlace.provinceRef.nameAtBooking || '-'}</TableCell>
                        <TableCell>{shopPlace.phone || '-'}</TableCell>
                        <TableCell>{shopPlace.address || '-'}</TableCell>
                        <TableCell>{shopPlace.commissionForGuide}%</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {user ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDialog(shopPlace)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => duplicateMutation.mutate(shopPlace.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm('Are you sure you want to delete this shop place?')) {
                                      deleteMutation.mutate(shopPlace.id);
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
                                onClick={() => navigate(`/shop-places/${shopPlace.id}`)}
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
                {filteredShopPlaces.map((shopPlace) => (
                  <Card
                    key={shopPlace.id}
                    className="p-4 cursor-pointer hover:bg-accent/50"
                    onClick={() => navigate(`/shop-places/${shopPlace.id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold">{shopPlace.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {shopPlaceTypeLabels[shopPlace.shopType]}
                        </p>
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {user ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(shopPlace)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => duplicateMutation.mutate(shopPlace.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this shop place?')) {
                                  deleteMutation.mutate(shopPlace.id);
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
                            onClick={() => navigate(`/shop-places/${shopPlace.id}`)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      {shopPlace.provinceRef.nameAtBooking && (
                        <p className="text-muted-foreground">Province: {shopPlace.provinceRef.nameAtBooking}</p>
                      )}
                      {shopPlace.phone && (
                        <p className="text-muted-foreground">{shopPlace.phone}</p>
                      )}
                      {shopPlace.address && (
                        <p className="text-muted-foreground">{shopPlace.address}</p>
                      )}
                      <p className="text-muted-foreground">Commission: {shopPlace.commissionForGuide}%</p>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </Card>

        {user && (
          <>
            <ShopPlaceDialog
              open={dialogOpen}
              onOpenChange={handleCloseDialog}
              shopPlace={editingShopPlace}
              onSubmit={editingShopPlace ? handleEdit : handleCreate}
            />

            <BulkImportDialog
              open={importDialogOpen}
              onOpenChange={setImportDialogOpen}
              onImport={handleBulkImport}
              parseItem={parseShopPlaceItem}
              title="Import Shop Places"
              description="Import multiple shop places. Format: Name,Type,Phone,Address,Commission (type: clothing/food_and_beverage/souvenirs/handicrafts/electronics/other)"
              placeholder="Enter shop places (one per line, format: Name,Type[,Phone,Address,Commission])
Example:
Silk Road,clothing,123-456-7890,123 Main St,5
Spice Market,food_and_beverage,098-765-4321,456 Park Ave,10"
            />
          </>
        )}
      </div>
    </LayoutComponent>
  );
};

export default ShopPlaces;
