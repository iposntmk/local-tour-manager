import { useEffect, useMemo, useState, useRef } from 'react';
import Fuse from 'fuse.js';
import type { Tour, EntityRef } from '@/types/tour';
import type { Company, Guide, Nationality, TouristDestination, DetailedExpense, Shopping, Province } from '@/types/master';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Search, Check, X, Plus, Trash2, AlertCircle, MapPin, Receipt, Utensils, DollarSign, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CompanyDialog } from '@/components/companies/CompanyDialog';
import { GuideDialog } from '@/components/guides/GuideDialog';
import { NationalityDialog } from '@/components/nationalities/NationalityDialog';
import { DestinationDialog } from '@/components/destinations/DestinationDialog';
import { DetailedExpenseDialog } from '@/components/detailed-expenses/DetailedExpenseDialog';
import { ShoppingDialog } from '@/components/shopping/ShoppingDialog';

export interface ReviewItem {
  tour: Partial<Tour>;
  raw: {
    company: string;
    guide: string;
    nationality: string;
    destinations?: any[];
    expenses?: any[];
    meals?: any[];
    allowances?: any[];
    summary?: any;
  };
}

interface EnhancedImportReviewProps {
  items: ReviewItem[];
  onCancel: () => void;
  onConfirm: (tours: Partial<Tour>[]) => void;
  preloadedEntities?: {
    companies: Company[];
    guides: Guide[];
    nationalities: Nationality[];
  };
}

interface SearchableEntity {
  id: string;
  name: string;
  type: 'company' | 'guide' | 'nationality';
}

// Subcollection Section Component
interface SubcollectionSectionProps {
  title: string;
  icon: React.ReactNode;
  items: any[];
  tourIndex: number;
  sectionKey: string;
  onUpdate: (index: number, field: string, value: any) => void;
  onRemove: (index: number) => void;
  matchFunction: ((name: string) => any) | null;
  matchType: string;
  masterData?: any[];
  rawData?: any[];
}

