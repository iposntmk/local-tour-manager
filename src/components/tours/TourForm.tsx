import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Save } from 'lucide-react';
import { TourFormTabsList } from '@/components/tours/TourFormTabsList';
import { TourFormInfoTab } from '@/components/tours/TourFormInfoTab';
import { DestinationsTab } from '@/components/tours/DestinationsTab';
import { ExpensesTab } from '@/components/tours/ExpensesTab';
import { MealsTab } from '@/components/tours/MealsTab';
import { ShoppingsTab } from '@/components/tours/ShoppingsTab';
import { AllowancesTab } from '@/components/tours/AllowancesTab';
import { SummaryTab } from '@/components/tours/SummaryTab';
import type { Tour, TourInput, Destination, Expense, Meal, Allowance, Shopping, TourSummary, TourNationality } from '@/types/tour';

interface TourFormProps {
  initialData?: Tour;
  onSubmit: (data: TourInput & { destinations: Destination[]; expenses: Expense[]; meals: Meal[]; allowances: Allowance[]; shoppings: Shopping[]; summary: TourSummary }) => void;
}

const getInitialTourNationalities = (initialData?: Tour): TourNationality[] => {
  if (!initialData) return [];
  if (initialData.clientNationalities?.length) return initialData.clientNationalities;
  if (!initialData.clientNationalityRef?.id) return [];
  return [{ ...initialData.clientNationalityRef, paxCount: Math.max(initialData.totalGuests || 0, 1) }];
};

const emptyTourSummary: TourSummary = {
  totalTabs: 0, advancePayment: 0, totalAfterAdvance: 0,
  companyTip: 0, totalAfterTip: 0, collectionsForCompany: 0,
  totalAfterCollections: 0, finalTotal: 0,
};

