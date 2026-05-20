import {
  Bed,
  Bus,
  Camera,
  Car,
  CircleDollarSign,
  Coffee,
  Droplets,
  Gift,
  Landmark,
  Luggage,
  MapPin,
  Mountain,
  Plane,
  Receipt,
  Ship,
  ShoppingBag,
  Ticket,
  Train,
  Utensils,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type TourRowIconKind = 'destination' | 'expense' | 'meal' | 'allowance' | 'shopping';

interface TourRowIconProps {
  kind: TourRowIconKind;
  label?: string;
  categoryLabel?: string;
  className?: string;
}

interface TourRowLabelProps extends TourRowIconProps {
  children?: ReactNode;
}

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

const includesAny = (text: string, keywords: string[]) =>
  keywords.some((keyword) => text.includes(keyword));

const resolveIcon = (kind: TourRowIconKind, label = '', categoryLabel = ''): LucideIcon => {
  const text = normalizeText(`${label} ${categoryLabel}`);

  if (includesAny(text, ['ngu', 'khach san', 'hotel', 'phong', 'accommodation'])) return Bed;
  if (includesAny(text, ['xe', 'oto', 'o to', 'car', 'taxi', 'grab', 'xang', 'van'])) return Car;
  if (includesAny(text, ['bus', 'coach', 'limousine'])) return Bus;
  if (includesAny(text, ['may bay', 'flight', 'plane', 'airport', 'san bay'])) return Plane;
  if (includesAny(text, ['tau hoa', 'train'])) return Train;
  if (includesAny(text, ['tau', 'thuyen', 'boat', 'ship', 'cruise', 'vinh', 'bien', 'dao'])) return Ship;
  if (includesAny(text, ['nuoc', 'water', 'khan lanh', 'khan uot'])) return Droplets;
  if (includesAny(text, ['ve', 'ticket', 'show', 'cap treo'])) return Ticket;
  if (includesAny(text, ['bao tang', 'di tich', 'den', 'chua', 'nha tho', 'landmark'])) return Landmark;
  if (includesAny(text, ['nui', 'hang', 'cave', 'mountain', 'thac'])) return Mountain;
  if (includesAny(text, ['anh', 'photo', 'camera'])) return Camera;
  if (includesAny(text, ['vali', 'hanh ly', 'luggage'])) return Luggage;
  if (includesAny(text, ['tip', 'hoa hong', 'commission', 'thuong'])) return CircleDollarSign;
  if (includesAny(text, ['qua', 'luu niem', 'souvenir', 'gift'])) return Gift;

  if (kind === 'meal') {
    if (includesAny(text, ['sang', 'coffee', 'cafe', 'ca phe'])) return Coffee;
    return Utensils;
  }

  if (kind === 'shopping') return ShoppingBag;
  if (kind === 'destination') return MapPin;
  if (kind === 'allowance') return WalletCards;

  if (includesAny(text, ['an', 'com', 'bua', 'nha hang', 'restaurant', 'meal'])) return Utensils;
  return Receipt;
};

export function TourRowIcon({ kind, label, categoryLabel, className }: TourRowIconProps) {
  const Icon = resolveIcon(kind, label, categoryLabel);

  return (
    <span
      className={cn(
        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground',
        className
      )}
      aria-hidden="true"
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}

export function TourRowLabel({ kind, label = '', categoryLabel, className, children }: TourRowLabelProps) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2 align-middle', className)}>
      <TourRowIcon kind={kind} label={label} categoryLabel={categoryLabel} />
      <span className="min-w-0">{children || label}</span>
    </span>
  );
}
