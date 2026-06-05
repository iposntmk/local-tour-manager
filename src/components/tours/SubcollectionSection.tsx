import { useState } from 'react';
import { Check, Trash2, ChevronsUpDown, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { MatchCandidate } from '@/lib/import-match-utils';

export interface SubcollectionSectionProps {
  title: string;
  icon: React.ReactNode;
  items: any[];
  tourIndex: number;
  sectionKey: string;
  onUpdate: (index: number, field: string, value: any) => void;
  onRemove: (index: number) => void;
  matchFunction: ((name: string) => any) | null;
  suggestFunction?: ((name: string) => MatchCandidate<any>[]) | null;
  matchType: string;
  masterData?: any[];
  rawData?: any[];
}

export function SubcollectionSection({
  title,
  icon,
  items,
  tourIndex,
  sectionKey,
  onUpdate,
  onRemove,
  matchFunction,
  suggestFunction,
  matchType,
  masterData = [],
  rawData = []
}: SubcollectionSectionProps) {
  const [openCombobox, setOpenCombobox] = useState<{ [key: number]: boolean }>({});

  // Apply a chosen master candidate to a row (name + price), which then
  // re-triggers matchFunction and surfaces the green "Matched" badge.
  const applyCandidate = (index: number, candidate: { id?: string; name: string; price?: number }) => {
    onUpdate(index, 'name', candidate.name);
    if (candidate.price !== undefined) onUpdate(index, 'price', candidate.price);
  };

  // Suggestion chips shown when a row has no automatic match.
  const renderSuggestions = (item: any, index: number, hasMatch: boolean) => {
    if (hasMatch || !suggestFunction || !item.name) return null;
    const candidates = suggestFunction(item.name);
    if (candidates.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1 pt-0.5">
        <span className="text-[10px] text-muted-foreground self-center">Gợi ý:</span>
        {candidates.map((c) => (
          <Button
            key={c.item.id ?? c.item.name}
            variant="outline"
            size="sm"
            onClick={() => applyCandidate(index, c.item)}
            className="h-5 px-1.5 text-[10px] border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-800"
            title={`${c.item.name} — ${c.percent}%`}
          >
            {c.item.name} · {c.percent}%
          </Button>
        ))}
      </div>
    );
  };

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
              <CurrencyInput
                value={item.advancePayment || 0}
                onChange={(value) => onUpdate(index, 'advancePayment', value)}
                size="compact"
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
              <CurrencyInput
                value={item.totalAfterAdvance || 0}
                onChange={(value) => onUpdate(index, 'totalAfterAdvance', value)}
                size="compact"
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
              <CurrencyInput
                value={item.companyTip || 0}
                onChange={(value) => onUpdate(index, 'companyTip', value)}
                size="compact"
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
            <CurrencyInput
              value={item.price || 0}
              onChange={(value) => onUpdate(index, 'price', value)}
              size="compact"
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

      const allowanceSugg = item.name && suggestFunction ? suggestFunction(item.name) : [];
      const suggIdSet = new Set(allowanceSugg.map(s => s.item?.id).filter(Boolean));
      const suggestedItems = allowanceSugg.map(s => s.item).filter(Boolean);
      const allowanceOptions = [
        ...suggestedItems,
        ...masterData.filter((a: any) => a?.id && !suggIdSet.has(a.id)),
      ];

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
                          {allowanceOptions.map((allowance: any) => (
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
              {renderSuggestions(item, index, hasAllowanceMatch)}
              {item.provinceCandidates && item.provinceCandidates.length > 1 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  <span className="text-[10px] text-muted-foreground self-center">
                    <MapPin className="inline h-3 w-3 mr-0.5" />
                    Tỉnh:
                  </span>
                    {item.provinceCandidates.map((prov: string) => {
                      const currentProvince = (item.name || '').replace('Công tác phí - ', '');
                      const isActive = currentProvince === prov;
                      return (
                        <Button
                          key={prov}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newName = `Công tác phí - ${prov}`;
                            const matched = matchFunction?.(newName);
                            if (matched) {
                              onUpdate(index, 'name', matched.name);
                              if (matched.price !== undefined) onUpdate(index, 'price', matched.price);
                            } else {
                              onUpdate(index, 'name', newName);
                            }
                          }}
                          className={`h-5 px-1.5 text-[10px] ${
                            isActive
                              ? 'border-blue-500 bg-blue-50 text-blue-800'
                              : 'border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-800'
                          }`}
                        >
                          {prov}
                        </Button>
                      );
                    })}
                </div>
              )}
            </div>
          </TableCell>
          <TableCell className="text-xs">
            <div className="space-y-1">
              <CurrencyInput
                value={item.price || 0}
                onChange={(value) => onUpdate(index, 'price', value)}
                size="compact"
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
            {renderSuggestions(item, index, hasMatch)}
          </div>
        </TableCell>
        <TableCell className="text-xs">
          <div className="space-y-1">
            <CurrencyInput
              value={item.price || 0}
              onChange={(value) => onUpdate(index, 'price', value)}
              size="compact"
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
