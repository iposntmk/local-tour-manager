import type { Dispatch, SetStateAction } from 'react';
import type { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { DateInput } from '@/components/ui/date-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TourNationalitiesPicker } from '@/components/tours/TourNationalitiesPicker';
import { cn, getRequiredFieldClasses } from '@/lib/utils';
import type { Company, Guide, Nationality } from '@/types/master';
import type { TourInput, TourNationality } from '@/types/tour';

type TourFormInfoTabProps = {
  register: UseFormRegister<TourInput>;
  errors: FieldErrors<TourInput>;
  watch: UseFormWatch<TourInput>;
  setValue: UseFormSetValue<TourInput>;
  companies: Company[];
  guides: Guide[];
  nationalities: Nationality[];
  companyOpen: boolean;
  guideOpen: boolean;
  selectedCompanyId: string;
  selectedGuideId: string;
  selectedNationalities: TourNationality[];
  totalGuests: number;
  setCompanyOpen: (open: boolean) => void;
  setGuideOpen: (open: boolean) => void;
  setSelectedCompanyId: (id: string) => void;
  setSelectedGuideId: (id: string) => void;
  setSelectedNationalities: Dispatch<SetStateAction<TourNationality[]>>;
};

export function TourFormInfoTab({
  register,
  errors,
  watch,
  setValue,
  companies,
  guides,
  nationalities,
  companyOpen,
  guideOpen,
  selectedCompanyId,
  selectedGuideId,
  selectedNationalities,
  totalGuests,
  setCompanyOpen,
  setGuideOpen,
  setSelectedCompanyId,
  setSelectedGuideId,
  setSelectedNationalities,
}: TourFormInfoTabProps) {
  const selectedCompany = companies.find((company) => company.id === selectedCompanyId);
  const selectedGuide = guides.find((guide) => guide.id === selectedGuideId);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-2">
          <Label htmlFor="tourCode">Tour Code *</Label>
          <Input
            id="tourCode"
            {...register('tourCode', { required: 'Tour code is required' })}
            placeholder="e.g., AT-250901"
            className={cn(getRequiredFieldClasses(!!errors.tourCode))}
          />
          {errors.tourCode && (
            <p className="text-sm text-destructive">{errors.tourCode.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Company *</Label>
          <Popover open={companyOpen} onOpenChange={setCompanyOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className={cn('w-full justify-between', getRequiredFieldClasses(!selectedCompanyId))}
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

        <div className="space-y-2">
          <Label>Guide *</Label>
          <Popover open={guideOpen} onOpenChange={setGuideOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between">
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

        <div className="space-y-2">
          <Label htmlFor="clientName">Client Name *</Label>
          <Input
            id="clientName"
            {...register('clientName', { required: 'Client name is required' })}
            placeholder="e.g., Mrs. Matilde Lamura"
            className={cn(getRequiredFieldClasses(!!errors.clientName))}
          />
          {errors.clientName && (
            <p className="text-sm text-destructive">{errors.clientName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Nationality *</Label>
          <TourNationalitiesPicker
            nationalities={nationalities}
            value={selectedNationalities}
            onChange={setSelectedNationalities}
            totalGuests={totalGuests}
            required
            placeholder="Select nationality..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="adults">Adults *</Label>
          <NumberInput
            id="adults"
            value={watch('adults')}
            onChange={(value) => setValue('adults', value)}
            min={0}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="children">Children</Label>
          <NumberInput
            id="children"
            value={watch('children')}
            onChange={(value) => setValue('children', value)}
            min={0}
          />
        </div>

        <div className="space-y-2">
          <Label>Total Guests</Label>
          <Input value={totalGuests} disabled className="bg-muted" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="driverName">Driver Name</Label>
          <Input
            id="driverName"
            {...register('driverName')}
            placeholder="e.g., Mr Đức"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="clientPhone">Client Phone</Label>
          <Input
            id="clientPhone"
            {...register('clientPhone')}
            placeholder="e.g., +39 348 470 4413"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date *</Label>
          <DateInput
            id="startDate"
            value={watch('startDate')}
            onChange={(value) => setValue('startDate', value)}
            className={cn(getRequiredFieldClasses(!!errors.startDate))}
          />
          {errors.startDate && (
            <p className="text-sm text-destructive">{errors.startDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">End Date *</Label>
          <DateInput
            id="endDate"
            value={watch('endDate')}
            onChange={(value) => setValue('endDate', value)}
            className={cn(getRequiredFieldClasses(!!errors.endDate))}
          />
          {errors.endDate && (
            <p className="text-sm text-destructive">{errors.endDate.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2 mt-4">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          {...register('notes')}
          placeholder="Add any additional notes about this tour..."
          rows={4}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
        />
      </div>
    </>
  );
}
