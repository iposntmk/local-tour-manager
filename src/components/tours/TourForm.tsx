import { formatDate } from "@/lib/utils";
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { NumberInput } from '@/components/ui/number-input';
import { DateInput } from '@/components/ui/date-input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronsUpDown, Save, Plus, Trash2, Info, Map, Receipt, Utensils, DollarSign, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tour, TourInput, Destination, Expense, Meal, Allowance, TourSummary } from '@/types/tour';

interface TourFormProps {
  initialData?: Tour;
  onSubmit: (data: TourInput & { destinations: Destination[]; expenses: Expense[]; meals: Meal[]; allowances: Allowance[]; summary: TourSummary }) => void;
}

export function TourForm({ initialData, onSubmit }: TourFormProps) {
  const [companyOpen, setCompanyOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [nationalityOpen, setNationalityOpen] = useState(false);
  
  const [selectedCompanyId, setSelectedCompanyId] = useState(initialData?.companyRef.id || '');
  const [selectedGuideId, setSelectedGuideId] = useState(initialData?.guideRef.id || '');
  const [selectedNationalityId, setSelectedNationalityId] = useState(initialData?.clientNationalityRef.id || '');

  const [destinations, setDestinations] = useState<Destination[]>(initialData?.destinations || []);
  const [expenses, setExpenses] = useState<Expense[]>(initialData?.expenses || []);
  const [meals, setMeals] = useState<Meal[]>(initialData?.meals || []);
  const [allowances, setAllowances] = useState<Allowance[]>(initialData?.allowances || []);
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
  const [allowForm, setAllowForm] = useState<Allowance>({ date: '', province: '', amount: 0 });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<TourInput>({
    defaultValues: initialData ? {
      tourCode: initialData.tourCode,
      companyRef: initialData.companyRef,
      guideRef: initialData.guideRef,
      clientNationalityRef: initialData.clientNationalityRef,
      clientName: initialData.clientName,
      adults: initialData.adults,
      children: initialData.children,
      driverName: initialData.driverName,
      clientPhone: initialData.clientPhone,
      startDate: initialData.startDate,
      endDate: initialData.endDate,
    } : {
      adults: 1,
      children: 0,
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => store.listCompanies({ status: 'active' }),
  });

  const { data: guides = [] } = useQuery({
    queryKey: ['guides'],
    queryFn: () => store.listGuides({ status: 'active' }),
  });

  const { data: nationalities = [] } = useQuery({
    queryKey: ['nationalities'],
    queryFn: () => store.listNationalities({ status: 'active' }),
  });

  const { data: touristDestinations = [] } = useQuery({
    queryKey: ['touristDestinations'],
    queryFn: () => store.listTouristDestinations({ status: 'active' }),
  });

  const { data: detailedExpenses = [] } = useQuery({
    queryKey: ['detailedExpenses'],
    queryFn: () => store.listDetailedExpenses({ status: 'active' }),
  });

  const { data: shoppingItems = [] } = useQuery({
    queryKey: ['shoppings'],
    queryFn: () => store.listShoppings({ status: 'active' }),
  });

  const { data: provinces = [] } = useQuery({
    queryKey: ['provinces'],
    queryFn: () => store.listProvinces({ status: 'active' }),
  });

  const adults = watch('adults');
  const children = watch('children');
  const totalGuests = (adults || 0) + (children || 0);

  const handleFormSubmit = (data: TourInput) => {
    const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
    const selectedGuide = guides.find((g) => g.id === selectedGuideId);
    const selectedNationality = nationalities.find((n) => n.id === selectedNationalityId);

    if (!selectedCompany || !selectedGuide || !selectedNationality) {
      return;
    }

    onSubmit({
      ...data,
      companyRef: { id: selectedCompany.id, nameAtBooking: selectedCompany.name },
      guideRef: { id: selectedGuide.id, nameAtBooking: selectedGuide.name },
      clientNationalityRef: { id: selectedNationality.id, nameAtBooking: selectedNationality.name },
      destinations,
      expenses,
      meals,
      allowances,
      summary,
    });
  };

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
  const selectedGuide = guides.find((g) => g.id === selectedGuideId);
  const selectedNationality = nationalities.find((n) => n.id === selectedNationalityId);

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-6 h-auto">
          <TabsTrigger value="info" className="flex-col sm:flex-row gap-1 py-2">
            <Info className="h-4 w-4" />
            <span className="hidden sm:inline">Tour Info</span>
          </TabsTrigger>
          <TabsTrigger value="destinations" className="flex-col sm:flex-row gap-1 py-2 relative">
            <Map className="h-4 w-4" />
            <span className="hidden sm:inline">Destinations</span>
            {destinations.length > 0 && (
              <Badge variant="secondary" className="absolute -top-1 -right-1 sm:relative sm:top-0 sm:right-0 h-5 min-w-[20px] px-1 text-xs">
                {destinations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex-col sm:flex-row gap-1 py-2 relative">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Expenses</span>
            {expenses.length > 0 && (
              <Badge variant="secondary" className="absolute -top-1 -right-1 sm:relative sm:top-0 sm:right-0 h-5 min-w-[20px] px-1 text-xs">
                {expenses.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="meals" className="flex-col sm:flex-row gap-1 py-2 relative">
            <Utensils className="h-4 w-4" />
            <span className="hidden sm:inline">Meals</span>
            {meals.length > 0 && (
              <Badge variant="secondary" className="absolute -top-1 -right-1 sm:relative sm:top-0 sm:right-0 h-5 min-w-[20px] px-1 text-xs">
                {meals.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="allowances" className="flex-col sm:flex-row gap-1 py-2 relative">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Allowances</span>
            {allowances.length > 0 && (
              <Badge variant="secondary" className="absolute -top-1 -right-1 sm:relative sm:top-0 sm:right-0 h-5 min-w-[20px] px-1 text-xs">
                {allowances.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex-col sm:flex-row gap-1 py-2">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">Summary</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Tour Code */}
            <div className="space-y-2">
              <Label htmlFor="tourCode">Tour Code *</Label>
              <Input
                id="tourCode"
                {...register('tourCode', { required: 'Tour code is required' })}
                placeholder="e.g., AT-250901"
              />
              {errors.tourCode && (
                <p className="text-sm text-destructive">{errors.tourCode.message}</p>
              )}
            </div>

            {/* Company */}
            <div className="space-y-2">
              <Label>Company *</Label>
              <Popover open={companyOpen} onOpenChange={setCompanyOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {selectedCompany ? selectedCompany.name : 'Select company...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search company..." />
                    <CommandEmpty>No company found.</CommandEmpty>
                    <CommandGroup>
                      {companies.map((company) => (
                        <CommandItem
                          key={company.id}
                          value={company.name}
                          onSelect={() => {
                            setSelectedCompanyId(company.id);
                            setCompanyOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selectedCompanyId === company.id ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          {company.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Guide */}
            <div className="space-y-2">
              <Label>Guide *</Label>
              <Popover open={guideOpen} onOpenChange={setGuideOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {selectedGuide ? selectedGuide.name : 'Select guide...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search guide..." />
                    <CommandEmpty>No guide found.</CommandEmpty>
                    <CommandGroup>
                      {guides.map((guide) => (
                        <CommandItem
                          key={guide.id}
                          value={guide.name}
                          onSelect={() => {
                            setSelectedGuideId(guide.id);
                            setGuideOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selectedGuideId === guide.id ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          {guide.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Client Name */}
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name *</Label>
              <Input
                id="clientName"
                {...register('clientName', { required: 'Client name is required' })}
                placeholder="e.g., Mrs. Matilde Lamura"
              />
              {errors.clientName && (
                <p className="text-sm text-destructive">{errors.clientName.message}</p>
              )}
            </div>

            {/* Nationality */}
            <div className="space-y-2">
              <Label>Nationality *</Label>
              <Popover open={nationalityOpen} onOpenChange={setNationalityOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {selectedNationality ? (
                      <span>
                        {selectedNationality.emoji} {selectedNationality.name}
                      </span>
                    ) : (
                      'Select nationality...'
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search nationality..." />
                    <CommandEmpty>No nationality found.</CommandEmpty>
                    <CommandGroup>
                      {nationalities.map((nationality) => (
                        <CommandItem
                          key={nationality.id}
                          value={nationality.name}
                          onSelect={() => {
                            setSelectedNationalityId(nationality.id);
                            setNationalityOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selectedNationalityId === nationality.id ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          {nationality.emoji} {nationality.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Adults */}
            <div className="space-y-2">
              <Label htmlFor="adults">Adults *</Label>
              <NumberInput
                id="adults"
                value={watch('adults')}
                onChange={(value) => setValue('adults', value)}
                min={0}
              />
            </div>

            {/* Children */}
            <div className="space-y-2">
              <Label htmlFor="children">Children</Label>
              <NumberInput
                id="children"
                value={watch('children')}
                onChange={(value) => setValue('children', value)}
                min={0}
              />
            </div>

            {/* Total Guests (display only) */}
            <div className="space-y-2">
              <Label>Total Guests</Label>
              <Input value={totalGuests} disabled className="bg-muted" />
            </div>

            {/* Driver Name */}
            <div className="space-y-2">
              <Label htmlFor="driverName">Driver Name</Label>
              <Input
                id="driverName"
                {...register('driverName')}
                placeholder="e.g., Mr Đức"
              />
            </div>

            {/* Client Phone */}
            <div className="space-y-2">
              <Label htmlFor="clientPhone">Client Phone</Label>
              <Input
                id="clientPhone"
                {...register('clientPhone')}
                placeholder="e.g., +39 348 470 4413"
              />
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <DateInput
                id="startDate"
                value={watch('startDate')}
                onChange={(value) => setValue('startDate', value)}
              />
              {errors.startDate && (
                <p className="text-sm text-destructive">{errors.startDate.message}</p>
              )}
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <DateInput
                id="endDate"
                value={watch('endDate')}
                onChange={(value) => setValue('endDate', value)}
              />
              {errors.endDate && (
                <p className="text-sm text-destructive">{errors.endDate.message}</p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="destinations" className="space-y-4 mt-6">
          <div className="rounded-lg border bg-card p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-4">Add Destination</h3>
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="justify-between">
                    {destForm.name || "Select destination..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Search destination..." />
                    <CommandEmpty>No destination found.</CommandEmpty>
                    <CommandGroup>
                      {touristDestinations.map((dest) => (
                        <CommandItem key={dest.id} value={dest.name} onSelect={() => setDestForm({ ...destForm, name: dest.name, price: dest.price })}>
                          {dest.name} ({dest.price.toLocaleString()} ₫)
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              <CurrencyInput placeholder="Price" value={destForm.price} onChange={(price) => setDestForm({ ...destForm, price })} />
              <DateInput value={destForm.date} onChange={(date) => setDestForm({ ...destForm, date })} />
            </div>
            <Button type="button" className="mt-4" onClick={() => { if (destForm.name && destForm.date) { setDestinations([...destinations, destForm]); setDestForm({ name: '', price: 0, date: '' }); } }}>
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="justify-between">
                    {expForm.name || "Select expense..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Search expense..." />
                    <CommandEmpty>No expense found.</CommandEmpty>
                    <CommandGroup>
                      {detailedExpenses.map((exp) => (
                        <CommandItem key={exp.id} value={exp.name} onSelect={() => setExpForm({ ...expForm, name: exp.name, price: exp.price })}>
                          {exp.name} ({exp.price.toLocaleString()} ₫)
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="justify-between">
                    {mealForm.name || "Select meal..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Search meal..." />
                    <CommandEmpty>No meal found.</CommandEmpty>
                    <CommandGroup>
                      {shoppingItems.map((item) => (
                        <CommandItem key={item.id} value={item.name} onSelect={() => setMealForm({ ...mealForm, name: item.name })}>
                          {item.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
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

        <TabsContent value="allowances" className="space-y-4 mt-6">
          <div className="rounded-lg border bg-card p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-4">Add Allowance</h3>
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              <DateInput value={allowForm.date} onChange={(date) => setAllowForm({ ...allowForm, date })} />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="justify-between">
                    {allowForm.province || "Select province..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Search province..." />
                    <CommandEmpty>No province found.</CommandEmpty>
                    <CommandGroup>
                      {provinces.map((prov) => (
                        <CommandItem key={prov.id} value={prov.name} onSelect={() => setAllowForm({ ...allowForm, province: prov.name })}>
                          {prov.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              <CurrencyInput placeholder="Amount" value={allowForm.amount} onChange={(amount) => setAllowForm({ ...allowForm, amount })} />
            </div>
            <Button type="button" className="mt-4" onClick={() => { if (allowForm.date && allowForm.province) { setAllowances([...allowances, allowForm]); setAllowForm({ date: '', province: '', amount: 0 }); } }}>
              <Plus className="h-4 w-4 mr-2" />Add
            </Button>
          </div>
          <div className="rounded-lg border divide-y">
            {allowances.map((allow, idx) => (
              <div key={idx} className="p-4 flex justify-between items-center">
                <div><div className="font-medium">{allow.province}</div><div className="text-xs text-muted-foreground">{allow.date} • {allow.amount.toLocaleString()} ₫</div></div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setAllowances(allowances.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4 mt-6">
          <div className="rounded-lg border bg-card p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-4">Financial Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalTabs">Total Tabs</Label>
                <CurrencyInput
                  id="totalTabs"
                  value={summary.totalTabs}
                  onChange={(value) => setSummary({ ...summary, totalTabs: value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="advancePayment">Advance Payment</Label>
                <CurrencyInput
                  id="advancePayment"
                  value={summary.advancePayment || 0}
                  onChange={(value) => setSummary({ ...summary, advancePayment: value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalAfterAdvance">Total After Advance</Label>
                <CurrencyInput
                  id="totalAfterAdvance"
                  value={summary.totalAfterAdvance || 0}
                  onChange={(value) => setSummary({ ...summary, totalAfterAdvance: value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyTip">Company Tip</Label>
                <CurrencyInput
                  id="companyTip"
                  value={summary.companyTip || 0}
                  onChange={(value) => setSummary({ ...summary, companyTip: value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalAfterTip">Total After Tip</Label>
                <CurrencyInput
                  id="totalAfterTip"
                  value={summary.totalAfterTip || 0}
                  onChange={(value) => setSummary({ ...summary, totalAfterTip: value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="collectionsForCompany">Collections for Company</Label>
                <CurrencyInput
                  id="collectionsForCompany"
                  value={summary.collectionsForCompany || 0}
                  onChange={(value) => setSummary({ ...summary, collectionsForCompany: value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalAfterCollections">Total After Collections</Label>
                <CurrencyInput
                  id="totalAfterCollections"
                  value={summary.totalAfterCollections || 0}
                  onChange={(value) => setSummary({ ...summary, totalAfterCollections: value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="finalTotal">Final Total</Label>
                <CurrencyInput
                  id="finalTotal"
                  value={summary.finalTotal || 0}
                  onChange={(value) => setSummary({ ...summary, finalTotal: value })}
                />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button type="submit" className="hover-scale">
          <Save className="h-4 w-4 mr-2" />
          Save Tour
        </Button>
      </div>
    </form>
  );
}
