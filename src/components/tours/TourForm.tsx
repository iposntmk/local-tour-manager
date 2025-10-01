import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Check, ChevronsUpDown, Save, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tour, TourInput, Destination, Expense, Meal, Allowance } from '@/types/tour';

interface TourFormProps {
  initialData?: Tour;
  onSubmit: (data: TourInput & { destinations: Destination[]; expenses: Expense[]; meals: Meal[]; allowances: Allowance[] }) => void;
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
    });
  };

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
  const selectedGuide = guides.find((g) => g.id === selectedGuideId);
  const selectedNationality = nationalities.find((n) => n.id === selectedNationalityId);

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="info">Tour Info</TabsTrigger>
          <TabsTrigger value="destinations">
            Destinations <Badge variant="secondary" className="ml-1">{destinations.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="expenses">
            Expenses <Badge variant="secondary" className="ml-1">{expenses.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="meals">
            Meals <Badge variant="secondary" className="ml-1">{meals.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="allowances">
            Allowances <Badge variant="secondary" className="ml-1">{allowances.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <Input
                id="adults"
                type="number"
                min="0"
                {...register('adults', { required: true, valueAsNumber: true })}
              />
            </div>

            {/* Children */}
            <div className="space-y-2">
              <Label htmlFor="children">Children</Label>
              <Input
                id="children"
                type="number"
                min="0"
                {...register('children', { valueAsNumber: true })}
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
              <Input
                id="startDate"
                type="date"
                {...register('startDate', { required: 'Start date is required' })}
              />
              {errors.startDate && (
                <p className="text-sm text-destructive">{errors.startDate.message}</p>
              )}
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                {...register('endDate', { required: 'End date is required' })}
              />
              {errors.endDate && (
                <p className="text-sm text-destructive">{errors.endDate.message}</p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="destinations" className="space-y-4 mt-6">
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Add Destination</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <Input type="number" placeholder="Price" value={destForm.price} onChange={(e) => setDestForm({ ...destForm, price: Number(e.target.value) })} />
              <Input type="date" value={destForm.date} onChange={(e) => setDestForm({ ...destForm, date: e.target.value })} />
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
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Add Expense</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <Input type="number" placeholder="Price" value={expForm.price} onChange={(e) => setExpForm({ ...expForm, price: Number(e.target.value) })} />
              <Input type="date" value={expForm.date} onChange={(e) => setExpForm({ ...expForm, date: e.target.value })} />
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
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Add Meal</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <Input type="number" placeholder="Price" value={mealForm.price} onChange={(e) => setMealForm({ ...mealForm, price: Number(e.target.value) })} />
              <Input type="date" value={mealForm.date} onChange={(e) => setMealForm({ ...mealForm, date: e.target.value })} />
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
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Add Allowance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input type="date" value={allowForm.date} onChange={(e) => setAllowForm({ ...allowForm, date: e.target.value })} />
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
              <Input type="number" placeholder="Amount" value={allowForm.amount} onChange={(e) => setAllowForm({ ...allowForm, amount: Number(e.target.value) })} />
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
