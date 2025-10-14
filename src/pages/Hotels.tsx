import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
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
import { HotelDialog } from '@/components/hotels/HotelDialog';
import { BulkImportDialog } from '@/components/master/BulkImportDialog';
import { useHeaderMode } from '@/hooks/useHeaderMode';
import { formatCurrency } from '@/lib/currency-utils';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { Hotel, HotelInput, RoomType } from '@/types/master';
import type { SearchQuery } from '@/types/datastore';

const roomTypeLabels: Record<RoomType, string> = {
  single: 'Single',
  double: 'Double',
  group: 'Group',
  suite: 'Suite',
};

const Hotels = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | undefined>();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [nameFilter, setNameFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');
  const [roomTypeFilter, setRoomTypeFilter] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const query: SearchQuery = {
    search,
  };

  const { data: hotels = [], isLoading } = useQuery({
    queryKey: ['hotels', query],
    queryFn: () => store.listHotels(query),
  });

  const createMutation = useMutation({
    mutationFn: (data: HotelInput) => store.createHotel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotels'] });
      toast.success('Hotel created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create hotel');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Hotel> }) =>
      store.updateHotel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotels'] });
      toast.success('Hotel updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update hotel');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => store.duplicateHotel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotels'] });
      toast.success('Hotel duplicated successfully');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => store.deleteHotel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotels'] });
      toast.success('Hotel deleted successfully');
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => store.deleteAllHotels(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotels'] });
      toast.success('All hotels deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete all hotels');
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: (inputs: HotelInput[]) => store.bulkCreateHotels(inputs),
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['hotels'] });
      toast.success(`Successfully imported ${count} hotels`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to import hotels');
    },
  });

  const handleCreate = async (data: HotelInput) => {
    await createMutation.mutateAsync(data);
  };

  const handleEdit = async (data: HotelInput) => {
    if (!editingHotel) return;
    await updateMutation.mutateAsync({
      id: editingHotel.id,
      data,
    });
  };

  const handleOpenDialog = (hotel?: Hotel) => {
    setEditingHotel(hotel);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingHotel(undefined);
  };

  const handleDeleteAll = async () => {
    if (confirm('Are you sure you want to delete ALL hotels? This action cannot be undone.')) {
      await deleteAllMutation.mutateAsync();
    }
  };

  const handleBulkImport = async (items: HotelInput[]) => {
    await bulkImportMutation.mutateAsync(items);
  };

  const parseHotelItem = (parts: string[]): HotelInput | null => {
    if (parts.length >= 5) {
      const name = parts[0];
      const ownerName = parts[1];
      const ownerPhone = parts[2];
      const roomType = parts[3] as RoomType;
      const pricePerNight = parseFloat(parts[4]);
      const address = parts[5] || '';

      if (name && ownerName && ownerPhone && ['single', 'double', 'group', 'suite'].includes(roomType) && !isNaN(pricePerNight)) {
        return { name, ownerName, ownerPhone, roomType, pricePerNight, address };
      }
    }
    return null;
  };

  const handleExportTxt = () => {
    if (filteredHotels.length === 0) {
      toast.error('No hotels to export');
      return;
    }

    const txtContent = filteredHotels
      .map(hotel => {
        const parts = [hotel.name, hotel.ownerName, hotel.ownerPhone, hotel.roomType, hotel.pricePerNight.toString()];
        if (hotel.address) parts.push(hotel.address);
        return parts.join(',');
      })
      .join('\n');

    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hotels-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredHotels.length} hotels`);
  };

  const filteredHotels = useMemo(() => {
    return hotels.filter(hotel => {
      const matchesName = !nameFilter || hotel.name.toLowerCase().includes(nameFilter.toLowerCase());
      const matchesOwner = !ownerFilter || hotel.ownerName.toLowerCase().includes(ownerFilter.toLowerCase());
      const matchesPhone = !phoneFilter || (hotel.ownerPhone?.toLowerCase().includes(phoneFilter.toLowerCase()) ?? false);
      const matchesRoomType = !roomTypeFilter || hotel.roomType.toLowerCase().includes(roomTypeFilter.toLowerCase());
      return matchesName && matchesOwner && matchesPhone && matchesRoomType;
    });
  }, [hotels, nameFilter, ownerFilter, phoneFilter, roomTypeFilter]);

  const { classes: headerClasses } = useHeaderMode('hotels.headerMode');
  const LayoutComponent = user ? Layout : PublicLayout;

  return (
    <LayoutComponent>
      <div className="space-y-6">
        <div className={headerClasses}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Hotels</h1>
              <p className="text-muted-foreground">{user ? 'Manage hotel partners' : 'Browse available hotels'}</p>
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
                  Add Hotel
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
                placeholder="Search hotels..."
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : hotels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hotels found. Create your first hotel!
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hotel Name</TableHead>
                      <TableHead>Province</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Room Type</TableHead>
                      <TableHead>Price/Night</TableHead>
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
                      <TableHead></TableHead>
                      <TableHead>
                        <Input
                          placeholder="Filter by owner..."
                          value={ownerFilter}
                          onChange={(e) => setOwnerFilter(e.target.value)}
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
                          placeholder="Filter by room type..."
                          value={roomTypeFilter}
                          onChange={(e) => setRoomTypeFilter(e.target.value)}
                          className="h-8"
                        />
                      </TableHead>
                      <TableHead></TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHotels.map((hotel) => (
                      <TableRow
                        key={hotel.id}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => user ? handleOpenDialog(hotel) : navigate(`/hotels/${hotel.id}`)}
                      >
                        <TableCell className="font-medium">{hotel.name}</TableCell>
                        <TableCell>{hotel.provinceRef.nameAtBooking || '-'}</TableCell>
                        <TableCell>{hotel.ownerName}</TableCell>
                        <TableCell>{hotel.ownerPhone}</TableCell>
                        <TableCell>{roomTypeLabels[hotel.roomType]}</TableCell>
                        <TableCell>{formatCurrency(hotel.pricePerNight)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {user ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDialog(hotel)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => duplicateMutation.mutate(hotel.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm('Are you sure you want to delete this hotel?')) {
                                      deleteMutation.mutate(hotel.id);
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
                                onClick={() => navigate(`/hotels/${hotel.id}`)}
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
                {filteredHotels.map((hotel) => (
                  <Card
                    key={hotel.id}
                    className="p-4 cursor-pointer hover:bg-accent/50"
                    onClick={() => user ? handleOpenDialog(hotel) : navigate(`/hotels/${hotel.id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold">{hotel.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {roomTypeLabels[hotel.roomType]} - {formatCurrency(hotel.pricePerNight)}/night
                        </p>
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {user ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(hotel)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => duplicateMutation.mutate(hotel.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this hotel?')) {
                                  deleteMutation.mutate(hotel.id);
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
                            onClick={() => navigate(`/hotels/${hotel.id}`)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      {hotel.provinceRef.nameAtBooking && (
                        <p className="text-muted-foreground">Province: {hotel.provinceRef.nameAtBooking}</p>
                      )}
                      <p className="text-muted-foreground">Owner: {hotel.ownerName}</p>
                      <p className="text-muted-foreground">Phone: {hotel.ownerPhone}</p>
                      {hotel.address && (
                        <p className="text-muted-foreground">Address: {hotel.address}</p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </Card>

        {user && (
          <>
            <HotelDialog
              open={dialogOpen}
              onOpenChange={handleCloseDialog}
              hotel={editingHotel}
              onSubmit={editingHotel ? handleEdit : handleCreate}
            />

            <BulkImportDialog
              open={importDialogOpen}
              onOpenChange={setImportDialogOpen}
              onImport={handleBulkImport}
              parseItem={parseHotelItem}
              title="Import Hotels"
              description="Import multiple hotels. Format: Name,OwnerName,OwnerPhone,RoomType,PricePerNight,Address (roomType: single/double/group/suite)"
              placeholder="Enter hotels (one per line, format: Name,OwnerName,OwnerPhone,RoomType,PricePerNight[,Address])
Example:
Grand Hotel,John Doe,123-456-7890,suite,150000,123 Main St
Budget Inn,Jane Smith,098-765-4321,double,80000,456 Park Ave"
            />
          </>
        )}
      </div>
    </LayoutComponent>
  );
};

export default Hotels;
