import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Check, ChevronsUpDown, Plus, Save } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { CompanyDialog } from '@/components/companies/CompanyDialog';
import { GuideDialog } from '@/components/guides/GuideDialog';
import { NationalityDialog } from '@/components/nationalities/NationalityDialog';
import type { Tour, TourInput, TourNationality } from '@/types/tour';
import type { Company, CompanyInput, Guide, GuideInput, Nationality, NationalityInput } from '@/types/master';
import { TourNationalitiesPicker } from '@/components/tours/TourNationalitiesPicker';
import { upsertById } from '@/lib/query-cache';

interface TourInfoFormProps {
  initialData?: Tour;
  onSubmit: (data: TourInput) => void;
  showSubmitButton?: boolean;
}

type QuickAddTarget = 'company' | 'landOperator' | 'guide' | 'nationality';

const DEFAULT_LAND_OPERATOR_ID = '39c48c1c-9ec4-4db3-9fb9-d5e32176cbd2';

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

export function TourInfoForm({ initialData, onSubmit, showSubmitButton = true }: TourInfoFormProps) {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [companyOpen, setCompanyOpen] = useState(false);
  const [landOperatorOpen, setLandOperatorOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [quickAddTarget, setQuickAddTarget] = useState<QuickAddTarget | null>(null);

  const [selectedCompanyId, setSelectedCompanyId] = useState(initialData?.companyRef.id || '');
  const [selectedLandOperatorId, setSelectedLandOperatorId] = useState(initialData?.landOperatorRef?.id || '');
  const [selectedGuideId, setSelectedGuideId] = useState(initialData?.guideRef.id || '');
  const [selectedNationalities, setSelectedNationalities] = useState<TourNationality[]>(() => getInitialTourNationalities(initialData));
  const [saveCompanyPref, setSaveCompanyPref] = useState(() => localStorage.getItem('tourform.saveCompanyPref') === 'true');
  const canCreateCompanies = hasPermission('create_companies');
  const canCreateGuides = hasPermission('create_guides');
  const canCreateNationalities = hasPermission('create_nationalities');

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<TourInput>({
    defaultValues: initialData ? {
      tourCode: initialData.tourCode,
      companyRef: initialData.companyRef,
      landOperatorRef: initialData.landOperatorRef,
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
    if (initialData || selectedCompanyId || companies.length === 0) return;

    const savedPref = localStorage.getItem('tourform.saveCompanyPref') === 'true';
    if (savedPref) {
      const savedCompanyId = localStorage.getItem('tourform.savedCompanyId');
      if (savedCompanyId) {
        const savedCompany = companies.find((c) => c.id === savedCompanyId);
        if (savedCompany) {
          setSelectedCompanyId(savedCompany.id);
          setValue('companyRef', { id: savedCompany.id, nameAtBooking: savedCompany.name });
        }
      }
    }
  }, [companies, initialData, selectedCompanyId, setValue]);

  useEffect(() => {
    if (initialData || selectedLandOperatorId || companies.length === 0) return;

    const defaultLandOperator = companies.find((c) => c.id === DEFAULT_LAND_OPERATOR_ID);
    if (!defaultLandOperator) return;

    setSelectedLandOperatorId(defaultLandOperator.id);
    setValue('landOperatorRef', { id: defaultLandOperator.id, nameAtBooking: defaultLandOperator.name });
  }, [companies, initialData, selectedLandOperatorId, setValue]);

  const { data: guides = [] } = useQuery({
    queryKey: ['guides'],
    queryFn: () => store.listGuides({ status: 'active' }),
  });

  const { data: languages = [] } = useQuery({
    queryKey: ['languages'],
    queryFn: () => store.listLanguages({ status: 'active' }),
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

  const createCompanyMutation = useMutation({
    mutationFn: (data: CompanyInput) => store.createCompany(data),
    onSuccess: (company) => {
      queryClient.setQueryData<Company[]>(['companies'], (current) => upsertById(current, company));
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Đã thêm công ty');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Không thể thêm công ty');
    },
  });

  const createGuideMutation = useMutation({
    mutationFn: (data: GuideInput) => store.createGuide(data),
    onSuccess: (guide) => {
      queryClient.setQueryData<Guide[]>(['guides'], (current) => upsertById(current, guide));
      queryClient.invalidateQueries({ queryKey: ['guides'] });
      toast.success('Đã thêm hướng dẫn viên');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Không thể thêm hướng dẫn viên');
    },
  });

  const createNationalityMutation = useMutation({
    mutationFn: (data: NationalityInput) => store.createNationality(data),
    onSuccess: (nationality) => {
      queryClient.setQueryData<Nationality[]>(['nationalities'], (current) => upsertById(current, nationality));
      queryClient.invalidateQueries({ queryKey: ['nationalities'] });
      toast.success('Đã thêm quốc tịch');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Không thể thêm quốc tịch');
    },
  });

  const adults = watch('adults');
  const children = watch('children');
  const totalGuests = (adults || 0) + (children || 0);

  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const tourCode = watch('tourCode');
  const clientName = watch('clientName');

  const openQuickAdd = (target: QuickAddTarget) => {
    setCompanyOpen(false);
    setLandOperatorOpen(false);
    setGuideOpen(false);
    setQuickAddTarget(target);
  };

  const handleQuickAddOpenChange = (open: boolean) => {
    if (!open) {
      setQuickAddTarget(null);
    }
  };

  const handleCreateCompany = async (data: CompanyInput) => {
    if (!canCreateCompanies) {
      toast.error('Bạn không có quyền tạo công ty');
      return;
    }

    const company = await createCompanyMutation.mutateAsync(data);
    const companyRef = { id: company.id, nameAtBooking: company.name };

    if (quickAddTarget === 'landOperator') {
      setSelectedLandOperatorId(company.id);
      setValue('landOperatorRef', companyRef);
      return;
    }

    setSelectedCompanyId(company.id);
    setValue('companyRef', companyRef);
  };

  const handleCreateGuide = async (data: GuideInput) => {
    if (!canCreateGuides) {
      toast.error('Bạn không có quyền tạo hướng dẫn viên');
      return;
    }

    const guide = await createGuideMutation.mutateAsync(data);
    setSelectedGuideId(guide.id);
    setValue('guideRef', { id: guide.id, nameAtBooking: guide.name });
  };

  const handleCreateNationality = async (data: NationalityInput) => {
    if (!canCreateNationalities) {
      toast.error('Bạn không có quyền tạo quốc tịch');
      return;
    }

    const nationality = await createNationalityMutation.mutateAsync(data);
    const nextNationalities = [{
      id: nationality.id,
      nameAtBooking: nationality.name,
      paxCount: Math.max(totalGuests || 1, 1),
    }];

    setSelectedNationalities(nextNationalities);
    setValue('clientNationalityRef', { id: nationality.id, nameAtBooking: nationality.name });
    setValue('clientNationalities', nextNationalities);
  };

  // Calculate total days dynamically based on start and end dates
  const totalDays = (() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // Include both start and end dates
  })();

  // Auto-save on any field change (matches SummaryTab instant-save pattern)
  const isInitialMount = useRef(true);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Shared auto-save: collects current form + combobox values and submits with debounce
  const triggerAutoSave = () => {
    const formValues = watch();
    const { tourCode, clientName, startDate, endDate, driverName, clientPhone, adults, children } = formValues;

    const nationalityPaxTotal = selectedNationalities.reduce((sum, item) => sum + (Number(item.paxCount) || 0), 0);
    if (
      !initialData ||
      !tourCode ||
      !clientName ||
      !startDate ||
      !endDate ||
      !selectedCompanyId ||
      !selectedLandOperatorId ||
      !selectedGuideId ||
      selectedNationalities.length === 0 ||
      (totalGuests > 0 && nationalityPaxTotal !== totalGuests)
    ) {
      return;
    }

    const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
    const selectedLandOperator = selectedLandOperatorId
      ? companies.find((c) => c.id === selectedLandOperatorId)
      : undefined;
    const selectedGuide = guides.find((g) => g.id === selectedGuideId);
    const primaryNationality = selectedNationalities[0];

    if (!selectedCompany || !selectedLandOperator || !selectedGuide || !primaryNationality) {
      return;
    }

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      onSubmit({
        tourCode,
        clientName,
        startDate,
        endDate,
        adults: adults || 0,
        children: children || 0,
        driverName,
        clientPhone,
        companyRef: { id: selectedCompany.id, nameAtBooking: selectedCompany.name },
        landOperatorRef: { id: selectedLandOperator.id, nameAtBooking: selectedLandOperator.name },
        guideRef: { id: selectedGuide.id, nameAtBooking: selectedGuide.name },
        clientNationalityRef: { id: primaryNationality.id, nameAtBooking: primaryNationality.nameAtBooking },
        clientNationalities: selectedNationalities,
      });
    }, 500);
  };

  // Subscribe to all form field changes (text inputs, date inputs, number inputs)
  useEffect(() => {
    const subscription = watch(() => {
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }
      triggerAutoSave();
    });

    return () => {
      subscription.unsubscribe();
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch, initialData, selectedCompanyId, selectedLandOperatorId, selectedGuideId, selectedNationalities, totalGuests]);

  // Auto-save when combobox selections change (company, land operator, guide, nationality)
  useEffect(() => {
    if (isInitialMount.current) return;
    triggerAutoSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId, selectedLandOperatorId, selectedGuideId, selectedNationalities]);

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
      missingFields.push('Công ty mẹ');
    }
    if (!selectedLandOperatorId) {
      missingFields.push('Công ty land tour');
    }
    if (!selectedGuideId) {
      missingFields.push('Hướng dẫn viên');
    }
    if (selectedNationalities.length === 0) {
      missingFields.push('Quốc tịch');
    }

    if (missingFields.length > 0) {
      toast.error(`Vui lòng điền đầy đủ các trường bắt buộc: ${missingFields.join(', ')}`);
      return;
    }

    const nationalityPaxTotal = selectedNationalities.reduce((sum, item) => sum + (Number(item.paxCount) || 0), 0);
    const formTotalGuests = (data.adults || 0) + (data.children || 0);
    if (formTotalGuests > 0 && nationalityPaxTotal !== formTotalGuests) {
      toast.error('Tổng pax theo quốc tịch phải bằng tổng khách');
      return;
    }

    const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
    const selectedLandOperator = selectedLandOperatorId
      ? companies.find((c) => c.id === selectedLandOperatorId)
      : undefined;
    const selectedGuide = guides.find((g) => g.id === selectedGuideId);
    const primaryNationality = selectedNationalities[0];

    if (!selectedCompany || !selectedLandOperator || !selectedGuide || !primaryNationality) {
      toast.error('Vui lòng chọn Công ty mẹ, Công ty land tour, Hướng dẫn viên và Quốc tịch hợp lệ');
      return;
    }

    onSubmit({
      ...data,
      companyRef: { id: selectedCompany.id, nameAtBooking: selectedCompany.name },
      landOperatorRef: { id: selectedLandOperator.id, nameAtBooking: selectedLandOperator.name },
      guideRef: { id: selectedGuide.id, nameAtBooking: selectedGuide.name },
      clientNationalityRef: { id: primaryNationality.id, nameAtBooking: primaryNationality.nameAtBooking },
      clientNationalities: selectedNationalities,
    });
  };

  const handleSavePrefChange = (checked: boolean | 'indeterminate') => {
    const enabled = checked === true;
    setSaveCompanyPref(enabled);
    localStorage.setItem('tourform.saveCompanyPref', String(enabled));
    if (enabled && selectedCompanyId) {
      localStorage.setItem('tourform.savedCompanyId', selectedCompanyId);
    } else {
      localStorage.removeItem('tourform.savedCompanyId');
    }
  };

  useEffect(() => {
    if (saveCompanyPref && selectedCompanyId) {
      localStorage.setItem('tourform.savedCompanyId', selectedCompanyId);
    }
  }, [selectedCompanyId, saveCompanyPref]);

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
  const selectedLandOperator = companies.find((c) => c.id === selectedLandOperatorId);
  const selectedGuide = guides.find((g) => g.id === selectedGuideId);

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

        {/* Công ty mẹ */}
        <div className="space-y-2">
          <Label>Công ty mẹ *</Label>
          <div className="flex gap-2">
            <Popover open={companyOpen} onOpenChange={setCompanyOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  className={cn("min-w-0 flex-1 justify-between", getRequiredFieldClasses(!selectedCompanyId))}
                >
                  <span className="truncate">{selectedCompany ? selectedCompany.name : 'Chọn công ty mẹ...'}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Tìm công ty mẹ..." />
                  <CommandList>
                    <CommandEmpty>Không tìm thấy công ty mẹ.</CommandEmpty>
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
            {canCreateCompanies && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Thêm công ty mẹ"
                title="Thêm công ty mẹ"
                onClick={() => openQuickAdd('company')}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
          {!initialData && (
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="save-company-pref"
                checked={saveCompanyPref}
                onCheckedChange={handleSavePrefChange}
              />
              <Label
                htmlFor="save-company-pref"
                className="cursor-pointer text-sm text-muted-foreground select-none"
              >
                Lưu công ty mẹ cho lần tạo tour tiếp theo
              </Label>
            </div>
          )}
        </div>

        {/* Công ty land tour */}
        <div className="space-y-2">
          <Label>Công ty land tour *</Label>
          <div className="flex gap-2">
            <Popover open={landOperatorOpen} onOpenChange={setLandOperatorOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  className={cn("min-w-0 flex-1 justify-between", getRequiredFieldClasses(!selectedLandOperatorId))}
                >
                  <span className="truncate">
                    {selectedLandOperator ? selectedLandOperator.name : 'Chọn công ty land tour...'}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Tìm công ty land tour..." />
                  <CommandList>
                    <CommandEmpty>Không tìm thấy công ty land tour.</CommandEmpty>
                    <CommandGroup>
                      {companies.map((company) => (
                        <CommandItem
                          key={company.id}
                          value={company.name}
                          onSelect={() => {
                            setSelectedLandOperatorId(company.id);
                            setLandOperatorOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selectedLandOperatorId === company.id ? 'opacity-100' : 'opacity-0'
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
            {canCreateCompanies && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Thêm công ty land tour"
                title="Thêm công ty land tour"
                onClick={() => openQuickAdd('landOperator')}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Guide */}
        <div className="space-y-2">
          <Label>Hướng dẫn viên *</Label>
          <div className="flex gap-2">
            <Popover open={guideOpen} onOpenChange={setGuideOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  className="min-w-0 flex-1 justify-between"
                >
                  <span className="truncate">{selectedGuide ? selectedGuide.name : 'Chọn hướng dẫn viên...'}</span>
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
            {canCreateGuides && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Thêm hướng dẫn viên"
                title="Thêm hướng dẫn viên"
                onClick={() => openQuickAdd('guide')}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
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
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <TourNationalitiesPicker
                nationalities={nationalities}
                value={selectedNationalities}
                onChange={setSelectedNationalities}
                totalGuests={totalGuests}
                required
              />
            </div>
            {canCreateNationalities && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Thêm quốc tịch"
                title="Thêm quốc tịch"
                onClick={() => openQuickAdd('nationality')}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
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

      <CompanyDialog
        open={quickAddTarget === 'company' || quickAddTarget === 'landOperator'}
        onOpenChange={handleQuickAddOpenChange}
        onSubmit={handleCreateCompany}
      />
      <GuideDialog
        open={quickAddTarget === 'guide'}
        onOpenChange={handleQuickAddOpenChange}
        languages={languages}
        onSubmit={handleCreateGuide}
      />
      <NationalityDialog
        open={quickAddTarget === 'nationality'}
        onOpenChange={handleQuickAddOpenChange}
        onSubmit={handleCreateNationality}
      />
    </form>
  );
}
