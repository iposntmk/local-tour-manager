import { formatDate, cn } from "@/lib/utils";
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DateInput } from '@/components/ui/date-input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Check, ChevronsUpDown, Save, Plus, Trash2 } from 'lucide-react';
import type { Tour, TourInput, Destination, Expense, Meal, Allowance, Shopping, TourSummary, TourNationality } from '@/types/tour';
import { TourFormCreateDialogs } from '@/components/tours/TourFormCreateDialogs';
import { TourFormInfoTab } from '@/components/tours/TourFormInfoTab';
import { TourFormTabsList } from '@/components/tours/TourFormTabsList';

interface TourFormProps {
  initialData?: Tour;
  onSubmit: (data: TourInput & { destinations: Destination[]; expenses: Expense[]; meals: Meal[]; allowances: Allowance[]; shoppings: Shopping[]; summary: TourSummary }) => void;
}

const getInitialTourNationalities = (initialData?: Tour): TourNationality[] => {
  if (!initialData) return [];
  if (initialData.clientNationalities?.length) return initialData.clientNationalities;
  if (!initialData.clientNationalityRef?.id) return [];
  return [
    {
      ...initialData.clientNationalityRef,
      paxCount: Math.max(initialData.totalGuests || 0, 1),
    },
  ];
};

export function TourForm({ initialData, onSubmit }: TourFormProps) {
  const [companyOpen, setCompanyOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [destinationOpen, setDestinationOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [mealOpen, setMealOpen] = useState(false);

  const [selectedCompanyId, setSelectedCompanyId] = useState(initialData?.companyRef.id || '');
  const [selectedGuideId, setSelectedGuideId] = useState(initialData?.guideRef.id || '');
  const [selectedNationalities, setSelectedNationalities] = useState<TourNationality[]>(() => getInitialTourNationalities(initialData));

  // States for creating new master data
  const [showNewDestinationDialog, setShowNewDestinationDialog] = useState(false);
  const [newDestinationName, setNewDestinationName] = useState('');
  const [newDestinationPrice, setNewDestinationPrice] = useState(0);
  const [newDestinationProvinceId, setNewDestinationProvinceId] = useState('');
  const [openProvince, setOpenProvince] = useState(false);

  const [showNewExpenseDialog, setShowNewExpenseDialog] = useState(false);
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpensePrice, setNewExpensePrice] = useState(0);
  const [newExpenseCategoryId, setNewExpenseCategoryId] = useState('');
  const [openExpenseCategory, setOpenExpenseCategory] = useState(false);

  const [showNewMealDialog, setShowNewMealDialog] = useState(false);
  const [newMealName, setNewMealName] = useState('');
  const [newMealPrice, setNewMealPrice] = useState(0);
  const [newMealCategoryId, setNewMealCategoryId] = useState('');
  const [openMealCategory, setOpenMealCategory] = useState(false);

  const [destinations, setDestinations] = useState<Destination[]>(initialData?.destinations || []);
  const [expenses, setExpenses] = useState<Expense[]>(initialData?.expenses || []);
  const [meals, setMeals] = useState<Meal[]>(initialData?.meals || []);
  const [allowances, setAllowances] = useState<Allowance[]>(initialData?.allowances || []);
  const [shoppings, setShoppings] = useState<Shopping[]>(initialData?.shoppings || []);
  const [summary, setSummary] = useState<TourSummary>(initialData?.summary || {
    totalTabs: 0,
    advancePayment: 0,
    totalAfterAdvance: 0,
    companyTip: 0,
    totalAfterTip: 0,
    collectionsForCompany: 0,
    totalAfterCollections: 0,
    finalTotal: 0,
  });

  const [destForm, setDestForm] = useState<Destination>({ name: '', price: 0, date: '' });
  const [expForm, setExpForm] = useState<Expense>({ name: '', price: 0, date: '' });
  const [mealForm, setMealForm] = useState<Meal>({ name: '', price: 0, date: '' });
  const [allowForm, setAllowForm] = useState<Allowance>({ date: '', name: '', price: 0 });
  const [shopForm, setShopForm] = useState<Shopping>({ name: '', price: 0, date: '' });

  const queryClient = useQueryClient();
  const { isGuide, userProfile } = useAuth();
  const guideId = isGuide ? (userProfile?.id ?? undefined) : undefined;

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<TourInput>({
    defaultValues: initialData ? {
      tourCode: initialData.tourCode,
      companyRef: initialData.companyRef,
      guideRef: initialData.guideRef,
      clientNationalityRef: initialData.clientNationalityRef,
      clientNationalities: getInitialTourNationalities(initialData),
      clientName: initialData.clientName,
      adults: initialData.adults,
      children: initialData.children,
      driverName: initialData.driverName,
      clientPhone: initialData.clientPhone,
      startDate: initialData.startDate,
      endDate: initialData.endDate,
      notes: initialData.notes,
    } : {
      adults: 1,
      children: 0,
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => store.listCompanies({ status: 'active' }),
  });

  useEffect(() => {
    if (initialData || selectedCompanyId || companies.length === 0) {
      return;
    }

    const defaultCompany = companies.find((company) => company.isDefault);
    if (!defaultCompany) {
      return;
    }

    setSelectedCompanyId(defaultCompany.id);
    setValue('companyRef', { id: defaultCompany.id, nameAtBooking: defaultCompany.name });
  }, [companies, initialData, selectedCompanyId, setValue]);

  const { data: guides = [] } = useQuery({
    queryKey: ['guides'],
    queryFn: () => store.listGuides({ status: 'active' }),
  });

  useEffect(() => {
    if (initialData || selectedGuideId || guides.length === 0) {
      return;
    }

    const defaultGuide = guides.find((guide) => guide.isDefault);
    if (!defaultGuide) {
      return;
    }

    setSelectedGuideId(defaultGuide.id);
    setValue('guideRef', { id: defaultGuide.id, nameAtBooking: defaultGuide.name });
  }, [guides, initialData, selectedGuideId, setValue]);

  const { data: nationalities = [] } = useQuery({
    queryKey: ['nationalities'],
    queryFn: () => store.listNationalities({ status: 'active' }),
  });

  const { data: touristDestinations = [] } = useQuery({
    queryKey: ['touristDestinations'],
    queryFn: () => store.listTouristDestinations({ status: 'active' }),
  });

  const { data: detailedExpenses = [] } = useQuery({
    queryKey: ['detailedExpenses', guideId ?? null],
    queryFn: () => store.listDetailedExpenses({ status: 'active', guideId }),
  });

  const { data: shoppingItems = [] } = useQuery({
    queryKey: ['shoppings', guideId ?? null],
    queryFn: () => store.listShoppings({ status: 'active', guideId }),
  });

  const { data: provinces = [] } = useQuery({
    queryKey: ['provinces'],
    queryFn: () => store.listProvinces({ status: 'active' }),
  });

  const { data: expenseCategories = [] } = useQuery({
    queryKey: ['expenseCategories', guideId ?? null],
    queryFn: () => store.listExpenseCategories({ status: 'active', guideId }),
  });

  // Mutation for creating new tourist destination
  const createDestinationMutation = useMutation({
    mutationFn: ({ name, price, provinceId }: { name: string; price: number; provinceId: string }) => {
      const province = provinces.find(p => p.id === provinceId);
      if (!province) {
        throw new Error('Province not found');
      }
      return store.createTouristDestination({
        name,
        price,
        provinceRef: {
          id: provinceId,
          nameAtBooking: province.name
        }
      });
    },
    onSuccess: (newDestination) => {
      queryClient.invalidateQueries({ queryKey: ['touristDestinations'] });
      toast.success('Tourist destination created');
      setShowNewDestinationDialog(false);
      setNewDestinationName('');
      setNewDestinationPrice(0);
      setNewDestinationProvinceId('');
      // Auto-select the newly created destination
      setDestForm({ ...destForm, name: newDestination.name, price: newDestination.price });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create destination: ${error.message}`);
    },
  });

  // Mutation for creating new detailed expense
  const createExpenseMutation = useMutation({
    mutationFn: ({ name, price, categoryId }: { name: string; price: number; categoryId: string }) => {
      const category = expenseCategories.find(c => c.id === categoryId);
      if (!category) {
        throw new Error('Category not found');
      }
      return store.createDetailedExpense({
        name,
        price,
        categoryRef: {
          id: categoryId,
          nameAtBooking: category.name
        },
        guideId,
      });
    },
    onSuccess: (newExpense) => {
      queryClient.invalidateQueries({ queryKey: ['detailedExpenses', guideId ?? null] });
      toast.success('Detailed expense created');
      setShowNewExpenseDialog(false);
      setNewExpenseName('');
      setNewExpensePrice(0);
      setNewExpenseCategoryId('');
      // Auto-select the newly created expense
      setExpForm({ ...expForm, name: newExpense.name, price: newExpense.price });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create expense: ${error.message}`);
    },
  });

  // Mutation for creating new detailed meal
  const createMealMutation = useMutation({
    mutationFn: ({ name, price, categoryId }: { name: string; price: number; categoryId: string }) => {
      const category = expenseCategories.find(c => c.id === categoryId);
      if (!category) {
        throw new Error('Category not found');
      }
      return store.createDetailedExpense({
        name,
        price,
        categoryRef: {
          id: categoryId,
          nameAtBooking: category.name
        },
        guideId,
      });
    },
    onSuccess: (newMeal) => {
      queryClient.invalidateQueries({ queryKey: ['detailedExpenses', guideId ?? null] });
      toast.success('Detailed meal created');
      setShowNewMealDialog(false);
      setNewMealName('');
      setNewMealPrice(0);
      setNewMealCategoryId('');
      // Auto-select the newly created meal
      setMealForm({ ...mealForm, name: newMeal.name, price: newMeal.price });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create meal: ${error.message}`);
    },
  });

  const adults = watch('adults');
  const children = watch('children');
  const totalGuests = (adults || 0) + (children || 0);

  // Auto-calculate totals for Financial Summary
  useEffect(() => {
    const totalDestinations = destinations.reduce((sum, d) => sum + (d.price * totalGuests), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.price * totalGuests), 0);
    const totalMeals = meals.reduce((sum, m) => sum + (m.price * totalGuests), 0);
    const totalShoppings = shoppings.reduce((sum, s) => sum + s.price, 0);
    const totalAllowances = allowances.reduce((sum, a) => sum + (a.price * (a.quantity || 1)), 0);

    const calculatedTotal = totalDestinations + totalExpenses + totalMeals + totalShoppings + totalAllowances;
    const totalAfterAdvance = calculatedTotal - (summary.advancePayment || 0);
    const totalAfterCollections = totalAfterAdvance - (summary.collectionsForCompany || 0);
    const totalAfterTip = totalAfterCollections + (summary.companyTip || 0);
    const finalTotal = totalAfterTip;

    setSummary(prev => ({
      ...prev,
      totalTabs: calculatedTotal,
      totalAfterAdvance,
      totalAfterCollections,
      totalAfterTip,
      finalTotal,
    }));
  }, [destinations, expenses, meals, shoppings, allowances, totalGuests, summary.advancePayment, summary.collectionsForCompany, summary.companyTip]);

  const handleFormSubmit = (data: TourInput) => {
    // Validate required fields
    const missingFields: string[] = [];

    if (!data.tourCode?.trim()) {
      missingFields.push('Tour Code');
    }
    if (!data.clientName?.trim()) {
      missingFields.push('Client Name');
    }
    if (!data.startDate) {
      missingFields.push('Start Date');
    }
    if (!data.endDate) {
      missingFields.push('End Date');
    }
    if (!selectedCompanyId) {
      missingFields.push('Company');
    }
    if (!selectedGuideId) {
      missingFields.push('Guide');
    }
    if (selectedNationalities.length === 0) {
      missingFields.push('Nationality');
    }

    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }

    const nationalityPaxTotal = selectedNationalities.reduce((sum, item) => sum + (Number(item.paxCount) || 0), 0);
    const formTotalGuests = (data.adults || 0) + (data.children || 0);
    if (formTotalGuests > 0 && nationalityPaxTotal !== formTotalGuests) {
      toast.error('Nationality pax total must equal total guests');
      return;
    }

    const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
    const selectedGuide = guides.find((g) => g.id === selectedGuideId);
    const primaryNationality = selectedNationalities[0];

    if (!selectedCompany || !selectedGuide || !primaryNationality) {
      toast.error('Please select valid Company, Guide, and Nationality');
      return;
    }

    onSubmit({
      ...data,
      companyRef: { id: selectedCompany.id, nameAtBooking: selectedCompany.name },
      guideRef: { id: selectedGuide.id, nameAtBooking: selectedGuide.name },
      clientNationalityRef: { id: primaryNationality.id, nameAtBooking: primaryNationality.nameAtBooking },
      clientNationalities: selectedNationalities,
      destinations,
      expenses,
      meals,
      allowances,
      shoppings,
      summary,
    });
  };

  const handleCreateNewDestination = () => {
    if (!newDestinationName.trim()) {
      toast.error('Please enter a destination name');
      return;
    }
    if (newDestinationPrice <= 0) {
      toast.error('Please enter a valid price');
      return;
    }
    if (!newDestinationProvinceId) {
      toast.error('Please select a province');
      return;
    }
    createDestinationMutation.mutate({
      name: newDestinationName.trim(),
      price: newDestinationPrice,
      provinceId: newDestinationProvinceId
    });
  };

  const handleCreateNewExpense = () => {
    if (!newExpenseName.trim()) {
      toast.error('Please enter an expense name');
      return;
    }
    if (newExpensePrice <= 0) {
      toast.error('Please enter a valid price');
      return;
    }
    if (!newExpenseCategoryId) {
      toast.error('Please select a category');
      return;
    }
    createExpenseMutation.mutate({
      name: newExpenseName.trim(),
      price: newExpensePrice,
      categoryId: newExpenseCategoryId
    });
  };

  const handleCreateNewMeal = () => {
    if (!newMealName.trim()) {
      toast.error('Please enter a meal name');
      return;
    }
    if (newMealPrice <= 0) {
      toast.error('Please enter a valid price');
      return;
    }
    if (!newMealCategoryId) {
      toast.error('Please select a category');
      return;
    }
    createMealMutation.mutate({
      name: newMealName.trim(),
      price: newMealPrice,
      categoryId: newMealCategoryId
    });
  };

  const resetDestinationDialog = () => {
    setShowNewDestinationDialog(false);
    setNewDestinationName('');
    setNewDestinationPrice(0);
    setNewDestinationProvinceId('');
  };

  const resetExpenseDialog = () => {
    setShowNewExpenseDialog(false);
    setNewExpenseName('');
    setNewExpensePrice(0);
    setNewExpenseCategoryId('');
  };

  const resetMealDialog = () => {
    setShowNewMealDialog(false);
    setNewMealName('');
    setNewMealPrice(0);
    setNewMealCategoryId('');
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <Tabs defaultValue="info" className="w-full">
        <TourFormTabsList
          destinationCount={destinations.length}
          expenseCount={expenses.length}
          mealCount={meals.length}
          shoppingCount={shoppings.length}
          allowanceCount={allowances.length}
        />

        <TabsContent value="info" className="space-y-6 mt-6">
          <TourFormInfoTab
            register={register}
            errors={errors}
            watch={watch}
            setValue={setValue}
            companies={companies}
            guides={guides}
            nationalities={nationalities}
            companyOpen={companyOpen}
            guideOpen={guideOpen}
            selectedCompanyId={selectedCompanyId}
            selectedGuideId={selectedGuideId}
            selectedNationalities={selectedNationalities}
            totalGuests={totalGuests}
            setCompanyOpen={setCompanyOpen}
            setGuideOpen={setGuideOpen}
            setSelectedCompanyId={setSelectedCompanyId}
            setSelectedGuideId={setSelectedGuideId}
            setSelectedNationalities={setSelectedNationalities}
          />
        </TabsContent>

        <TabsContent value="destinations" className="space-y-4 mt-6">
          <div className="rounded-lg border bg-card p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-4">Add Destination</h3>
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              <div className="flex gap-2">
                <Popover open={destinationOpen} onOpenChange={setDestinationOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="justify-between flex-1">
                      {destForm.name || "Select destination..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput placeholder="Search destination..." />
                      <CommandList>
                        <CommandEmpty>No destination found.</CommandEmpty>
                        <CommandGroup>
                          {touristDestinations.map((dest) => (
                            <CommandItem key={dest.id} value={dest.name} onSelect={() => {
                              setDestForm({ ...destForm, name: dest.name, price: dest.price });
                              setDestinationOpen(false);
                            }}>
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  destForm.name === dest.name ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {dest.name} ({dest.price.toLocaleString()} ₫)
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowNewDestinationDialog(true)}
                  title="Add new destination type"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <CurrencyInput placeholder="Price" value={destForm.price} onChange={(price) => setDestForm({ ...destForm, price })} />
              <DateInput value={destForm.date} onChange={(date) => setDestForm({ ...destForm, date })} />
            </div>
            <Button type="button" className="mt-4" onClick={() => { 
              if (destForm.name && destForm.date) { 
                // Check for duplicate destination name
                const isDuplicate = destinations.some(dest => 
                  dest.name.toLowerCase() === destForm.name.toLowerCase()
                );
                
                if (isDuplicate) {
                  toast.error('A destination with this name already exists');
                  return;
                }
                
                setDestinations([...destinations, destForm]); 
                setDestForm({ name: '', price: 0, date: '' }); 
              } 
            }}>
              <Plus className="h-4 w-4 mr-2" />Add
            </Button>
          </div>
          <div className="rounded-lg border divide-y">
            {destinations.map((dest, idx) => (
              <div key={idx} className="p-4 flex justify-between items-center">
                <div><div className="font-medium">{dest.name}</div><div className="text-xs text-muted-foreground">{dest.date} • {dest.price.toLocaleString()} ₫</div></div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setDestinations(destinations.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4 mt-6">
          <div className="rounded-lg border bg-card p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-4">Add Expense</h3>
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              <div className="flex gap-2">
                <Popover open={expenseOpen} onOpenChange={setExpenseOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="justify-between flex-1">
                      {expForm.name || "Select expense..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput placeholder="Search expense..." />
                      <CommandList>
                        <CommandEmpty>No expense found.</CommandEmpty>
                        <CommandGroup>
                          {detailedExpenses.map((exp) => (
                            <CommandItem key={exp.id} value={exp.name} onSelect={() => {
                              setExpForm({ ...expForm, name: exp.name, price: exp.price });
                              setExpenseOpen(false);
                            }}>
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  expForm.name === exp.name ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {exp.name} ({exp.price.toLocaleString()} ₫)
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowNewExpenseDialog(true)}
                  title="Add new expense type"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <CurrencyInput placeholder="Price" value={expForm.price} onChange={(price) => setExpForm({ ...expForm, price })} />
              <DateInput value={expForm.date} onChange={(date) => setExpForm({ ...expForm, date })} />
            </div>
            <Button type="button" className="mt-4" onClick={() => { if (expForm.name && expForm.date) { setExpenses([...expenses, expForm]); setExpForm({ name: '', price: 0, date: '' }); } }}>
              <Plus className="h-4 w-4 mr-2" />Add
            </Button>
          </div>
          <div className="rounded-lg border divide-y">
            {expenses.map((exp, idx) => (
              <div key={idx} className="p-4 flex justify-between items-center">
                <div><div className="font-medium">{exp.name}</div><div className="text-xs text-muted-foreground">{exp.date} • {exp.price.toLocaleString()} ₫</div></div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setExpenses(expenses.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="meals" className="space-y-4 mt-6">
          <div className="rounded-lg border bg-card p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-4">Add Meal</h3>
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              <div className="flex gap-2">
                <Popover open={mealOpen} onOpenChange={setMealOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="justify-between flex-1">
                      {mealForm.name || "Select meal..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput placeholder="Search meal..." />
                      <CommandList>
                        <CommandEmpty>No meal found.</CommandEmpty>
                        <CommandGroup>
                          {detailedExpenses.map((item) => (
                            <CommandItem key={item.id} value={item.name} onSelect={() => {
                              setMealForm({ ...mealForm, name: item.name, price: item.price });
                              setMealOpen(false);
                            }}>
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  mealForm.name === item.name ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {item.name} ({item.price.toLocaleString()} ₫)
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowNewMealDialog(true)}
                  title="Add new meal type"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <CurrencyInput placeholder="Price" value={mealForm.price} onChange={(price) => setMealForm({ ...mealForm, price })} />
              <DateInput value={mealForm.date} onChange={(date) => setMealForm({ ...mealForm, date })} />
            </div>
            <Button type="button" className="mt-4" onClick={() => { if (mealForm.name && mealForm.date) { setMeals([...meals, mealForm]); setMealForm({ name: '', price: 0, date: '' }); } }}>
              <Plus className="h-4 w-4 mr-2" />Add
            </Button>
          </div>
          <div className="rounded-lg border divide-y">
            {meals.map((meal, idx) => (
              <div key={idx} className="p-4 flex justify-between items-center">
                <div><div className="font-medium">{meal.name}</div><div className="text-xs text-muted-foreground">{meal.date} • {meal.price.toLocaleString()} ₫</div></div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setMeals(meals.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="shoppings" className="space-y-4 mt-6">
          <div className="rounded-lg border bg-card p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-4">Add Shopping</h3>
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="justify-between">
                    {shopForm.name || "Select shopping..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Search shopping..." />
                    <CommandEmpty>No shopping found.</CommandEmpty>
                    <CommandGroup>
                      {shoppingItems.map((item) => (
                        <CommandItem key={item.id} value={item.name} onSelect={() => setShopForm({ ...shopForm, name: item.name })}>
                          {item.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              <CurrencyInput placeholder="Price" value={shopForm.price} onChange={(price) => setShopForm({ ...shopForm, price })} />
              <DateInput value={shopForm.date} onChange={(date) => setShopForm({ ...shopForm, date })} />
            </div>
            <Button type="button" className="mt-4" onClick={() => { if (shopForm.name && shopForm.date) { setShoppings([...shoppings, shopForm]); setShopForm({ name: '', price: 0, date: '' }); } }}>
              <Plus className="h-4 w-4 mr-2" />Add
            </Button>
          </div>
          <div className="rounded-lg border divide-y">
            {shoppings.map((shop, idx) => (
              <div key={idx} className="p-4 flex justify-between items-center">
                <div><div className="font-medium">{shop.name}</div><div className="text-xs text-muted-foreground">{shop.date} • {shop.price.toLocaleString()} ₫</div></div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShoppings(shoppings.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="allowances" className="space-y-4 mt-6">
          <div className="rounded-lg border bg-card p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-4">Add Allowance</h3>
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              <DateInput value={allowForm.date} onChange={(date) => setAllowForm({ ...allowForm, date })} />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="justify-between">
                    {allowForm.name || "Select allowance..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Search allowance..." />
                    <CommandEmpty>No allowance found.</CommandEmpty>
                    <CommandGroup>
                      {provinces.map((prov) => (
                        <CommandItem key={prov.id} value={prov.name} onSelect={() => setAllowForm({ ...allowForm, name: prov.name })}>
                          {prov.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              <CurrencyInput placeholder="Price" value={allowForm.price} onChange={(price) => setAllowForm({ ...allowForm, price })} />
            </div>
            <Button type="button" className="mt-4" onClick={() => { if (allowForm.date && allowForm.name) { setAllowances([...allowances, allowForm]); setAllowForm({ date: '', name: '', price: 0 }); } }}>
              <Plus className="h-4 w-4 mr-2" />Add
            </Button>
          </div>
          <div className="rounded-lg border divide-y">
            {allowances.map((allow, idx) => (
              <div key={idx} className="p-4 flex justify-between items-center">
                <div><div className="font-medium">{allow.name}</div><div className="text-xs text-muted-foreground">{allow.date} • {allow.price.toLocaleString()} ₫</div></div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setAllowances(allowances.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4 mt-6">
          <div className="space-y-6">
            {/* Totals Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="rounded-lg border bg-card p-4">
                <div className="text-sm font-medium text-muted-foreground mb-1">Destinations</div>
                <div className="text-xl font-bold">{destinations.reduce((sum, d) => sum + (d.price * totalGuests), 0).toLocaleString()} ₫</div>
                <p className="text-xs text-muted-foreground mt-1">{destinations.length} item(s)</p>
              </div>

              <div className="rounded-lg border bg-card p-4">
                <div className="text-sm font-medium text-muted-foreground mb-1">Expenses</div>
                <div className="text-xl font-bold">{expenses.reduce((sum, e) => sum + (e.price * totalGuests), 0).toLocaleString()} ₫</div>
                <p className="text-xs text-muted-foreground mt-1">{expenses.length} item(s)</p>
              </div>

              <div className="rounded-lg border bg-card p-4">
                <div className="text-sm font-medium text-muted-foreground mb-1">Meals</div>
                <div className="text-xl font-bold">{meals.reduce((sum, m) => sum + (m.price * totalGuests), 0).toLocaleString()} ₫</div>
                <p className="text-xs text-muted-foreground mt-1">{meals.length} item(s)</p>
              </div>

              <div className="rounded-lg border bg-card p-4">
                <div className="text-sm font-medium text-muted-foreground mb-1">Shopping</div>
                <div className="text-xl font-bold">{shoppings.reduce((sum, s) => sum + s.price, 0).toLocaleString()} ₫</div>
                <p className="text-xs text-muted-foreground mt-1">{shoppings.length} item(s)</p>
              </div>

              <div className="rounded-lg border bg-card p-4">
                <div className="text-sm font-medium text-muted-foreground mb-1">Allowances</div>
                <div className="text-xl font-bold">{allowances.reduce((sum, a) => sum + (a.price * (a.quantity || 1)), 0).toLocaleString()} ₫</div>
                <p className="text-xs text-muted-foreground mt-1">{allowances.length} item(s)</p>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="rounded-lg border bg-card p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold mb-4">Financial Summary</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 bg-primary/10 px-3 rounded">
                  <span className="font-medium">Total Tabs (Auto-calculated)</span>
                  <span className="font-bold text-primary">{summary.totalTabs?.toLocaleString() || 0} ₫</span>
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-2">
                  <Label htmlFor="advancePayment" className="text-red-600 font-semibold">- Advance Payment (Input)</Label>
                  <CurrencyInput
                    id="advancePayment"
                    value={summary.advancePayment || 0}
                    onChange={(value) => setSummary({ ...summary, advancePayment: value })}
                  />
                </div>

                <div className="flex justify-between items-center py-2 bg-muted/50 px-3 rounded">
                  <span className="font-medium">Total After Advance</span>
                  <span className="font-bold">{summary.totalAfterAdvance?.toLocaleString() || 0} ₫</span>
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-2">
                  <Label htmlFor="collectionsForCompany" className="text-red-600 font-semibold">- Collections for Company (Input)</Label>
                  <CurrencyInput
                    id="collectionsForCompany"
                    value={summary.collectionsForCompany || 0}
                    onChange={(value) => setSummary({ ...summary, collectionsForCompany: value })}
                  />
                </div>

                <div className="flex justify-between items-center py-2 bg-muted/50 px-3 rounded">
                  <span className="font-medium">Total After Collections</span>
                  <span className="font-bold">{summary.totalAfterCollections?.toLocaleString() || 0} ₫</span>
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-2">
                  <Label htmlFor="companyTip" className="text-blue-600 font-semibold">+ Company Tip (Input)</Label>
                  <CurrencyInput
                    id="companyTip"
                    value={summary.companyTip || 0}
                    onChange={(value) => setSummary({ ...summary, companyTip: value })}
                  />
                </div>

                <div className="flex justify-between items-center py-2 bg-muted/50 px-3 rounded">
                  <span className="font-medium">Total After Tip</span>
                  <span className="font-bold">{summary.totalAfterTip?.toLocaleString() || 0} ₫</span>
                </div>

                <div className="h-px bg-border" />

                <div className="flex justify-between items-center py-3 bg-primary/10 px-4 rounded-lg mt-4">
                  <span className="text-lg font-bold">Final Total</span>
                  <span className="text-lg font-bold text-primary">{summary.finalTotal?.toLocaleString() || 0} ₫</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <TourFormCreateDialogs
        showNewDestinationDialog={showNewDestinationDialog}
        setShowNewDestinationDialog={setShowNewDestinationDialog}
        newDestinationName={newDestinationName}
        setNewDestinationName={setNewDestinationName}
        newDestinationPrice={newDestinationPrice}
        setNewDestinationPrice={setNewDestinationPrice}
        newDestinationProvinceId={newDestinationProvinceId}
        setNewDestinationProvinceId={setNewDestinationProvinceId}
        openProvince={openProvince}
        setOpenProvince={setOpenProvince}
        provinces={provinces}
        isCreatingDestination={createDestinationMutation.isPending}
        handleCreateNewDestination={handleCreateNewDestination}
        resetDestinationDialog={resetDestinationDialog}
        showNewExpenseDialog={showNewExpenseDialog}
        setShowNewExpenseDialog={setShowNewExpenseDialog}
        newExpenseName={newExpenseName}
        setNewExpenseName={setNewExpenseName}
        newExpensePrice={newExpensePrice}
        setNewExpensePrice={setNewExpensePrice}
        newExpenseCategoryId={newExpenseCategoryId}
        setNewExpenseCategoryId={setNewExpenseCategoryId}
        openExpenseCategory={openExpenseCategory}
        setOpenExpenseCategory={setOpenExpenseCategory}
        expenseCategories={expenseCategories}
        isCreatingExpense={createExpenseMutation.isPending}
        handleCreateNewExpense={handleCreateNewExpense}
        resetExpenseDialog={resetExpenseDialog}
        showNewMealDialog={showNewMealDialog}
        setShowNewMealDialog={setShowNewMealDialog}
        newMealName={newMealName}
        setNewMealName={setNewMealName}
        newMealPrice={newMealPrice}
        setNewMealPrice={setNewMealPrice}
        newMealCategoryId={newMealCategoryId}
        setNewMealCategoryId={setNewMealCategoryId}
        openMealCategory={openMealCategory}
        setOpenMealCategory={setOpenMealCategory}
        isCreatingMeal={createMealMutation.isPending}
        handleCreateNewMeal={handleCreateNewMeal}
        resetMealDialog={resetMealDialog}
      />

      <div className="flex justify-end">
        <Button type="submit" className="hover-scale">
          <Save className="h-4 w-4 mr-2" />
          Save Tour
        </Button>
      </div>
    </form>
  );
}
