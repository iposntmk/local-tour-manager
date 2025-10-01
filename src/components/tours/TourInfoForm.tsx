import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Check, ChevronsUpDown, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tour, TourInput } from '@/types/tour';

interface TourInfoFormProps {
  initialData?: Tour;
  onSubmit: (data: TourInput) => void;
  showSubmitButton?: boolean;
}

export function TourInfoForm({ initialData, onSubmit, showSubmitButton = true }: TourInfoFormProps) {
  const [companyOpen, setCompanyOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [nationalityOpen, setNationalityOpen] = useState(false);
  
  const [selectedCompanyId, setSelectedCompanyId] = useState(initialData?.companyRef.id || '');
  const [selectedGuideId, setSelectedGuideId] = useState(initialData?.guideRef.id || '');
  const [selectedNationalityId, setSelectedNationalityId] = useState(initialData?.clientNationalityRef.id || '');

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
    });
  };

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
  const selectedGuide = guides.find((g) => g.id === selectedGuideId);
  const selectedNationality = nationalities.find((n) => n.id === selectedNationalityId);

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
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

      {showSubmitButton && (
        <div className="flex justify-end">
          <Button type="submit" className="hover-scale">
            <Save className="h-4 w-4 mr-2" />
            Save Tour Info
          </Button>
        </div>
      )}
    </form>
  );
}
