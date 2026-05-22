import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { ExpenseCategory, Province } from '@/types/master';

type CreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  price: number;
  selectedId: string;
  selectOpen: boolean;
  isPending: boolean;
  options: Array<{ id: string; name: string }>;
  title: string;
  description: string;
  nameLabel: string;
  namePlaceholder: string;
  selectorLabel: string;
  selectorPlaceholder: string;
  selectorSearchPlaceholder: string;
  selectorEmptyText: string;
  priceLabel: string;
  priceInputId: string;
  nameInputId: string;
  selectorId: string;
  onNameChange: (value: string) => void;
  onPriceChange: (value: number) => void;
  onSelectedIdChange: (value: string) => void;
  onSelectOpenChange: (open: boolean) => void;
  onCreate: () => void;
  onReset: () => void;
};

const CreateDialog = ({
  open,
  onOpenChange,
  name,
  price,
  selectedId,
  selectOpen,
  isPending,
  options,
  title,
  description,
  nameLabel,
  namePlaceholder,
  selectorLabel,
  selectorPlaceholder,
  selectorSearchPlaceholder,
  selectorEmptyText,
  priceLabel,
  priceInputId,
  nameInputId,
  selectorId,
  onNameChange,
  onPriceChange,
  onSelectedIdChange,
  onSelectOpenChange,
  onCreate,
  onReset,
}: CreateDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor={nameInputId}>{nameLabel}</Label>
          <Input
            id={nameInputId}
            placeholder={namePlaceholder}
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={selectorId}>{selectorLabel}</Label>
          <Popover open={selectOpen} onOpenChange={onSelectOpenChange}>
            <PopoverTrigger asChild>
              <Button
                id={selectorId}
                variant="outline"
                role="combobox"
                aria-expanded={selectOpen}
                className="justify-between w-full"
                type="button"
              >
                {selectedId ? options.find((option) => option.id === selectedId)?.name : selectorPlaceholder}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder={selectorSearchPlaceholder} />
                <CommandList>
                  <CommandEmpty>{selectorEmptyText}</CommandEmpty>
                  <CommandGroup>
                    {options.map((option) => (
                      <CommandItem
                        key={option.id}
                        value={option.name}
                        onSelect={() => {
                          onSelectedIdChange(option.id);
                          onSelectOpenChange(false);
                        }}
                      >
                        <Check className={cn('mr-2 h-4 w-4', selectedId === option.id ? 'opacity-100' : 'opacity-0')} />
                        {option.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label htmlFor={priceInputId}>{priceLabel}</Label>
          <CurrencyInput
            id={priceInputId}
            placeholder="Default price"
            value={price}
            onChange={onPriceChange}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onReset}>
          Cancel
        </Button>
        <Button type="button" onClick={onCreate} disabled={isPending}>
          {isPending ? 'Creating...' : 'Create'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

type TourFormCreateDialogsProps = {
  showNewDestinationDialog: boolean;
  setShowNewDestinationDialog: (open: boolean) => void;
  newDestinationName: string;
  setNewDestinationName: (value: string) => void;
  newDestinationPrice: number;
  setNewDestinationPrice: (value: number) => void;
  newDestinationProvinceId: string;
  setNewDestinationProvinceId: (value: string) => void;
  openProvince: boolean;
  setOpenProvince: (open: boolean) => void;
  provinces: Province[];
  isCreatingDestination: boolean;
  handleCreateNewDestination: () => void;
  resetDestinationDialog: () => void;
  showNewExpenseDialog: boolean;
  setShowNewExpenseDialog: (open: boolean) => void;
  newExpenseName: string;
  setNewExpenseName: (value: string) => void;
  newExpensePrice: number;
  setNewExpensePrice: (value: number) => void;
  newExpenseCategoryId: string;
  setNewExpenseCategoryId: (value: string) => void;
  openExpenseCategory: boolean;
  setOpenExpenseCategory: (open: boolean) => void;
  expenseCategories: ExpenseCategory[];
  isCreatingExpense: boolean;
  handleCreateNewExpense: () => void;
  resetExpenseDialog: () => void;
  showNewMealDialog: boolean;
  setShowNewMealDialog: (open: boolean) => void;
  newMealName: string;
  setNewMealName: (value: string) => void;
  newMealPrice: number;
  setNewMealPrice: (value: number) => void;
  newMealCategoryId: string;
  setNewMealCategoryId: (value: string) => void;
  openMealCategory: boolean;
  setOpenMealCategory: (open: boolean) => void;
  isCreatingMeal: boolean;
  handleCreateNewMeal: () => void;
  resetMealDialog: () => void;
};

export const TourFormCreateDialogs = ({
  showNewDestinationDialog,
  setShowNewDestinationDialog,
  newDestinationName,
  setNewDestinationName,
  newDestinationPrice,
  setNewDestinationPrice,
  newDestinationProvinceId,
  setNewDestinationProvinceId,
  openProvince,
  setOpenProvince,
  provinces,
  isCreatingDestination,
  handleCreateNewDestination,
  resetDestinationDialog,
  showNewExpenseDialog,
  setShowNewExpenseDialog,
  newExpenseName,
  setNewExpenseName,
  newExpensePrice,
  setNewExpensePrice,
  newExpenseCategoryId,
  setNewExpenseCategoryId,
  openExpenseCategory,
  setOpenExpenseCategory,
  expenseCategories,
  isCreatingExpense,
  handleCreateNewExpense,
  resetExpenseDialog,
  showNewMealDialog,
  setShowNewMealDialog,
  newMealName,
  setNewMealName,
  newMealPrice,
  setNewMealPrice,
  newMealCategoryId,
  setNewMealCategoryId,
  openMealCategory,
  setOpenMealCategory,
  isCreatingMeal,
  handleCreateNewMeal,
  resetMealDialog,
}: TourFormCreateDialogsProps) => (
  <>
    <CreateDialog
      open={showNewDestinationDialog}
      onOpenChange={setShowNewDestinationDialog}
      name={newDestinationName}
      price={newDestinationPrice}
      selectedId={newDestinationProvinceId}
      selectOpen={openProvince}
      isPending={isCreatingDestination}
      options={provinces}
      title="Add New Tourist Destination"
      description="Create a new tourist destination that can be reused across tours."
      nameLabel="Destination Name"
      namePlaceholder="e.g., Ha Long Bay, Hoi An"
      selectorLabel="Province"
      selectorPlaceholder="Select province..."
      selectorSearchPlaceholder="Search province..."
      selectorEmptyText="No province found."
      priceLabel="Default Price (VND)"
      nameInputId="new-destination-name"
      selectorId="destination-province"
      priceInputId="new-destination-price"
      onNameChange={setNewDestinationName}
      onPriceChange={setNewDestinationPrice}
      onSelectedIdChange={setNewDestinationProvinceId}
      onSelectOpenChange={setOpenProvince}
      onCreate={handleCreateNewDestination}
      onReset={resetDestinationDialog}
    />
    <CreateDialog
      open={showNewExpenseDialog}
      onOpenChange={setShowNewExpenseDialog}
      name={newExpenseName}
      price={newExpensePrice}
      selectedId={newExpenseCategoryId}
      selectOpen={openExpenseCategory}
      isPending={isCreatingExpense}
      options={expenseCategories}
      title="Add New Detailed Expense"
      description="Create a new detailed expense that can be reused across tours."
      nameLabel="Expense Name"
      namePlaceholder="e.g., Hotel, Transport, Food"
      selectorLabel="Expense Category"
      selectorPlaceholder="Select category..."
      selectorSearchPlaceholder="Search category..."
      selectorEmptyText="No category found."
      priceLabel="Default Price (VND)"
      nameInputId="new-expense-name"
      selectorId="expense-category"
      priceInputId="new-expense-price"
      onNameChange={setNewExpenseName}
      onPriceChange={setNewExpensePrice}
      onSelectedIdChange={setNewExpenseCategoryId}
      onSelectOpenChange={setOpenExpenseCategory}
      onCreate={handleCreateNewExpense}
      onReset={resetExpenseDialog}
    />
    <CreateDialog
      open={showNewMealDialog}
      onOpenChange={setShowNewMealDialog}
      name={newMealName}
      price={newMealPrice}
      selectedId={newMealCategoryId}
      selectOpen={openMealCategory}
      isPending={isCreatingMeal}
      options={expenseCategories}
      title="Add New Detailed Meal"
      description="Create a new detailed meal that can be reused across tours."
      nameLabel="Meal Name"
      namePlaceholder="e.g., Breakfast, Lunch, Dinner"
      selectorLabel="Expense Category"
      selectorPlaceholder="Select category..."
      selectorSearchPlaceholder="Search category..."
      selectorEmptyText="No category found."
      priceLabel="Default Price (VND)"
      nameInputId="new-meal-name"
      selectorId="meal-category"
      priceInputId="new-meal-price"
      onNameChange={setNewMealName}
      onPriceChange={setNewMealPrice}
      onSelectedIdChange={setNewMealCategoryId}
      onSelectOpenChange={setOpenMealCategory}
      onCreate={handleCreateNewMeal}
      onReset={resetMealDialog}
    />
  </>
);