export function TourForm({ initialData, onSubmit }: TourFormProps) {
  const [companyOpen, setCompanyOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState(initialData?.companyRef.id || '');
  const [selectedGuideId, setSelectedGuideId] = useState(initialData?.guideRef.id || '');
  const [selectedNationalities, setSelectedNationalities] = useState<TourNationality[]>(() => getInitialTourNationalities(initialData));
  const [destinations, setDestinations] = useState<Destination[]>(initialData?.destinations || []);
  const [expenses, setExpenses] = useState<Expense[]>(initialData?.expenses || []);
  const [meals, setMeals] = useState<Meal[]>(initialData?.meals || []);
  const [allowances, setAllowances] = useState<Allowance[]>(initialData?.allowances || []);
  const [shoppings, setShoppings] = useState<Shopping[]>(initialData?.shoppings || []);
  const [summary, setSummary] = useState<TourSummary>(initialData?.summary || emptyTourSummary);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<TourInput>({
    defaultValues: initialData ? {
      tourCode: initialData.tourCode, companyRef: initialData.companyRef,
      guideRef: initialData.guideRef, clientNationalityRef: initialData.clientNationalityRef,
      clientNationalities: getInitialTourNationalities(initialData),
      clientName: initialData.clientName, adults: initialData.adults, children: initialData.children,
      driverName: initialData.driverName, clientPhone: initialData.clientPhone,
      startDate: initialData.startDate, endDate: initialData.endDate, notes: initialData.notes,
    } : { adults: 1, children: 0 },
  });

  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => store.listCompanies({ status: 'active' }) });
  const { data: guides = [] } = useQuery({ queryKey: ['guides'], queryFn: () => store.listGuides({ status: 'active' }) });
  const { data: nationalities = [] } = useQuery({ queryKey: ['nationalities'], queryFn: () => store.listNationalities({ status: 'active' }) });

  useEffect(() => {
    if (initialData || selectedCompanyId || companies.length === 0) return;
    const c = companies.find((c) => c.isDefault);
    if (c) { setSelectedCompanyId(c.id); setValue('companyRef', { id: c.id, nameAtBooking: c.name }); }
  }, [companies, initialData, selectedCompanyId, setValue]);

  useEffect(() => {
    if (initialData || selectedGuideId || guides.length === 0) return;
    const g = guides.find((g) => g.isDefault);
    if (g) { setSelectedGuideId(g.id); setValue('guideRef', { id: g.id, nameAtBooking: g.name }); }
  }, [guides, initialData, selectedGuideId, setValue]);

  const adults = watch('adults');
  const children = watch('children');
  const totalGuests = (adults || 0) + (children || 0);

  useEffect(() => {
    const td = destinations.reduce((s, d) => s + d.price * totalGuests, 0);
    const te = expenses.reduce((s, e) => s + e.price * totalGuests, 0);
    const tm = meals.reduce((s, m) => s + m.price * totalGuests, 0);
    const ts = shoppings.reduce((s, sh) => s + sh.price, 0);
    const ta = allowances.reduce((s, a) => s + a.price * (a.quantity || 1), 0);
    const totalTabs = td + te + tm + ts + ta;
    const totalAfterAdvance = totalTabs - (summary.advancePayment || 0);
    const totalAfterCollections = totalAfterAdvance - (summary.collectionsForCompany || 0);
    const totalAfterTip = totalAfterCollections + (summary.companyTip || 0);
    setSummary((prev) => ({ ...prev, totalTabs, totalAfterAdvance, totalAfterCollections, totalAfterTip, finalTotal: totalAfterTip }));
  }, [destinations, expenses, meals, shoppings, allowances, totalGuests, summary.advancePayment, summary.collectionsForCompany, summary.companyTip]);

  const handleFormSubmit = (data: TourInput) => {
    const missing: string[] = [];
    if (!data.tourCode?.trim()) missing.push('Tour Code');
    if (!data.clientName?.trim()) missing.push('Client Name');
    if (!data.startDate) missing.push('Start Date');
    if (!data.endDate) missing.push('End Date');
    if (!selectedCompanyId) missing.push('Company');
    if (!selectedGuideId) missing.push('Guide');
    if (selectedNationalities.length === 0) missing.push('Nationality');
    if (missing.length > 0) { toast.error(`Please fill in all required fields: ${missing.join(', ')}`); return; }

    const paxTotal = selectedNationalities.reduce((s, n) => s + (Number(n.paxCount) || 0), 0);
    const guests = (data.adults || 0) + (data.children || 0);
    if (guests > 0 && paxTotal !== guests) { toast.error('Nationality pax total must equal total guests'); return; }

    const sc = companies.find((c) => c.id === selectedCompanyId);
    const sg = guides.find((g) => g.id === selectedGuideId);
    const pn = selectedNationalities[0];
    if (!sc || !sg || !pn) { toast.error('Please select valid Company, Guide, and Nationality'); return; }

    onSubmit({
      ...data,
      companyRef: { id: sc.id, nameAtBooking: sc.name },
      guideRef: { id: sg.id, nameAtBooking: sg.name },
      clientNationalityRef: { id: pn.id, nameAtBooking: pn.nameAtBooking },
      clientNationalities: selectedNationalities,
      destinations, expenses, meals, allowances, shoppings, summary,
    });
  };

  const tabTour = { startDate: watch('startDate'), totalGuests, destinations, expenses, meals, allowances, shoppings, summary } as Tour;

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <Tabs defaultValue="info" className="w-full">
        <TourFormTabsList
          destinationCount={destinations.length} expenseCount={expenses.length}
          mealCount={meals.length} shoppingCount={shoppings.length} allowanceCount={allowances.length}
        />
        <TabsContent value="info" className="space-y-6 mt-6">
          <TourFormInfoTab
            register={register} errors={errors} watch={watch} setValue={setValue}
            companies={companies} guides={guides} nationalities={nationalities}
            companyOpen={companyOpen} guideOpen={guideOpen}
            selectedCompanyId={selectedCompanyId} selectedGuideId={selectedGuideId}
            selectedNationalities={selectedNationalities} totalGuests={totalGuests}
            setCompanyOpen={setCompanyOpen} setGuideOpen={setGuideOpen}
            setSelectedCompanyId={setSelectedCompanyId} setSelectedGuideId={setSelectedGuideId}
            setSelectedNationalities={setSelectedNationalities}
          />
        </TabsContent>
        <TabsContent value="destinations" className="mt-6">
          <DestinationsTab destinations={destinations} tour={tabTour} onChange={setDestinations} readOnly={false} />
        </TabsContent>
        <TabsContent value="expenses" className="mt-6">
          <ExpensesTab expenses={expenses} tour={tabTour} onChange={setExpenses} readOnly={false} />
        </TabsContent>
        <TabsContent value="meals" className="mt-6">
          <MealsTab meals={meals} tour={tabTour} onChange={setMeals} readOnly={false} />
        </TabsContent>
        <TabsContent value="shoppings" className="mt-6">
          <ShoppingsTab shoppings={shoppings} tour={tabTour} onChange={setShoppings} readOnly={false} />
        </TabsContent>
        <TabsContent value="allowances" className="mt-6">
          <AllowancesTab allowances={allowances} tour={tabTour} onChange={setAllowances} readOnly={false} />
        </TabsContent>
        <TabsContent value="summary" className="mt-6">
          <SummaryTab tour={tabTour} readOnly={false} onSummaryUpdate={setSummary} />
        </TabsContent>
      </Tabs>
      <div className="flex justify-end">
        <Button type="submit" className="hover-scale"><Save className="h-4 w-4 mr-2" />Save Tour</Button>
      </div>
    </form>
  );
}
