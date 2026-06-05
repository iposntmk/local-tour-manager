import { Copy, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MasterMobileCard from '@/components/master/MasterMobileCard';
import { ShareToggleButton, SharedBadge } from '@/components/master/ShareToggleButton';
import { formatDate } from '@/lib/utils';
import { t } from '@/lib/i18n';
import type { DestinationFree, Province } from '@/types/master';
import type { UserProfile } from '@/types/user';

export interface DestinationsFreeFilters {
  name: string;
  rawName: string;
  province: string;
}

interface DestinationsFreeListProps {
  destinations: DestinationFree[];
  provinces: Province[];
  filters: DestinationsFreeFilters;
  onFilterChange: (field: keyof DestinationsFreeFilters, value: string) => void;
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
  isAdmin: boolean;
  currentUserId?: string;
  profileMap: Map<string, UserProfile>;
  onOpen: (destination: DestinationFree) => void;
  onDuplicate: (id: string) => void;
  onDelete: (destination: DestinationFree) => void;
  onShareToggle: (destination: DestinationFree) => void;
}

const getCreatedByLabel = (
  destination: DestinationFree,
  profileMap: Map<string, UserProfile>,
) => {
  if (!destination.createdBy) return '-';
  const profile = profileMap.get(destination.createdBy);
  return profile?.fullName || profile?.email || destination.createdBy.slice(0, 8);
};

export function DestinationsFreeList({
  destinations,
  provinces,
  filters,
  onFilterChange,
  canEdit,
  canCreate,
  canDelete,
  isAdmin,
  currentUserId,
  profileMap,
  onOpen,
  onDuplicate,
  onDelete,
  onShareToggle,
}: DestinationsFreeListProps) {
  const rawNameLabel = 'Tên chưa chuẩn hóa';

  return (
    <>
      <div className="hidden md:block rounded-lg border">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-4 font-medium">Tên</th>
              <th className="text-left p-4 font-medium">{rawNameLabel}</th>
              <th className="text-left p-4 font-medium">Tỉnh</th>
              <th className="text-left p-4 font-medium">Cập nhật</th>
              {isAdmin && <th className="text-left p-4 font-medium">Người tạo</th>}
              <th className="text-right p-4 font-medium">Thao tác</th>
            </tr>
            <tr>
              <th className="p-2">
                <Input
                  placeholder="Lọc theo tên..."
                  value={filters.name}
                  onChange={(e) => onFilterChange('name', e.target.value)}
                  className="h-8"
                />
              </th>
              <th className="p-2">
                <Input
                  placeholder="Lọc tên chưa chuẩn hóa..."
                  value={filters.rawName}
                  onChange={(e) => onFilterChange('rawName', e.target.value)}
                  className="h-8"
                />
              </th>
              <th className="p-2">
                <Select
                  value={filters.province}
                  onValueChange={(value) => onFilterChange('province', value)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Tất cả tỉnh" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    {provinces.map((province) => (
                      <SelectItem key={province.id} value={province.name}>
                        {province.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </th>
              <th className="p-2"></th>
              <th className="p-2"></th>
              {isAdmin && <th className="p-2"></th>}
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {destinations.map((destination) => (
              <tr
                key={destination.id}
                className="border-t hover:bg-muted/50 cursor-pointer"
                onClick={() => canEdit && onOpen(destination)}
              >
                <td className="p-4 font-medium">
                  <div className="flex items-center gap-2">
                    {destination.name}
                    <SharedBadge isShared={!!destination.isShared} />
                  </div>
                </td>
                <td className="p-4 text-muted-foreground">{destination.rawName || '-'}</td>
                <td className="p-4 text-muted-foreground">{destination.provinceRef.nameAtBooking}</td>
                <td className="p-4 text-muted-foreground text-sm">
                  {formatDate(destination.updatedAt.split('T')[0])}
                </td>
                {isAdmin && (
                  <td className="p-4 text-sm text-muted-foreground">
                    {getCreatedByLabel(destination, profileMap)}
                  </td>
                )}
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    {isAdmin && destination.createdBy === currentUserId && (
                      <ShareToggleButton
                        isShared={!!destination.isShared}
                        onToggle={() => onShareToggle(destination)}
                      />
                    )}
                    {canEdit && (
                      <Button variant="ghost" size="sm" onClick={() => onOpen(destination)} className="h-8 w-8 p-0">
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canCreate && (
                      <Button variant="ghost" size="sm" onClick={() => onDuplicate(destination.id)} className="h-8 w-8 p-0">
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="sm" onClick={() => onDelete(destination)} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-2 md:space-y-3">
        {destinations.map((destination) => (
          <MasterMobileCard
            key={destination.id}
            title={destination.name}
            id={destination.id}
            subtitle={`Cập nhật ${formatDate(destination.updatedAt.split('T')[0])}`}
            metadata={`${destination.provinceRef.nameAtBooking}`}
            onClick={() => canEdit && onOpen(destination)}
            onEdit={canEdit ? () => onOpen(destination) : undefined}
            onDuplicate={canCreate ? () => onDuplicate(destination.id) : undefined}
            onDelete={canDelete ? () => onDelete(destination) : undefined}
            canEdit={canEdit}
            canCreate={canCreate}
            canDelete={canDelete}
          >
            {destination.rawName && (
              <div>{rawNameLabel}: {destination.rawName}</div>
            )}
          </MasterMobileCard>
        ))}
      </div>
    </>
  );
}
