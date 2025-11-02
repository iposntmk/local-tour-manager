import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { toast } from 'sonner';
import { cn, getRequiredFieldClasses } from '@/lib/utils';
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
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronsUpDown, Save } from 'lucide-react';
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

  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const tourCode = watch('tourCode');
  const clientName = watch('clientName');

  // Calculate total days dynamically based on start and end dates
  const totalDays = (() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // Include both start and end dates
  })();

  // Auto-save when critical fields change (dates, adults, children)
  const isInitialMount = useRef(true);
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Only auto-save if we have a tour (editing mode) and required fields are present
    if (!initialData || !tourCode || !clientName || !startDate || !endDate || !selectedCompanyId || !selectedGuideId || !selectedNationalityId) {
      return;
    }

    const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
    const selectedGuide = guides.find((g) => g.id === selectedGuideId);
    const selectedNationality = nationalities.find((n) => n.id === selectedNationalityId);

    if (!selectedCompany || !selectedGuide || !selectedNationality) {
      return;
    }

    // Auto-save with a small debounce
    const timeoutId = setTimeout(() => {
      const formData = {
        tourCode,
        clientName,
        startDate,
        endDate,
        adults: adults || 0,
        children: children || 0,
        driverName: watch('driverName'),
        clientPhone: watch('clientPhone'),
        companyRef: { id: selectedCompany.id, nameAtBooking: selectedCompany.name },
        guideRef: { id: selectedGuide.id, nameAtBooking: selectedGuide.name },
        clientNationalityRef: { id: selectedNationality.id, nameAtBooking: selectedNationality.name },
      };
      onSubmit(formData);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [startDate, endDate, adults, children]);

  const handleFormSubmit = (data: TourInput) => {
    // Validate required fields
    const missingFields: string[] = [];
    
    if (!data.tourCode?.trim()) {
      missingFields.push('Mã tour');
    }
    if (!data.clientName?.trim()) {
      missingFields.push('Tên khách hàng');
    }
    if (!data.startDate) {
      missingFields.push('Ngày bắt đầu');
    }
    if (!data.endDate) {
      missingFields.push('Ngày kết thúc');
    }
    if (!selectedCompanyId) {
      missingFields.push('Công ty');
    }
    if (!selectedGuideId) {
      missingFields.push('Hướng dẫn viên');
    }
    if (!selectedNationalityId) {
      missingFields.push('Quốc tịch');
    }

    if (missingFields.length > 0) {
      toast.error(`Vui lòng điền đầy đủ các trường bắt buộc: ${missingFields.join(', ')}`);
      return;
    }

    const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
    const selectedGuide = guides.find((g) => g.id === selectedGuideId);
    const selectedNationality = nationalities.find((n) => n.id === selectedNationalityId);

    if (!selectedCompany || !selectedGuide || !selectedNationality) {
      toast.error('Vui lòng chọn Công ty, Hướng dẫn viên và Quốc tịch hợp lệ');
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
          <Label htmlFor="tourCode">Mã tour *</Label>
          <Input
            id="tourCode"
            {...register('tourCode', { required: 'Bắt buộc nhập mã tour' })}
            placeholder="ví dụ: AT-250901"
            className={cn(getRequiredFieldClasses(!!errors.tourCode))}
          />
          {errors.tourCode && (
            <p className="text-sm text-destructive">{errors.tourCode.message}</p>
          )}
        </div>

        {/* Company */}
        <div className="space-y-2">
          <Label>Công ty *</Label>
          <Popover open={companyOpen} onOpenChange={setCompanyOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className={cn("w-full justify-between", getRequiredFieldClasses(!selectedCompanyId))}
              >
                {selectedCompany ? selectedCompany.name : 'Chọn công ty...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Tìm công ty..." />
                <CommandList>
                  <CommandEmpty>Không tìm thấy công ty.</CommandEmpty>
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
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Guide */}
        <div className="space-y-2">
          <Label>Hướng dẫn viên *</Label>
          <Popover open={guideOpen} onOpenChange={setGuideOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between"
              >
                {selectedGuide ? selectedGuide.name : 'Chọn hướng dẫn viên...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Tìm hướng dẫn viên..." />
                <CommandList>
                  <CommandEmpty>Không tìm thấy hướng dẫn viên.</CommandEmpty>
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
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Client Name */}
        <div className="space-y-2">
          <Label htmlFor="clientName">Tên khách hàng *</Label>
          <Input
            id="clientName"
            {...register('clientName', { required: 'Bắt buộc nhập tên khách hàng' })}
            placeholder="ví dụ: Bà Nguyễn Thị A"
          />
          {errors.clientName && (
            <p className="text-sm text-destructive">{errors.clientName.message}</p>
          )}
        </div>

        {/* Nationality */}
        <div className="space-y-2">
          <Label>Quốc tịch *</Label>
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
                  'Chọn quốc tịch...'
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Tìm quốc tịch..." />
                <CommandList>
                  <CommandEmpty>Không tìm thấy quốc tịch.</CommandEmpty>
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
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Adults */}
        <div className="space-y-2">
          <Label htmlFor="adults">Người lớn *</Label>
          <NumberInput
            id="adults"
            value={watch('adults')}
            onChange={(value) => setValue('adults', value)}
            min={0}
          />
        </div>

        {/* Children */}
        <div className="space-y-2">
          <Label htmlFor="children">Trẻ em</Label>
          <NumberInput
            id="children"
            value={watch('children')}
            onChange={(value) => setValue('children', value)}
            min={0}
          />
        </div>

        {/* Total Guests (display only) */}
        <div className="space-y-2">
          <Label>Tổng khách</Label>
          <Input value={totalGuests} disabled className="bg-muted" />
        </div>

        {/* Total Days from DB (display only) */}
        <div className="space-y-2">
          <Label>Tổng số ngày</Label>
          <Input value={totalDays > 0 ? `${totalDays} ngày` : ''} disabled className="bg-muted" />
        </div>

        {/* Driver Name */}
        <div className="space-y-2">
          <Label htmlFor="driverName">Tên tài xế</Label>
          <Input
            id="driverName"
            {...register('driverName')}
            placeholder="ví dụ: Anh Đức"
          />
        </div>

        {/* Client Phone */}
        <div className="space-y-2">
          <Label htmlFor="clientPhone">Điện thoại khách hàng</Label>
          <Input
            id="clientPhone"
            {...register('clientPhone')}
            placeholder="ví dụ: +84 912 345 678"
          />
        </div>

        {/* Start Date */}
        <div className="space-y-2">
          <Label htmlFor="startDate">Ngày bắt đầu *</Label>
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
          <Label htmlFor="endDate">Ngày kết thúc *</Label>
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

      {/* Notes - Full width */}
      <div className="space-y-2">
        <Label htmlFor="notes">Ghi chú</Label>
        <textarea
          id="notes"
          {...register('notes')}
          placeholder="Thêm ghi chú cho tour này..."
          rows={4}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
        />
      </div>

      {showSubmitButton && (
        <div className="flex justify-end">
          <Button type="submit" className="hover-scale">
            <Save className="h-4 w-4 mr-2" />
            Lưu thông tin tour
          </Button>
        </div>
      )}
    </form>
  );
}
