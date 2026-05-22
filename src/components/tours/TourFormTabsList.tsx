import { Calculator, DollarSign, Info, Map, Receipt, ShoppingBag, Utensils } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

type TourFormTabsListProps = {
  destinationCount: number;
  expenseCount: number;
  mealCount: number;
  shoppingCount: number;
  allowanceCount: number;
};

const CountBadge = ({ count }: { count: number }) => {
  if (count === 0) {
    return null;
  }

  return (
    <Badge variant="secondary" className="absolute -top-1 -right-1 sm:relative sm:top-0 sm:right-0 h-5 min-w-[20px] px-1 text-xs">
      {count}
    </Badge>
  );
};

export function TourFormTabsList({
  destinationCount,
  expenseCount,
  mealCount,
  shoppingCount,
  allowanceCount,
}: TourFormTabsListProps) {
  return (
    <TabsList className="grid w-full grid-cols-7 h-auto">
      <TabsTrigger value="info" className="flex-col sm:flex-row gap-1 py-2">
        <Info className="h-4 w-4" />
        <span className="hidden sm:inline">Tour Info</span>
      </TabsTrigger>
      <TabsTrigger value="destinations" className="flex-col sm:flex-row gap-1 py-2 relative">
        <Map className="h-4 w-4" />
        <span className="hidden sm:inline">Destinations</span>
        <CountBadge count={destinationCount} />
      </TabsTrigger>
      <TabsTrigger value="expenses" className="flex-col sm:flex-row gap-1 py-2 relative">
        <Receipt className="h-4 w-4" />
        <span className="hidden sm:inline">Expenses</span>
        <CountBadge count={expenseCount} />
      </TabsTrigger>
      <TabsTrigger value="meals" className="flex-col sm:flex-row gap-1 py-2 relative">
        <Utensils className="h-4 w-4" />
        <span className="hidden sm:inline">Meals</span>
        <CountBadge count={mealCount} />
      </TabsTrigger>
      <TabsTrigger value="shoppings" className="flex-col sm:flex-row gap-1 py-2 relative">
        <ShoppingBag className="h-4 w-4" />
        <span className="hidden sm:inline">Shopping</span>
        <CountBadge count={shoppingCount} />
      </TabsTrigger>
      <TabsTrigger value="allowances" className="flex-col sm:flex-row gap-1 py-2 relative">
        <DollarSign className="h-4 w-4" />
        <span className="hidden sm:inline">Allowances</span>
        <CountBadge count={allowanceCount} />
      </TabsTrigger>
      <TabsTrigger value="summary" className="flex-col sm:flex-row gap-1 py-2">
        <Calculator className="h-4 w-4" />
        <span className="hidden sm:inline">Summary</span>
      </TabsTrigger>
    </TabsList>
  );
}
