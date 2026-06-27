import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { TOUR_REFERENCE_GC_TIME, TOUR_REFERENCE_STALE_TIME, upsertById } from '@/lib/query-cache';
import type { Tour, TourInput, TourNationality } from '@/types/tour';
import type { Company, CompanyInput, Nationality, NationalityInput } from '@/types/master';

export type QuickAddTarget = 'company' | 'landOperator' | 'nationality';

const DEFAULT_LAND_OPERATOR_ID = '39c48c1c-9ec4-4db3-9fb9-d5e32176cbd2';

export const getInitialTourNationalities = (initialData?: Tour): TourNationality[] => {
  if (!initialData) return [];
  if (initialData.clientNationalities?.length) return initialData.clientNationalities;
  if (!initialData.clientNationalityRef?.id) return [];
  return [{ ...initialData.clientNationalityRef, paxCount: Math.max(initialData.totalGuests || 0, 1) }];
};

export function useTourInfoForm(initialData: Tour | undefined, onSubmit: (data: TourInput) => void) {
  const queryClient = useQueryClient();
  const { hasPermission, isGuide, userProfile } = useAuth();

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
  const canCreateNationalities = hasPermission('create_nationalities');

  const { register, handleSubmit: rhfHandleSubmit, watch, setValue, formState, control } = useForm<TourInput>({
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

  const referenceQueryOptions = { staleTime: TOUR_REFERENCE_STALE_TIME, gcTime: TOUR_REFERENCE_GC_TIME };
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => store.listCompanies({ status: 'active' }), ...referenceQueryOptions });
  const { data: guides = [] } = useQuery({ queryKey: ['guide-users'], queryFn: () => store.listGuideUsers({ status: 'active' }), ...referenceQueryOptions });
  const { data: nationalities = [] } = useQuery({ queryKey: ['nationalities'], queryFn: () => store.listNationalities({ status: 'active' }), ...referenceQueryOptions });

  const companyById = useMemo(() => {
    const map = new Map<string, Company>();
    for (const c of companies) map.set(c.id, c);
    return map;
  }, [companies]);

  const guideById = useMemo(() => {
    const map = new Map<string, (typeof guides)[number]>();
    for (const g of guides) map.set(g.id, g);
    return map;
  }, [guides]);

  useEffect(() => {
    if (initialData || selectedCompanyId || companies.length === 0) return;
    if (localStorage.getItem('tourform.saveCompanyPref') !== 'true') return;
    const savedCompany = companies.find((c) => c.id === localStorage.getItem('tourform.savedCompanyId'));
    if (savedCompany) { setSelectedCompanyId(savedCompany.id); setValue('companyRef', { id: savedCompany.id, nameAtBooking: savedCompany.name }); }
  }, [companies, initialData, selectedCompanyId, setValue]);

  useEffect(() => {
    if (initialData || selectedLandOperatorId || companies.length === 0) return;
    const lo = companyById.get(DEFAULT_LAND_OPERATOR_ID);
    if (lo) { setSelectedLandOperatorId(lo.id); setValue('landOperatorRef', { id: lo.id, nameAtBooking: lo.name }); }
  }, [companyById, initialData, selectedLandOperatorId, setValue]);

  useEffect(() => {
    if (initialData || selectedGuideId || guides.length === 0) return;
    const currentGuide = isGuide ? guideById.get(userProfile?.id ?? '') : undefined;
    const dg = currentGuide ?? guides.find((g) => g.isDefault);
    if (dg) { setSelectedGuideId(dg.id); setValue('guideRef', { id: dg.id, nameAtBooking: dg.name }); }
  }, [guides, initialData, isGuide, selectedGuideId, setValue, guideById, userProfile?.id]);

  const createCompanyMutation = useMutation({
    mutationFn: (data: CompanyInput) => store.createCompany(data),
    onSuccess: (company) => {
      queryClient.setQueryData<Company[]>(['companies'], (cur) => upsertById(cur, company));
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Đã thêm công ty');
    },
    onError: (e: Error) => toast.error(e.message || 'Không thể thêm công ty'),
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

  const adults = useWatch({ control, name: 'adults', defaultValue: initialData?.adults });
  const children = useWatch({ control, name: 'children', defaultValue: initialData?.children });
  const totalGuests = (adults || 0) + (children || 0);
  const startDate = useWatch({ control, name: 'startDate', defaultValue: initialData?.startDate });
  const endDate = useWatch({ control, name: 'endDate', defaultValue: initialData?.endDate });
  const totalDays = startDate && endDate
    ? Math.ceil(Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1
    : 0;

  const selectedCompany = companyById.get(selectedCompanyId);
  const selectedLandOperator = companyById.get(selectedLandOperatorId);
  const selectedGuide = guideById.get(selectedGuideId);

  const isInitialMount = useRef(true);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedPayloadRef = useRef<string | null>(null);

  const buildAutoSavePayload = useCallback((): TourInput | null => {
    const formValues = watch();
    const paxTotal = selectedNationalities.reduce((sum, n) => sum + (Number(n.paxCount) || 0), 0);
    const guests = (formValues.adults || 0) + (formValues.children || 0);
    if (!initialData || !formValues.tourCode || !formValues.clientName || !formValues.startDate || !formValues.endDate ||
      !selectedCompanyId || !selectedLandOperatorId || !selectedGuideId ||
      selectedNationalities.length === 0 || (guests > 0 && paxTotal !== guests)) return null;

    const sc = companyById.get(selectedCompanyId);
    const sl = companyById.get(selectedLandOperatorId);
    const sg = guideById.get(selectedGuideId);
    const pn = selectedNationalities[0];
    if (!sc || !sl || !sg || !pn) return null;

    return {
      tourCode: formValues.tourCode, clientName: formValues.clientName,
      startDate: formValues.startDate, endDate: formValues.endDate,
      adults: formValues.adults || 0, children: formValues.children || 0,
      driverName: formValues.driverName, clientPhone: formValues.clientPhone,
      companyRef: { id: sc.id, nameAtBooking: sc.name },
      landOperatorRef: { id: sl.id, nameAtBooking: sl.name },
      guideRef: { id: sg.id, nameAtBooking: sg.name },
      clientNationalityRef: { id: pn.id, nameAtBooking: pn.nameAtBooking },
      clientNationalities: selectedNationalities,
    };
  }, [watch, initialData, selectedCompanyId, selectedLandOperatorId, selectedGuideId, selectedNationalities, companyById, guideById]);

  const triggerAutoSave = useCallback(() => {
    const payload = buildAutoSavePayload();
    if (!payload) return;

    const payloadKey = JSON.stringify(payload);
    if (payloadKey === lastSavedPayloadRef.current) return;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      lastSavedPayloadRef.current = payloadKey;
      onSubmit(payload);
    }, 500);
  }, [buildAutoSavePayload, onSubmit]);

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

  const openQuickAdd = useCallback((target: QuickAddTarget) => {
    setCompanyOpen(false); setLandOperatorOpen(false); setGuideOpen(false);
    setQuickAddTarget(target);
  }, []);
  const handleQuickAddOpenChange = useCallback((open: boolean) => { if (!open) setQuickAddTarget(null); }, []);

  const handleCreateCompany = async (data: CompanyInput) => {
    if (!canCreateCompanies) { toast.error('Bạn không có quyền tạo công ty'); return; }
    const company = await createCompanyMutation.mutateAsync(data);
    const ref = { id: company.id, nameAtBooking: company.name };
    if (quickAddTarget === 'landOperator') { setSelectedLandOperatorId(company.id); setValue('landOperatorRef', ref); }
    else { setSelectedCompanyId(company.id); setValue('companyRef', ref); }
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

    const sc = companyById.get(selectedCompanyId);
    const sl = companyById.get(selectedLandOperatorId);
    const sg = guideById.get(selectedGuideId);
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
    canCreateCompanies, canCreateNationalities,
    companies, guides, nationalities,
    quickAddTarget, openQuickAdd, handleQuickAddOpenChange,
    handleCreateCompany, handleCreateNationality,
  };
}
