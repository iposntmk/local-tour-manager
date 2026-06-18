import { useEffect, useMemo, useState } from 'react';
import type { Tour } from '@/types/tour';
import { getTourStartYears } from '@/pages/tours/tour-list-filters';

const areSameYears = (left: number[], right: number[]) =>
  left.length === right.length && left.every((year, index) => year === right[index]);

export const useStableTourYears = (tours: Tour[], selectedYear?: string) => {
  const filteredYears = useMemo(() => {
    const years = getTourStartYears(tours);
    const selected = selectedYear && selectedYear !== 'all' ? Number(selectedYear) : NaN;
    return Number.isFinite(selected) ? Array.from(new Set([...years, selected])).sort((a, b) => b - a) : years;
  }, [selectedYear, tours]);
  const [knownYears, setKnownYears] = useState<number[]>([]);

  useEffect(() => {
    setKnownYears((current) => {
      const merged = Array.from(new Set([...current, ...filteredYears])).sort((a, b) => b - a);
      return areSameYears(current, merged) ? current : merged;
    });
  }, [filteredYears]);

  return knownYears.length > 0 ? knownYears : filteredYears;
};
