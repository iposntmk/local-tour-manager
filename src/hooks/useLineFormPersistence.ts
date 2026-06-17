import { useEffect, useMemo, useRef, useState } from 'react';

type CachedLineForm<T> = {
  formData: T;
  editingIndex: number | null;
};

const formCache = new Map<string, CachedLineForm<unknown>>();

const cloneValue = <T,>(value: T): T => {
  if (typeof value !== 'object' || value === null) return value;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

interface UseLineFormPersistenceOptions<T> {
  storageKey: string;
  fallback: T;
}

export function useLineFormPersistence<T>({ storageKey, fallback }: UseLineFormPersistenceOptions<T>) {
  const fallbackRef = useRef(fallback);
  useEffect(() => {
    fallbackRef.current = fallback;
  }, [fallback]);

  const initialCache = useMemo(() => formCache.get(storageKey) as CachedLineForm<T> | undefined, [storageKey]);

  const [formData, setFormData] = useState<T>(() => {
    if (initialCache) return initialCache.formData;
    return cloneValue(fallbackRef.current);
  });

  const [editingIndex, setEditingIndex] = useState<number | null>(() => initialCache?.editingIndex ?? null);

  useEffect(() => {
    formCache.set(storageKey, { formData, editingIndex });
  }, [storageKey, formData, editingIndex]);

  useEffect(() => {
    return () => {
      formCache.set(storageKey, { formData, editingIndex });
    };
  }, [storageKey, formData, editingIndex]);

  useEffect(() => {
    const cached = formCache.get(storageKey) as CachedLineForm<T> | undefined;
    if (!cached) return;
    setFormData(cached.formData);
    setEditingIndex(cached.editingIndex);
  }, [storageKey]);

  const replaceState = (nextForm: T, nextEditingIndex?: number | null) => {
    setFormData(nextForm);
    if (typeof nextEditingIndex !== 'undefined') {
      setEditingIndex(nextEditingIndex);
    }
  };

  const resetForm = (overrides?: Partial<T>) => {
    const base = cloneValue(fallbackRef.current);
    const next = overrides ? { ...base, ...overrides } : base;
    setFormData(next);
    setEditingIndex(null);
  };

  const clearPersistedState = () => {
    formCache.delete(storageKey);
  };

  return {
    formData,
    setFormData,
    editingIndex,
    setEditingIndex,
    replaceState,
    resetForm,
    clearPersistedState,
  } as const;
}