function SubcollectionSection({
  title,
  icon,
  items,
  tourIndex,
  sectionKey,
  onUpdate,
  onRemove,
  matchFunction,
  matchType,
  masterData = [],
  rawData = []
}: SubcollectionSectionProps) {
  const [openCombobox, setOpenCombobox] = useState<{ [key: number]: boolean }>({});

  const renderItem = (item: any, index: number) => {
    if (matchType === 'summary') {
      const rawItem = rawData && rawData[index];

      return (
        <div key={index} className="border rounded-lg p-4 bg-gray-50">
          <div className="grid grid-cols-2 gap-4">
            {/* Read-only field */}
            <div>
              <Label className="text-xs font-medium">
                Total Tabs
                {rawItem?.totalTabs !== undefined && (
                  <span className="text-xs text-muted-foreground ml-1">
                    (JSON: {rawItem.totalTabs})
                  </span>
                )}
              </Label>
              <Input
                type="number"
                value={item.totalTabs || 0}
                readOnly
                className="h-8 text-sm mt-1 bg-gray-100 cursor-not-allowed"
              />
            </div>

            {/* Editable field */}
            <div>
              <Label className="text-xs font-medium">
                Advance Payment
                {rawItem?.advancePayment !== undefined && (
                  <span className="text-xs text-muted-foreground ml-1">
                    (JSON: {rawItem.advancePayment})
                  </span>
                )}
              </Label>
              <Input
                type="number"
                value={item.advancePayment || 0}
                onChange={(e) => onUpdate(index, 'advancePayment', parseFloat(e.target.value) || 0)}
                className="h-8 text-sm mt-1"
              />
            </div>

            {/* Editable field */}
            <div>
              <Label className="text-xs font-medium">
                Total After Advance
                {rawItem?.totalAfterAdvance !== undefined && (
                  <span className="text-xs text-muted-foreground ml-1">
                    (JSON: {rawItem.totalAfterAdvance})
                  </span>
                )}
              </Label>
              <Input
                type="number"
                value={item.totalAfterAdvance || 0}
                onChange={(e) => onUpdate(index, 'totalAfterAdvance', parseFloat(e.target.value) || 0)}
                className="h-8 text-sm mt-1"
              />
            </div>

            {/* Editable field */}
            <div>
              <Label className="text-xs font-medium">
                Company Tip
                {rawItem?.companyTip !== undefined && (
                  <span className="text-xs text-muted-foreground ml-1">
                    (JSON: {rawItem.companyTip})
                  </span>
                )}
              </Label>
              <Input
                type="number"
                value={item.companyTip || 0}
                onChange={(e) => onUpdate(index, 'companyTip', parseFloat(e.target.value) || 0)}
                className="h-8 text-sm mt-1"
              />
            </div>

            {/* Read-only field */}
            <div>
              <Label className="text-xs font-medium">
                Total After Tip
                {rawItem?.totalAfterTip !== undefined && (
                  <span className="text-xs text-muted-foreground ml-1">
                    (JSON: {rawItem.totalAfterTip})
                  </span>
                )}
              </Label>
              <Input
                type="number"
                value={item.totalAfterTip || 0}
                readOnly
                className="h-8 text-sm mt-1 bg-gray-100 cursor-not-allowed"
              />
            </div>

            {/* Read-only field */}
            <div>
              <Label className="text-xs font-medium">
                Collections For Company
                {rawItem?.collectionsForCompany !== undefined && (
                  <span className="text-xs text-muted-foreground ml-1">
                    (JSON: {rawItem.collectionsForCompany})
                  </span>
                )}
              </Label>
              <Input
                type="number"
                value={item.collectionsForCompany || 0}
                readOnly
                className="h-8 text-sm mt-1 bg-gray-100 cursor-not-allowed"
              />
            </div>

            {/* Read-only field */}
            <div>
              <Label className="text-xs font-medium">
                Total After Collections
                {rawItem?.totalAfterCollections !== undefined && (
                  <span className="text-xs text-muted-foreground ml-1">
                    (JSON: {rawItem.totalAfterCollections})
                  </span>
                )}
              </Label>
              <Input
                type="number"
                value={item.totalAfterCollections || 0}
                readOnly
                className="h-8 text-sm mt-1 bg-gray-100 cursor-not-allowed"
              />
            </div>

            {/* Read-only field */}
            <div>
              <Label className="text-xs font-medium">
                Final Total
                {rawItem?.finalTotal !== undefined && (
                  <span className="text-xs text-muted-foreground ml-1">
                    (JSON: {rawItem.finalTotal})
                  </span>
                )}
              </Label>
              <Input
                type="number"
                value={item.finalTotal || 0}
                readOnly
                className="h-8 text-sm mt-1 bg-gray-100 cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      );
    }

    const matchedItem = matchFunction && item.name ? matchFunction(item.name) : null;
    const hasMatch = matchedItem !== null;
    const rawItem = rawData && rawData[index];

    // For destinations, use combobox with master data
    const useCombobox = matchType === 'destination' && masterData.length > 0;

    return (
      <div key={index} className="p-3 bg-gray-50 rounded-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {matchType} {index + 1}
            </Badge>
            {hasMatch && (
              <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                <Check className="h-3 w-3 mr-1" />
                Matched
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRemove(index)}
            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">
              Name
              {rawItem?.name && (
                <span className="text-xs text-muted-foreground ml-1">
                  (JSON: "{rawItem.name}")
                </span>
              )}
            </Label>
            {useCombobox ? (
              <Popover open={openCombobox[index]} onOpenChange={(open) => setOpenCombobox({ ...openCombobox, [index]: open })}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombobox[index]}
                    className="h-7 justify-between text-xs w-full"
                  >
                    {item.name || "Select..."}
                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search..." className="h-7 text-xs" />
                    <CommandList>
                      <CommandEmpty>No item found.</CommandEmpty>
                      <CommandGroup>
                        {masterData.map((dest: any) => (
                          <CommandItem
                            key={dest.id}
                            value={dest.name}
                            onSelect={() => {
                              onUpdate(index, 'name', dest.name);
                              onUpdate(index, 'price', dest.price);
                              setOpenCombobox({ ...openCombobox, [index]: false });
                            }}
                            className="text-xs"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-3 w-3",
                                item.name === dest.name ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {dest.name} ({dest.price?.toLocaleString()} ₫)
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            ) : (
              <Input
                value={item.name || ''}
                onChange={(e) => onUpdate(index, 'name', e.target.value)}
                className="h-7 text-xs"
              />
            )}
          </div>
          <div>
            <Label className="text-xs">
              Price
              {rawItem?.price !== undefined && (
                <span className="text-xs text-muted-foreground ml-1">
                  (JSON: {rawItem.price})
                </span>
              )}
            </Label>
            <Input
              type="number"
              value={item.price || 0}
              onChange={(e) => onUpdate(index, 'price', parseFloat(e.target.value) || 0)}
              className="h-7 text-xs"
            />
          </div>
          {matchType !== 'allowance' && (
            <div className="col-span-2">
              <Label className="text-xs">
                Date
                {rawItem?.date && (
                  <span className="text-xs text-muted-foreground ml-1">
                    (JSON: "{rawItem.date}")
                  </span>
                )}
              </Label>
              <Input
                type="date"
                value={item.date || ''}
                onChange={(e) => onUpdate(index, 'date', e.target.value)}
                className="h-7 text-xs"
              />
            </div>
          )}
        </div>

        {hasMatch && (
          <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-700">
            <div className="flex items-center justify-between">
              <div>
                <strong>Matched:</strong> {matchedItem.name} (Price: {matchedItem.price})
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Apply matched data to the item
                  onUpdate(index, 'price', matchedItem.price);
                  if (matchedItem.id) {
                    onUpdate(index, 'id', matchedItem.id);
                  }
                }}
                className="h-5 px-2 text-xs bg-green-100 hover:bg-green-200"
              >
                Apply Match
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTableRow = (item: any, index: number) => {
    const matchedItem = matchFunction && item.name ? matchFunction(item.name) : null;
    const hasMatch = matchedItem !== null;
    const rawItem = rawData && rawData[index];
    const useCombobox = (matchType === 'destination' || matchType === 'expense' || matchType === 'meal' || matchType === 'allowance') && masterData.length > 0;

    // Render allowance row with Name/Price/Date structure (same as expenses)
    if (matchType === 'allowance') {
      const matchedAllowance = matchFunction ? matchFunction(item.name) : null;
      const hasAllowanceMatch = matchedAllowance !== null;

      return (
        <TableRow key={index}>
          <TableCell className="text-xs font-medium">{index + 1}</TableCell>
          <TableCell className="text-xs">
            <div className="space-y-1">
              {useCombobox ? (
                <Popover open={openCombobox[index]} onOpenChange={(open) => setOpenCombobox({ ...openCombobox, [index]: open })}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCombobox[index]}
                      className={cn(
                        "h-7 justify-between text-xs w-full",
                        hasAllowanceMatch ? "border-green-500 bg-green-50" : "border-yellow-500 bg-yellow-50"
                      )}
                    >
                      {item.name || "Select allowance..."}
                      <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search allowance..." className="h-7 text-xs" />
                      <CommandList>
                        <CommandEmpty>No allowance found.</CommandEmpty>
                        <CommandGroup>
                          {masterData.map((allowance: any) => (
                            <CommandItem
                              key={allowance.id}
                              value={allowance.name}
                              onSelect={() => {
                                onUpdate(index, 'name', allowance.name);
                                onUpdate(index, 'price', allowance.price);
                                setOpenCombobox({ ...openCombobox, [index]: false });
                              }}
                              className="text-xs"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-3 w-3",
                                  item.name === allowance.name ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {allowance.name} ({allowance.price.toLocaleString()} ₫)
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              ) : (
                <Input
                  value={item.name || ''}
                  onChange={(e) => onUpdate(index, 'name', e.target.value)}
                  className={cn(
                    "h-7 text-xs",
                    hasAllowanceMatch ? "border-green-500 bg-green-50" : "border-yellow-500 bg-yellow-50"
                  )}
                />
              )}
              {rawItem?.name && (
                <div className="text-xs text-muted-foreground">JSON: "{rawItem.name}"</div>
              )}
              {hasAllowanceMatch && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <Check className="h-3 w-3" />
                  Matched: {matchedAllowance.name}
                </div>
              )}
            </div>
          </TableCell>
          <TableCell className="text-xs">
            <div className="space-y-1">
              <Input
                type="number"
                value={item.price || 0}
                onChange={(e) => onUpdate(index, 'price', parseFloat(e.target.value) || 0)}
                className="h-7 text-xs"
              />
              {rawItem?.price !== undefined && (
                <div className="text-xs text-muted-foreground">JSON: {rawItem.price}</div>
              )}
            </div>
          </TableCell>
          <TableCell className="text-xs">
            <div className="space-y-1">
              <Input
                type="date"
                value={item.date || ''}
                onChange={(e) => onUpdate(index, 'date', e.target.value)}
                className="h-7 text-xs"
              />
              {rawItem?.date && (
                <div className="text-xs text-muted-foreground">JSON: "{rawItem.date}"</div>
              )}
            </div>
          </TableCell>
          <TableCell className="text-right">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRemove(index)}
              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </TableCell>
        </TableRow>
      );
    }

    // Render normal row for destinations, expenses, meals
    return (
      <TableRow key={index}>
        <TableCell className="text-xs font-medium">{index + 1}</TableCell>
        <TableCell className="text-xs">
          <div className="space-y-1">
            {useCombobox ? (
              <Popover open={openCombobox[index]} onOpenChange={(open) => setOpenCombobox({ ...openCombobox, [index]: open })}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombobox[index]}
                    className={cn(
                      "h-7 justify-between text-xs w-full",
                      hasMatch ? "border-green-500 bg-green-50" : "border-yellow-500 bg-yellow-50"
                    )}
                  >
                    {item.name || "Select..."}
                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search..." className="h-7 text-xs" />
                    <CommandList>
                      <CommandEmpty>No item found.</CommandEmpty>
                      <CommandGroup>
                        {masterData.map((dest: any) => (
                          <CommandItem
                            key={dest.id}
                            value={dest.name}
                            onSelect={() => {
                              onUpdate(index, 'name', dest.name);
                              onUpdate(index, 'price', dest.price);
                              setOpenCombobox({ ...openCombobox, [index]: false });
                            }}
                            className="text-xs"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-3 w-3",
                                item.name === dest.name ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {dest.name} ({dest.price?.toLocaleString()} ₫)
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            ) : (
              <Input
                value={item.name || ''}
                onChange={(e) => onUpdate(index, 'name', e.target.value)}
                className={cn(
                  "h-7 text-xs",
                  hasMatch ? "border-green-500 bg-green-50" : "border-yellow-500 bg-yellow-50"
                )}
              />
            )}
            {rawItem?.name && (
              <div className="text-xs text-muted-foreground">JSON: "{rawItem.name}"</div>
            )}
            {hasMatch && (
              <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                <Check className="h-3 w-3 mr-1" />
                Matched: {matchedItem.name}
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="text-xs">
          <div className="space-y-1">
            <Input
              type="number"
              value={item.price || 0}
              onChange={(e) => onUpdate(index, 'price', parseFloat(e.target.value) || 0)}
              className="h-7 text-xs"
            />
            {rawItem?.price !== undefined && (
              <div className="text-xs text-muted-foreground">JSON: {rawItem.price}</div>
            )}
            {hasMatch && matchedItem.price && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                Master: {matchedItem.price.toLocaleString()} ₫
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="text-xs">
          <div className="space-y-1">
            <Input
              type="date"
              value={item.date || ''}
              onChange={(e) => onUpdate(index, 'date', e.target.value)}
              className="h-7 text-xs"
            />
            {rawItem?.date && (
              <div className="text-xs text-muted-foreground">JSON: "{rawItem.date}"</div>
            )}
          </div>
        </TableCell>
        <TableCell className="text-right">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRemove(index)}
            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div>
      {items.length === 0 ? (
        <div className="text-sm text-gray-500 text-center py-8 border rounded-lg">
          No {title.toLowerCase()} found
        </div>
      ) : matchType === 'summary' ? (
        <div className="space-y-2">
          {items.map((item, index) => renderItem(item, index))}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px] text-xs">#</TableHead>
                <TableHead className="text-xs">Name / JSON</TableHead>
                <TableHead className="text-xs">Price / JSON</TableHead>
                <TableHead className="text-xs">Date / JSON</TableHead>
                <TableHead className="text-xs w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => renderTableRow(item, index))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export function EnhancedImportReview({ items, onCancel, onConfirm, preloadedEntities }: EnhancedImportReviewProps) {
  const [companies, setCompanies] = useState<Company[]>(preloadedEntities?.companies ?? []);
  const [guides, setGuides] = useState<Guide[]>(preloadedEntities?.guides ?? []);
  const [nationalities, setNationalities] = useState<Nationality[]>(preloadedEntities?.nationalities ?? []);
  const [destinations, setDestinations] = useState<TouristDestination[]>([]);
  const [expenses, setExpenses] = useState<DetailedExpense[]>([]);
  const [shoppings, setShoppings] = useState<Shopping[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [ctpAllowances, setCtpAllowances] = useState<DetailedExpense[]>([]);
  const [draft, setDraft] = useState<ReviewItem[]>(items);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [openCompanyDialog, setOpenCompanyDialog] = useState(false);
  const [openGuideDialog, setOpenGuideDialog] = useState(false);
  const [openNationalityDialog, setOpenNationalityDialog] = useState(false);
  const [openDestinationDialog, setOpenDestinationDialog] = useState(false);
  const [openExpenseDialog, setOpenExpenseDialog] = useState(false);
  const [openShoppingDialog, setOpenShoppingDialog] = useState(false);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [initialEntityName, setInitialEntityName] = useState<string>('');
  const [targetItemIndex, setTargetItemIndex] = useState<number | null>(null);

  // Remove virtualization - let cards auto-size
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Cache Fuse instances to avoid recreation on every search
  const fuseInstancesRef = useRef<{
    destinations?: Fuse<TouristDestination>;
    expenses?: Fuse<DetailedExpense>;
    shoppings?: Fuse<Shopping>;
    allowances?: Fuse<DetailedExpense>;
  }>({});

  // Load all entities - optimized with caching
  useEffect(() => {
    const load = async () => {
      try {
        // Use preloaded entities if available to avoid redundant API calls
        const [c, g, n, d, e, s, p] = await Promise.all([
          preloadedEntities?.companies ? Promise.resolve(preloadedEntities.companies) : store.listCompanies({}),
          preloadedEntities?.guides ? Promise.resolve(preloadedEntities.guides) : store.listGuides({}),
          preloadedEntities?.nationalities ? Promise.resolve(preloadedEntities.nationalities) : store.listNationalities({}),
          store.listTouristDestinations({}),
          store.listDetailedExpenses({}),
          store.listShoppings({}),
          store.listProvinces({}),
        ]);
        setCompanies(c);
        setGuides(g);
        setNationalities(n);
        setDestinations(d);
        setExpenses(e);
        setShoppings(s);
        setProvinces(p);

        // Filter expenses for CTP category only (for allowances)
        const ctpExpenses = e.filter(exp => exp.categoryRef?.nameAtBooking === 'CTP');
        setCtpAllowances(ctpExpenses);

        // Create Fuse instances once and cache them
        fuseInstancesRef.current = {
          destinations: new Fuse(d, {
            keys: ['name'],
            threshold: 0.5,
            includeScore: true,
            ignoreLocation: true,
          }),
          expenses: new Fuse(e, {
            keys: ['name'],
            threshold: 0.5,
            includeScore: true,
            ignoreLocation: true,
          }),
          shoppings: new Fuse(e, {
            keys: ['name'],
            threshold: 0.5,
            includeScore: true,
            ignoreLocation: true,
          }),
          allowances: new Fuse(ctpExpenses, {
            keys: ['name'],
            threshold: 0.5,
            includeScore: true,
            ignoreLocation: true,
          }),
        };

        // Helper functions for matching using cached Fuse instances
        const matchDestinationLocal = (destinationName: string) => {
          if (!destinationName.trim() || !fuseInstancesRef.current.destinations) return null;
          const matches = fuseInstancesRef.current.destinations.search(destinationName);
          return matches.length > 0 && matches[0].score && matches[0].score < 0.5 ? matches[0].item : null;
        };

        const matchExpenseLocal = (expenseName: string) => {
          if (!expenseName.trim() || !fuseInstancesRef.current.expenses) return null;
          const matches = fuseInstancesRef.current.expenses.search(expenseName);
          return matches.length > 0 && matches[0].score && matches[0].score < 0.5 ? matches[0].item : null;
        };

        const matchShoppingLocal = (shoppingName: string) => {
          if (!shoppingName.trim() || !fuseInstancesRef.current.shoppings) return null;
          const matches = fuseInstancesRef.current.shoppings.search(shoppingName);
          return matches.length > 0 && matches[0].score && matches[0].score < 0.5 ? matches[0].item : null;
        };

        const matchAllowanceLocal = (allowanceName: string) => {
          if (!allowanceName || !allowanceName.trim() || !fuseInstancesRef.current.allowances) return null;
          const matches = fuseInstancesRef.current.allowances.search(allowanceName);
          return matches.length > 0 && matches[0].score && matches[0].score < 0.5 ? matches[0].item : null;
        };

        // Auto-match using fuzzy search
        const updatedDraft = items.map(item => {
          const tour = { ...item.tour };
          const raw = { ...item.raw };

          // Store raw destinations data before matching
          if (tour.destinations && !raw.destinations) {
            raw.destinations = tour.destinations.map(d => ({ ...d }));
          }

          // Store raw expenses data before matching
          if (tour.expenses && !raw.expenses) {
            raw.expenses = tour.expenses.map(e => ({ ...e }));
          }

          // Store raw meals data before matching
          if (tour.meals && !raw.meals) {
            raw.meals = tour.meals.map(m => ({ ...m }));
          }

          // Store raw allowances data before matching
          if (tour.allowances && !raw.allowances) {
            raw.allowances = tour.allowances.map(a => ({ ...a }));
          }

          // Store raw summary data before matching
          if (tour.summary && !raw.summary) {
            raw.summary = { ...tour.summary };
          }

          // Fuzzy match company
          if (item.raw.company && !tour.companyRef?.id) {
            const companyFuse = new Fuse(c, {
              keys: ['name'],
              threshold: 0.5,
              includeScore: true,
              ignoreLocation: true,
            });
            const companyMatch = companyFuse.search(item.raw.company);
            if (companyMatch.length > 0 && companyMatch[0].score && companyMatch[0].score < 0.5) {
              const matched = companyMatch[0].item;
              tour.companyRef = { id: matched.id, nameAtBooking: matched.name };
            }
          }

          // Fuzzy match guide
          if (item.raw.guide && !tour.guideRef?.id) {
            const guideFuse = new Fuse(g, {
              keys: ['name'],
              threshold: 0.5,
              includeScore: true,
              ignoreLocation: true,
            });
            const guideMatch = guideFuse.search(item.raw.guide);
            if (guideMatch.length > 0 && guideMatch[0].score && guideMatch[0].score < 0.5) {
              const matched = guideMatch[0].item;
              tour.guideRef = { id: matched.id, nameAtBooking: matched.name };
            }
          }

          // Fuzzy match nationality - if multiple nationalities, take only the first one
          if (item.raw.nationality && !tour.clientNationalityRef?.id) {
            // Extract first nationality if there are multiple (separated by comma, slash, or other delimiters)
            let nationalityToMatch = item.raw.nationality;
            const separators = [',', '/', '-', '&', 'and'];
            for (const sep of separators) {
              if (nationalityToMatch.includes(sep)) {
                nationalityToMatch = nationalityToMatch.split(sep)[0].trim();
                break;
              }
            }

            const nationalityFuse = new Fuse(n, {
              keys: ['name', 'iso2'],
              threshold: 0.5,
              includeScore: true,
              ignoreLocation: true,
            });
            const nationalityMatch = nationalityFuse.search(nationalityToMatch);
            if (nationalityMatch.length > 0 && nationalityMatch[0].score && nationalityMatch[0].score < 0.5) {
              const matched = nationalityMatch[0].item;
              tour.clientNationalityRef = { id: matched.id, nameAtBooking: matched.name };
            }
          }

          // Fuzzy match destinations - auto-apply matched values including price
          if (tour.destinations && tour.destinations.length > 0) {
            tour.destinations = tour.destinations.map(dest => {
              if (!dest.name) return dest;
              const matched = matchDestinationLocal(dest.name);
              if (matched) {
                console.log('Matched destination:', dest.name, '-> Master:', matched.name, 'Price:', matched.price);
                // Auto-apply matched name and price from master data
                return {
                  ...dest,
                  name: matched.name,
                  price: matched.price || dest.price || 0, // Always use master data price when matched
                  matchedId: matched.id,
                  matchedPrice: matched.price
                };
              }
              return dest;
            });
          }

          // Fuzzy match expenses - auto-apply matched values
          if (tour.expenses && tour.expenses.length > 0) {
            tour.expenses = tour.expenses.map(exp => {
              if (!exp.name) return exp;
              const matched = matchExpenseLocal(exp.name);
              if (matched) {
                return {
                  ...exp,
                  name: matched.name,
                  price: matched.price,
                  matchedId: matched.id,
                  matchedPrice: matched.price
                };
              }
              return exp;
            });
          }

          // Fuzzy match meals - auto-apply matched values (using detailed expenses)
          if (tour.meals && tour.meals.length > 0) {
            tour.meals = tour.meals.map(meal => {
              if (!meal.name) return meal;
              const matched = matchExpenseLocal(meal.name);
              if (matched) {
                return {
                  ...meal,
                  name: matched.name,
                  price: matched.price,
                  matchedId: matched.id,
                  matchedPrice: matched.price
                };
              }
              return meal;
            });
          }

          // Fuzzy match allowances - auto-apply matched values (using CTP detailed expenses)
          if (tour.allowances && tour.allowances.length > 0) {
            tour.allowances = tour.allowances.map(allowance => {
              if (!allowance.name) return allowance;
              const matched = matchAllowanceLocal(allowance.name);
              if (matched) {
                console.log('Matched allowance:', allowance.name, '-> Master:', matched.name, 'Price:', matched.price);
                return {
                  ...allowance,
                  name: matched.name,
                  price: matched.price,
                  matchedId: matched.id,
                  matchedPrice: matched.price
                };
              }
              return allowance;
            });
          }

          return { ...item, tour, raw };
        });

        setDraft(updatedDraft);
      } catch (error) {
        console.error('Failed to load entities:', error);
        toast.error('Failed to load master data');
      }
    };

    load();
  }, [items, preloadedEntities]);

  // Validation - only show warnings, not block import
  const validationWarnings = useMemo(() => {
    const warnings: { [key: number]: string[] } = {};
    
    draft.forEach((item, index) => {
      const tourWarnings: string[] = [];
      const tour = item.tour;
      const raw = item.raw;

      if (!tour.tourCode) tourWarnings.push('Tour code is missing');
      if (!tour.clientName) tourWarnings.push('Client name is missing');
      if (!tour.startDate) tourWarnings.push('Start date is missing');
      if (!tour.endDate) tourWarnings.push('End date is missing');
      if (!tour.companyRef?.id) {
        tourWarnings.push(`Company is not selected (JSON value: "${raw.company}")`);
      }
      if (!tour.guideRef?.id) {
        tourWarnings.push(`Guide is not selected (JSON value: "${raw.guide}")`);
      }
      if (!tour.clientNationalityRef?.id) {
        tourWarnings.push(`Nationality is not selected (JSON value: "${raw.nationality}")`);
      }

      if (tourWarnings.length > 0) {
        warnings[index] = tourWarnings;
      }
    });
    
    return warnings;
  }, [draft]);

  // Filter tours based on search query and sort by warnings
  const filteredTours = useMemo(() => {
    let tours = draft;

    if (searchQuery.trim()) {
      const fuse = new Fuse(draft, {
        keys: [
          'tour.tourCode',
          'tour.clientName',
          'tour.companyRef.nameAtBooking',
          'tour.guideRef.nameAtBooking',
          'tour.clientNationalityRef.nameAtBooking',
          'raw.company',
          'raw.guide',
          'raw.nationality',
          'tour.destinations.name',
          'tour.expenses.name',
          'tour.meals.name'
        ],
        threshold: 0.5,
        includeScore: true,
      });

      tours = fuse.search(searchQuery).map(result => result.item);
    }

    // Sort: tours with unmatched fields first
    return tours.sort((a, b) => {
      const aIndex = draft.findIndex(d => d === a);
      const bIndex = draft.findIndex(d => d === b);

      const aHasWarnings = validationWarnings[aIndex]?.length > 0;
      const bHasWarnings = validationWarnings[bIndex]?.length > 0;

      if (aHasWarnings && !bHasWarnings) return -1;
      if (!aHasWarnings && bHasWarnings) return 1;
      return aIndex - bIndex; // Maintain original order for same warning status
    });
  }, [draft, searchQuery, validationWarnings]);

  // Final validation for import
  const validateForImport = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    draft.forEach((item, index) => {
      const tour = item.tour;
      const tourName = tour.tourCode || `Tour ${index + 1}`;
      
      if (!tour.tourCode) errors.push(`${tourName}: Tour code is required`);
      if (!tour.clientName) errors.push(`${tourName}: Client name is required`);
      if (!tour.startDate) errors.push(`${tourName}: Start date is required`);
      if (!tour.endDate) errors.push(`${tourName}: End date is required`);
      if (!tour.companyRef?.id) errors.push(`${tourName}: Company is required`);
      if (!tour.guideRef?.id) errors.push(`${tourName}: Guide is required`);
      if (!tour.clientNationalityRef?.id) errors.push(`${tourName}: Nationality is required`);
    });
    
    return { valid: errors.length === 0, errors };
  };

  // Entity search functions
  const searchEntities = (query: string, type: 'company' | 'guide' | 'nationality') => {
    if (!query.trim()) return [];
    
    let entities: SearchableEntity[] = [];
    if (type === 'company') {
      entities = companies.map(c => ({ id: c.id, name: c.name, type: 'company' as const }));
    } else if (type === 'guide') {
      entities = guides.map(g => ({ id: g.id, name: g.name, type: 'guide' as const }));
    } else {
      entities = nationalities.map(n => ({ id: n.id, name: n.name, type: 'nationality' as const }));
    }
    
    const fuse = new Fuse(entities, {
      keys: ['name'],
      threshold: 0.5,
      includeScore: true,
    });

    return fuse.search(query).map(result => result.item);
  };

  // Fuse.js matching for subcollections - use cached instances
  const matchDestination = (destinationName: string) => {
    if (!destinationName.trim() || !fuseInstancesRef.current.destinations) return null;
    const matches = fuseInstancesRef.current.destinations.search(destinationName);
    return matches.length > 0 && matches[0].score && matches[0].score < 0.5 ? matches[0].item : null;
  };

  const matchExpense = (expenseName: string) => {
    if (!expenseName.trim() || !fuseInstancesRef.current.expenses) return null;
    const matches = fuseInstancesRef.current.expenses.search(expenseName);
    return matches.length > 0 && matches[0].score && matches[0].score < 0.5 ? matches[0].item : null;
  };

  const matchShopping = (shoppingName: string) => {
    if (!shoppingName.trim() || !fuseInstancesRef.current.shoppings) return null;
    const matches = fuseInstancesRef.current.shoppings.search(shoppingName);
    return matches.length > 0 && matches[0].score && matches[0].score < 0.5 ? matches[0].item : null;
  };

  const matchAllowance = (allowanceName: string) => {
    if (!allowanceName || !allowanceName.trim() || !fuseInstancesRef.current.allowances) return null;
    const matches = fuseInstancesRef.current.allowances.search(allowanceName);
    return matches.length > 0 && matches[0].score && matches[0].score < 0.5 ? matches[0].item : null;
  };

  // Update subcollection items
  const updateDestination = (tourIndex: number, destIndex: number, field: string, value: any) => {
    setDraft(prev => prev.map((item, i) => {
      if (i === tourIndex) {
        const destinations = [...(item.tour.destinations || [])];
        destinations[destIndex] = { ...destinations[destIndex], [field]: value };
        return { ...item, tour: { ...item.tour, destinations } };
      }
      return item;
    }));
  };

  const updateExpense = (tourIndex: number, expIndex: number, field: string, value: any) => {
    setDraft(prev => prev.map((item, i) => {
      if (i === tourIndex) {
        const expenses = [...(item.tour.expenses || [])];
        expenses[expIndex] = { ...expenses[expIndex], [field]: value };
        return { ...item, tour: { ...item.tour, expenses } };
      }
      return item;
    }));
  };

  const updateMeal = (tourIndex: number, mealIndex: number, field: string, value: any) => {
    setDraft(prev => prev.map((item, i) => {
      if (i === tourIndex) {
        const meals = [...(item.tour.meals || [])];
        meals[mealIndex] = { ...meals[mealIndex], [field]: value };
        return { ...item, tour: { ...item.tour, meals } };
      }
      return item;
    }));
  };

  const updateAllowance = (tourIndex: number, allowIndex: number, field: string, value: any) => {
    setDraft(prev => prev.map((item, i) => {
      if (i === tourIndex) {
        const allowances = [...(item.tour.allowances || [])];
        allowances[allowIndex] = { ...allowances[allowIndex], [field]: value };
        return { ...item, tour: { ...item.tour, allowances } };
      }
      return item;
    }));
  };

  const removeDestination = (tourIndex: number, destIndex: number) => {
    setDraft(prev => prev.map((item, i) => {
      if (i === tourIndex) {
        const destinations = [...(item.tour.destinations || [])];
        destinations.splice(destIndex, 1);
        return { ...item, tour: { ...item.tour, destinations } };
      }
      return item;
    }));
  };

  const removeExpense = (tourIndex: number, expIndex: number) => {
    setDraft(prev => prev.map((item, i) => {
      if (i === tourIndex) {
        const expenses = [...(item.tour.expenses || [])];
        expenses.splice(expIndex, 1);
        return { ...item, tour: { ...item.tour, expenses } };
      }
      return item;
    }));
  };

  const removeMeal = (tourIndex: number, mealIndex: number) => {
    setDraft(prev => prev.map((item, i) => {
      if (i === tourIndex) {
        const meals = [...(item.tour.meals || [])];
        meals.splice(mealIndex, 1);
        return { ...item, tour: { ...item.tour, meals } };
      }
      return item;
    }));
  };

  const removeAllowance = (tourIndex: number, allowIndex: number) => {
    setDraft(prev => prev.map((item, i) => {
      if (i === tourIndex) {
        const allowances = [...(item.tour.allowances || [])];
        allowances.splice(allowIndex, 1);
        return { ...item, tour: { ...item.tour, allowances } };
      }
      return item;
    }));
  };

  // Update tour field
  const updateTourField = (index: number, field: string, value: any) => {
    setDraft(prev => prev.map((item, i) => 
      i === index 
        ? { ...item, tour: { ...item.tour, [field]: value } }
        : item
    ));
  };

  // Update entity reference
  const updateEntityRef = (index: number, entityType: 'companyRef' | 'guideRef' | 'clientNationalityRef', entity: any) => {
    setDraft(prev => prev.map((item, i) => 
      i === index 
        ? { 
            ...item, 
            tour: { 
              ...item.tour, 
              [entityType]: { id: entity.id, nameAtBooking: entity.name }
            }
          }
        : item
    ));
  };

  // Remove tour
  const removeTour = (index: number) => {
    setDraft(prev => prev.filter((_, i) => i !== index));
  };

  // Create new entity handlers
  const handleCreateCompany = async (data: any) => {
    try {
      const newCompany = await store.createCompany(data);
      setCompanies(prev => [...prev, newCompany]);
      toast.success('Company created successfully');
      setOpenCompanyDialog(false);
    } catch (error) {
      toast.error('Failed to create company');
    }
  };

  const handleCreateGuide = async (data: any) => {
    try {
      const newGuide = await store.createGuide(data);
      setGuides(prev => [...prev, newGuide]);
      toast.success('Guide created successfully');
      setOpenGuideDialog(false);
    } catch (error) {
      toast.error('Failed to create guide');
    }
  };

  const handleCreateNationality = async (data: any) => {
    try {
      const newNationality = await store.createNationality(data);
      setNationalities(prev => [...prev, newNationality]);
      toast.success('Nationality created successfully');
      setOpenNationalityDialog(false);
    } catch (error) {
      toast.error('Failed to create nationality');
    }
  };

  const handleCreateDestination = async (data: any) => {
    try {
      const newDestination = await store.createTouristDestination(data);
      setDestinations(prev => [...prev, newDestination]);
      toast.success('Destination created successfully');
      setOpenDestinationDialog(false);
    } catch (error) {
      toast.error('Failed to create destination');
    }
  };

  const handleCreateExpense = async (data: any) => {
    try {
      const newExpense = await store.createDetailedExpense(data);
      setExpenses(prev => [...prev, newExpense]);
      toast.success('Expense created successfully');
      setOpenExpenseDialog(false);
    } catch (error) {
      toast.error('Failed to create expense');
    }
  };

  const handleCreateShopping = async (data: any) => {
    try {
      const newShopping = await store.createShopping(data);
      setShoppings(prev => [...prev, newShopping]);
      toast.success('Shopping created successfully');
      setOpenShoppingDialog(false);
    } catch (error) {
      toast.error('Failed to create shopping');
    }
  };

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Import Review</h2>
          <Badge variant="outline" className="text-xs">
            {draft.length} tour{draft.length !== 1 ? 's' : ''}
          </Badge>
          <Badge variant={Object.keys(validationWarnings).length === 0 ? "default" : "secondary"} className="text-xs">
            {Object.keys(validationWarnings).length === 0 ? "Ready" : `${Object.keys(validationWarnings).length} warnings`}
          </Badge>
        </div>
      </div>

      {/* Compact Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3 w-3" />
        <Input
          placeholder="Search tours..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-7 h-8 text-sm"
        />
      </div>

      {/* Content */}
      <div className="space-y-3">
          <ScrollArea className="h-[calc(100vh-300px)]" ref={scrollContainerRef as any}>
            <div className="space-y-4 pr-4">
              {filteredTours.map((item, index) => {
                const originalIndex = draft.findIndex(d => d === item);
                const tour = item.tour;
                const raw = item.raw;
                const warnings = validationWarnings[originalIndex] || [];

                return (
                  <div key={originalIndex}>
                    <Card
                      className={warnings.length > 0 ? "border-yellow-500" : ""}
                    >
                    <CardHeader className="pb-2 pt-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{tour.tourCode || `Tour ${originalIndex + 1}`}</CardTitle>
                        <div className="flex items-center gap-1">
                          {warnings.length > 0 && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                              {warnings.length}w
                            </Badge>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeTour(originalIndex)}
                            className="h-6 w-6 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <Tabs defaultValue="info" className="w-full">
                        <TabsList className="grid w-full grid-cols-6 h-8">
                          <TabsTrigger value="info" className="text-xs px-2">Info</TabsTrigger>
                          <TabsTrigger value="destinations" className="text-xs px-1">
                            Dest
                            <Badge variant="secondary" className="ml-1 text-xs px-1 py-0">
                              {tour.destinations?.length || 0}
                            </Badge>
                          </TabsTrigger>
                          <TabsTrigger value="expenses" className="text-xs px-1">
                            Exp
                            <Badge variant="secondary" className="ml-1 text-xs px-1 py-0">
                              {tour.expenses?.length || 0}
                            </Badge>
                          </TabsTrigger>
                          <TabsTrigger value="meals" className="text-xs px-1">
                            Meals
                            <Badge variant="secondary" className="ml-1 text-xs px-1 py-0">
                              {tour.meals?.length || 0}
                            </Badge>
                          </TabsTrigger>
                          <TabsTrigger value="allowances" className="text-xs px-1">
                            Allow
                            <Badge variant="secondary" className="ml-1 text-xs px-1 py-0">
                              {tour.allowances?.length || 0}
                            </Badge>
                          </TabsTrigger>
                          <TabsTrigger value="summary" className="text-xs px-1">Summary</TabsTrigger>
                        </TabsList>

                        <TabsContent value="info" className="space-y-2 mt-2">
                          {warnings.length > 0 && (
                            <div className="p-2 bg-yellow-50 rounded border border-yellow-200">
                              <div className="flex items-start gap-1">
                                <AlertCircle className="h-3 w-3 text-yellow-600 mt-0.5" />
                                <div className="flex-1">
                                  <div className="text-xs font-medium text-yellow-800">Warnings:</div>
                                  <ul className="list-disc list-inside mt-0.5 text-xs text-yellow-700 space-y-0.5">
                                    {warnings.map((warning, i) => (
                                      <li key={i}>{warning}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-medium">Client Name</Label>
                          <Input
                            value={tour.clientName || ''}
                            onChange={(e) => updateTourField(originalIndex, 'clientName', e.target.value)}
                            className={`h-7 text-xs ${!tour.clientName ? 'border-yellow-500' : ''}`}
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-medium">Tour Code</Label>
                          <Input
                            value={tour.tourCode || ''}
                            onChange={(e) => updateTourField(originalIndex, 'tourCode', e.target.value)}
                            className={`h-7 text-xs ${!tour.tourCode ? 'border-yellow-500' : ''}`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs font-medium">
                            Company
                            {raw.company && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({raw.company})
                              </span>
                            )}
                          </Label>
                          <div className={!tour.companyRef?.id ? 'border border-yellow-500 rounded' : ''}>
                            <EntitySelector
                              entities={companies}
                              selected={tour.companyRef}
                              onSelect={(entity) => updateEntityRef(originalIndex, 'companyRef', entity)}
                              onCreateNew={() => {
                                setTargetIndex(originalIndex);
                                setInitialEntityName(raw.company || '');
                                setOpenCompanyDialog(true);
                              }}
                              placeholder="Select company"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs font-medium">
                            Guide
                            {raw.guide && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({raw.guide})
                              </span>
                            )}
                          </Label>
                          <div className={!tour.guideRef?.id ? 'border border-yellow-500 rounded' : ''}>
                            <EntitySelector
                              entities={guides}
                              selected={tour.guideRef}
                              onSelect={(entity) => updateEntityRef(originalIndex, 'guideRef', entity)}
                              onCreateNew={() => {
                                setTargetIndex(originalIndex);
                                setInitialEntityName(raw.guide || '');
                                setOpenGuideDialog(true);
                              }}
                              placeholder="Select guide"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs font-medium">
                            Nationality
                            {raw.nationality && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({raw.nationality})
                              </span>
                            )}
                          </Label>
                          <div className={!tour.clientNationalityRef?.id ? 'border border-yellow-500 rounded' : ''}>
                            <EntitySelector
                              entities={nationalities}
                              selected={tour.clientNationalityRef}
                              onSelect={(entity) => updateEntityRef(originalIndex, 'clientNationalityRef', entity)}
                              onCreateNew={() => {
                                setTargetIndex(originalIndex);
                                setInitialEntityName(raw.nationality || '');
                                setOpenNationalityDialog(true);
                              }}
                              placeholder="Select nationality"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-medium">Start Date</Label>
                          <Input
                            type="date"
                            value={tour.startDate || ''}
                            onChange={(e) => updateTourField(originalIndex, 'startDate', e.target.value)}
                            className={`h-7 text-xs ${!tour.startDate ? 'border-yellow-500' : ''}`}
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-medium">End Date</Label>
                          <Input
                            type="date"
                            value={tour.endDate || ''}
                            onChange={(e) => updateTourField(originalIndex, 'endDate', e.target.value)}
                            className={`h-7 text-xs ${!tour.endDate ? 'border-yellow-500' : ''}`}
                          />
                        </div>
                      </div>
                        </TabsContent>

                        <TabsContent value="destinations" className="mt-2">
                          <SubcollectionSection
                            title="Destinations"
                            icon={<MapPin className="h-3 w-3" />}
                            items={tour.destinations || []}
                            tourIndex={originalIndex}
                            sectionKey="destinations"
                            onUpdate={(index, field, value) => updateDestination(originalIndex, index, field, value)}
                            onRemove={(index) => removeDestination(originalIndex, index)}
                            matchFunction={matchDestination}
                            matchType="destination"
                            masterData={destinations}
                            rawData={raw.destinations || []}
                          />
                        </TabsContent>

                        <TabsContent value="expenses" className="mt-2">
                          <SubcollectionSection
                            title="Expenses"
                            icon={<Receipt className="h-3 w-3" />}
                            items={tour.expenses || []}
                            tourIndex={originalIndex}
                            sectionKey="expenses"
                            onUpdate={(index, field, value) => updateExpense(originalIndex, index, field, value)}
                            onRemove={(index) => removeExpense(originalIndex, index)}
                            matchFunction={matchExpense}
                            matchType="expense"
                            masterData={expenses}
                            rawData={raw.expenses || []}
                          />
                        </TabsContent>

                        <TabsContent value="meals" className="mt-2">
                          <SubcollectionSection
                            title="Meals"
                            icon={<Utensils className="h-3 w-3" />}
                            items={tour.meals || []}
                            tourIndex={originalIndex}
                            sectionKey="meals"
                            onUpdate={(index, field, value) => updateMeal(originalIndex, index, field, value)}
                            onRemove={(index) => removeMeal(originalIndex, index)}
                            matchFunction={matchExpense}
                            matchType="meal"
                            masterData={expenses}
                            rawData={raw.meals || []}
                          />
                        </TabsContent>

                        <TabsContent value="allowances" className="mt-2">
                          <SubcollectionSection
                            title="Allowances"
                            icon={<DollarSign className="h-3 w-3" />}
                            items={tour.allowances || []}
                            tourIndex={originalIndex}
                            sectionKey="allowances"
                            onUpdate={(index, field, value) => updateAllowance(originalIndex, index, field, value)}
                            onRemove={(index) => removeAllowance(originalIndex, index)}
                            matchFunction={matchAllowance}
                            matchType="allowance"
                            masterData={ctpAllowances}
                            rawData={raw.allowances || []}
                          />
                        </TabsContent>

                        <TabsContent value="summary" className="mt-2">
                          <SubcollectionSection
                            title="Summary"
                            icon={<DollarSign className="h-3 w-3" />}
                            items={tour.summary ? [tour.summary] : []}
                            tourIndex={originalIndex}
                            sectionKey="summary"
                            onUpdate={(index, field, value) => updateTourField(originalIndex, 'summary', { ...tour.summary, [field]: value })}
                            onRemove={() => {}}
                            matchFunction={null}
                            matchType="summary"
                            rawData={raw.summary ? [raw.summary] : []}
                          />
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                  {index < filteredTours.length - 1 && (
                    <div className="my-4 border-t border-gray-300" />
                  )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={() => {
            try {
              const validation = validateForImport();
              if (!validation.valid) {
                toast.error(`Cannot import: ${validation.errors.join(', ')}`, { duration: 8000 });
                return;
              }
              // Apply matched values and clean metadata before saving
              const finalTours = draft.map(d => {
                const tour = { ...d.tour };
                
                // Apply matched prices to destinations then strip metadata
                if (tour.destinations) {
                  tour.destinations = tour.destinations.map(({ matchedId, matchedPrice, ...dest }) => ({
                    ...dest,
                    price: matchedPrice !== undefined ? matchedPrice : dest.price,
                  }));
                }
                
                // Apply matched prices to expenses then strip metadata
                if (tour.expenses) {
                  tour.expenses = tour.expenses.map(({ matchedId, matchedPrice, ...exp }) => ({
                    ...exp,
                    price: matchedPrice !== undefined ? matchedPrice : exp.price,
                  }));
                }
                
                // Apply matched prices to meals then strip metadata
                if (tour.meals) {
                  tour.meals = tour.meals.map(({ matchedId, matchedPrice, ...meal }) => ({
                    ...meal,
                    price: matchedPrice !== undefined ? matchedPrice : meal.price,
                  }));
                }

                // Apply matched prices to allowances then strip metadata
                if (tour.allowances) {
                  tour.allowances = tour.allowances.map(({ matchedId, matchedPrice, ...allowance }: any) => ({
                    ...allowance,
                    price: matchedPrice !== undefined ? matchedPrice : allowance.price,
                  }));
                }

                return tour;
              });
              
              onConfirm(finalTours);
            } catch (error) {
              console.error('Import confirmation error:', error);
              const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
              toast.error(`Import failed: ${errorMsg}`, { duration: 8000 });
            }
          }}
        >
          Import {draft.length} tour(s)
        </Button>
      </div>

      {/* Entity Creation Dialogs */}
      <CompanyDialog
        open={openCompanyDialog}
        onOpenChange={setOpenCompanyDialog}
        company={initialEntityName ? { id: '', name: initialEntityName, createdAt: '', updatedAt: '' } as any : undefined}
        onSubmit={handleCreateCompany}
      />
      <GuideDialog
        open={openGuideDialog}
        onOpenChange={setOpenGuideDialog}
        guide={initialEntityName ? { id: '', name: initialEntityName, createdAt: '', updatedAt: '' } as any : undefined}
        onSubmit={handleCreateGuide}
      />
      <NationalityDialog
        open={openNationalityDialog}
        onOpenChange={setOpenNationalityDialog}
        nationality={initialEntityName ? { id: '', name: initialEntityName, createdAt: '', updatedAt: '' } as any : undefined}
        onSubmit={handleCreateNationality}
      />
      <DestinationDialog open={openDestinationDialog} onOpenChange={setOpenDestinationDialog} onSubmit={handleCreateDestination} />
      <DetailedExpenseDialog open={openExpenseDialog} onOpenChange={setOpenExpenseDialog} onSubmit={handleCreateExpense} />
      <ShoppingDialog open={openShoppingDialog} onOpenChange={setOpenShoppingDialog} onSubmit={handleCreateShopping} />
    </div>
  );
}


// Entity Selector Component
interface EntitySelectorProps {
  entities: any[];
  selected: EntityRef | undefined;
  onSelect: (entity: any) => void;
  onCreateNew: () => void;
  placeholder: string;
}

function EntitySelector({ entities, selected, onSelect, onCreateNew, placeholder }: EntitySelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredEntities = useMemo(() => {
    if (!searchQuery.trim()) return entities;
    
    const fuse = new Fuse(entities, {
      keys: ['name'],
      threshold: 0.4,
      includeScore: true,
    });
    
    return fuse.search(searchQuery).map(result => result.item);
  }, [entities, searchQuery]);

  return (
    <div className="flex items-center gap-1">
      <Select
        value={selected?.id || undefined}
        onValueChange={(value) => {
          const entity = entities.find(e => e.id === value);
          if (entity) onSelect(entity);
        }}
        onOpenChange={setIsOpen}
      >
        <SelectTrigger className="h-7 flex-1 text-xs">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <div className="p-1">
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 text-xs"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <Separator />
          {filteredEntities.map((entity) => (
            <SelectItem key={entity.id} value={entity.id} className="text-xs">
              {entity.name}
            </SelectItem>
          ))}
          {filteredEntities.length === 0 && (
            <div className="p-1 text-xs text-muted-foreground text-center">
              No results found
            </div>
          )}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onCreateNew}
        className="h-7 w-7 p-0"
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}