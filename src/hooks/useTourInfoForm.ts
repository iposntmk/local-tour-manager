import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { upsertById } from '@/lib/query-cache';
import type { Tour, TourInput, TourNationality } from '@/types/tour';
import type { Company, CompanyInput, Guide, GuideInput, Nationality, NationalityInput } from '@/types/master';

export type QuickAddTarget = 'company' | 'landOperator' | 'guide' | 'nationality';

const DEFAULT_LAND_OPERATOR_ID = '39c48c1c-9ec4-4db3-9fb9-d5e32176cbd2';

export const getInitialTourNationalities = (initialData?: Tour): TourNationality[] => {
  if (!initialData) return [];
  if (initialData.clientNationalities?.length) return initialData.clientNationalities;
  if (!initialData.clientNationalityRef?.id) return [];
  return [{ ...initialData.clientNationalityRef, paxCount: Math.max(initialData.totalGuests || 0, 1) }];
};

export function useTourInfoForm(initialData: Tour | undefined, onSubmit: (data: TourInput) => void) {
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

  const { register, handleSubmit: rhfHandleSubmit, watch, setValue, formState } = useForm<TourInput>({
    defaultValues: initialData ? {
      tourCode: initialData.tourCode, companyRef: initialData.companyRef,
      landOperatorRef: initialData.landOperatorRef, guideRef: initialData.guideRef,
      clientNationalityRef: initialData.clientNationalityRef,
      clientNationalities: getInitialTourNationalities(initialData),
      clientName: initialData.clientName, adults: initialData.adults,
      children: initialData.children, driverName: initialData.driverName,
      clientPhone: initialData.clientPhone, startDate: initialData.startDate,
      endDate: initialData.endDate, notes: initialData.notes,
    } : { adults: 1, children: 0 },
  });

  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => store.listCompanies({ status: 'active' }) });
  const { data: guides = [] } = useQuery({ queryKey: ['guides'], queryFn: () => store.listGuides({ status: 'active' }) });
  const { data: languages = [] } = useQuery({ queryKey: ['languages'], queryFn: () => store.listLanguages({ status: 'active' }) });
  const { data: nationalities = [] } = useQuery({ queryKey: ['nationalities'], queryFn: () => store.listNationalities({ status: 'active' }) });

  useEffect(() => {
    if (initialData || selectedCompanyId || companies.length === 0) return;
    if (localStorage.getItem('tourform.saveCompanyPref') !== 'true') return;
    const savedCompany = companies.find((c) => c.id === localStorage.getItem('tourform.savedCompanyId'));
    if (savedCompany) { setSelectedCompanyId(savedCompany.id); setValue('companyRef', { id: savedCompany.id, nameAtBooking: savedCompany.name }); }
  }, [companies, initialData, selectedCompanyId, setValue]);

  useEffect(() => {
    if (initialData || selectedLandOperatorId || companies.length === 0) return;
    const lo = companies.find((c) => c.id === DEFAULT_LAND_OPERATOR_ID);
    if (lo) { setSelectedLandOperatorId(lo.id); setValue('landOperatorRef', { id: lo.id, nameAtBooking: lo.name }); }
  }, [companies, initialData, selectedLandOperatorId, setValue]);

  useEffect(() => {
    if (initialData || selectedGuideId || guides.length === 0) return;
    const dg = guides.find((g) => g.isDefault);
    if (dg) { setSelectedGuideId(dg.id); setValue('guideRef', { id: dg.id, nameAtBooking: dg.name }); }
  }, [guides, initialData, selectedGuideId, setValue]);

  const createCompanyMutation = useMutation({
    mutationFn: (data: CompanyInput) => store.createCompany(data),
    onSuccess: (company) => {
      queryClient.setQueryData<Company[]>(['companies'], (cur) => upsertById(cur, company));
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Đã thêm công ty');
    },
    onError: (e: Error) => toast.error(e.message || 'Không thể thêm công ty'),
  });

  const createGuideMutation = useMutation({
    mutationFn: (data: GuideInput) => store.createGuide(data),
    onSuccess: (guide) => {
      queryClient.setQueryData<Guide[]>(['guides'], (cur) => upsertById(cur, guide));
      queryClient.invalidateQueries({ queryKey: ['guides'] });
      toast.success('Đã thêm hướng dẫn viên');
    },
    onError: (e: Error) => toast.error(e.message || 'Không thể thêm hướng dẫn viên'),
  });

  const createNationalityMutation = useMutation({
    mutationFn: (data: NationalityInput) => store.createNationality(data),
    onSuccess: (nat) => {
      queryClient.setQueryData<Nationality[]>(['nationalities'], (cur) => upsertById(cur, nat));
      queryClient.invalidateQueries({ queryKey: ['nationalities'] });
      toast.success('Đã thêm quốc tịch');
    },
    onError: (e: Error) => toast.error(e.message || 'Không thể thêm quốc tịch'),
  });

  const adults = watch('adults');
  const children = watch('children');
  const totalGuests = (adults || 0) + (children || 0);
  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const totalDays = startDate && endDate
    ? Math.ceil(Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1
    : 0;

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
  const selectedLandOperator = companies.find((c) => c.id === selectedLandOperatorId);
  const selectedGuide = guides.find((g) => g.id === selectedGuideId);

  const isInitialMount = useRef(true);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerAutoSave = () => {
    const { tourCode, clientName, startDate, endDate, driverName, clientPhone, adults, children } = watch();
    const paxTotal = selectedNationalities.reduce((sum, n) => sum + (Number(n.paxCount) || 0), 0);
    const guests = (adults || 0) + (children || 0);
    if (!initialData || !tourCode || !clientName || !startDate || !endDate ||
      !selectedCompanyId || !selectedLandOperatorId || !selectedGuideId ||
      selectedNationalities.length === 0 || (guests > 0 && paxTotal !== guests)) return;

    const sc = companies.find((c) => c.id === selectedCompanyId);
    const sl = companies.find((c) => c.id === selectedLandOperatorId);
    const sg = guides.find((g) => g.id === selectedGuideId);
    const pn = selectedNationalities[0];
    if (!sc || !sl || !sg || !pn) return;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      onSubmit({
        tourCode, clientName, startDate, endDate, adults: adults || 0, children: children || 0,
        driverName, clientPhone,
        companyRef: { id: sc.id, nameAtBooking: sc.name },
        landOperatorRef: { id: sl.id, nameAtBooking: sl.name },
        guideRef: { id: sg.id, nameAtBooking: sg.name },
        clientNationalityRef: { id: pn.id, nameAtBooking: pn.nameAtBooking },
        clientNationalities: selectedNationalities,
      });
    }, 500);
  };

  useEffect(() => {
    const sub = watch(() => {
      if (isInitialMount.current) { isInitialMount.current = false; return; }
      triggerAutoSave();
    });
    return () => { sub.unsubscribe(); if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch, initialData, selectedCompanyId, selectedLandOperatorId, selectedGuideId, selectedNationalities, totalGuests]);

  useEffect(() => {
    if (isInitialMount.current) return;
    triggerAutoSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId, selectedLandOperatorId, selectedGuideId, selectedNationalities]);

  const openQuickAdd = (target: QuickAddTarget) => {
    setCompanyOpen(false); setLandOperatorOpen(false); setGuideOpen(false);
    setQuickAddTarget(target);
  };
  const handleQuickAddOpenChange = (open: boolean) => { if (!open) setQuickAddTarget(null); };

  const handleCreateCompany = async (data: CompanyInput) => {
    if (!canCreateCompanies) { toast.error('Bạn không có quyền tạo công ty'); return; }
    const company = await createCompanyMutation.mutateAsync(data);
    const ref = { id: company.id, nameAtBooking: company.name };
    if (quickAddTarget === 'landOperator') { setSelectedLandOperatorId(company.id); setValue('landOperatorRef', ref); }
    else { setSelectedCompanyId(company.id); setValue('companyRef', ref); }
  };

  const handleCreateGuide = async (data: GuideInput) => {
    if (!canCreateGuides) { toast.error('Bạn không có quyền tạo hướng dẫn viên'); return; }
    const guide = await createGuideMutation.mutateAsync(data);
    setSelectedGuideId(guide.id);
    setValue('guideRef', { id: guide.id, nameAtBooking: guide.name });
  };

  const handleCreateNationality = async (data: NationalityInput) => {
    if (!canCreateNationalities) { toast.error('Bạn không có quyền tạo quốc tịch'); return; }
    const nat = await createNationalityMutation.mutateAsync(data);
    const next = [{ id: nat.id, nameAtBooking: nat.name, paxCount: Math.max(totalGuests || 1, 1) }];
    setSelectedNationalities(next);
    setValue('clientNationalityRef', { id: nat.id, nameAtBooking: nat.name });
    setValue('clientNationalities', next);
  };

  const handleFormSubmit = (data: TourInput) => {
    const missing: string[] = [];
    if (!data.tourCode?.trim()) missing.push('Mã tour');
    if (!data.clientName?.trim()) missing.push('Tên khách hàng');
    if (!data.startDate) missing.push('Ngày bắt đầu');
    if (!data.endDate) missing.push('Ngày kết thúc');
    if (!selectedCompanyId) missing.push('Công ty mẹ');
    if (!selectedLandOperatorId) missing.push('Công ty land tour');
    if (!selectedGuideId) missing.push('Hướng dẫn viên');
    if (selectedNationalities.length === 0) missing.push('Quốc tịch');
    if (missing.length > 0) { toast.error(`Vui lòng điền đầy đủ các trường bắt buộc: ${missing.join(', ')}`); return; }

    const paxTotal = selectedNationalities.reduce((sum, n) => sum + (Number(n.paxCount) || 0), 0);
    const guests = (data.adults || 0) + (data.children || 0);
    if (guests > 0 && paxTotal !== guests) { toast.error('Tổng pax theo quốc tịch phải bằng tổng khách'); return; }

    const sc = companies.find((c) => c.id === selectedCompanyId);
    const sl = companies.find((c) => c.id === selectedLandOperatorId);
    const sg = guides.find((g) => g.id === selectedGuideId);
    const pn = selectedNationalities[0];
    if (!sc || !sl || !sg || !pn) { toast.error('Vui lòng chọn Công ty mẹ, Công ty land tour, Hướng dẫn viên và Quốc tịch hợp lệ'); return; }

    onSubmit({
      ...data,
      companyRef: { id: sc.id, nameAtBooking: sc.name },
      landOperatorRef: { id: sl.id, nameAtBooking: sl.name },
      guideRef: { id: sg.id, nameAtBooking: sg.name },
      clientNationalityRef: { id: pn.id, nameAtBooking: pn.nameAtBooking },
      clientNationalities: selectedNationalities,
    });
  };

  const handleSavePrefChange = (checked: boolean | 'indeterminate') => {
    const enabled = checked === true;
    setSaveCompanyPref(enabled);
    localStorage.setItem('tourform.saveCompanyPref', String(enabled));
    if (enabled && selectedCompanyId) localStorage.setItem('tourform.savedCompanyId', selectedCompanyId);
    else localStorage.removeItem('tourform.savedCompanyId');
  };

  useEffect(() => {
    if (saveCompanyPref && selectedCompanyId) localStorage.setItem('tourform.savedCompanyId', selectedCompanyId);
  }, [selectedCompanyId, saveCompanyPref]);

  return {
    register, watch, setValue, formState,
    onFormSubmit: rhfHandleSubmit(handleFormSubmit),
    companyOpen, setCompanyOpen,
    landOperatorOpen, setLandOperatorOpen,
    guideOpen, setGuideOpen,
    selectedCompanyId, setSelectedCompanyId,
    selectedLandOperatorId, setSelectedLandOperatorId,
    selectedGuideId, setSelectedGuideId,
    selectedCompany, selectedLandOperator, selectedGuide,
    selectedNationalities, setSelectedNationalities,
    totalGuests, totalDays,
    saveCompanyPref, handleSavePrefChange,
    canCreateCompanies, canCreateGuides, canCreateNationalities,
    companies, guides, languages, nationalities,
    quickAddTarget, openQuickAdd, handleQuickAddOpenChange,
    handleCreateCompany, handleCreateGuide, handleCreateNationality,
  };
}
