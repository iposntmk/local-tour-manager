import type { ReactNode } from 'react';
import { FormCollapsible } from '@/components/tours/FormCollapsible';
import {
  TOUR_LINE_DESKTOP_LIST,
  TOUR_LINE_EMPTY_STATE,
  TOUR_LINE_LIST_CARD,
  TOUR_LINE_LIST_HEADER,
  TOUR_LINE_LIST_TITLE,
  TOUR_LINE_MOBILE_LIST,
  TOUR_LINE_TAB_STACK,
} from '@/lib/tab-styles';

interface TourLineTabLayoutProps {
  form?: ReactNode;
  formVisible?: boolean;
  autoOpenKey?: number | null;
  beforeList?: ReactNode;
  title: string;
  emptyMessage: string;
  itemCount: number;
  desktop: ReactNode;
  mobile: ReactNode;
}

export function TourLineTabLayout({
  form,
  formVisible = false,
  autoOpenKey = null,
  beforeList,
  title,
  emptyMessage,
  itemCount,
  desktop,
  mobile,
}: TourLineTabLayoutProps) {
  return (
    <div className={TOUR_LINE_TAB_STACK}>
      {beforeList}

      {formVisible && form && (
        <FormCollapsible autoOpenKey={autoOpenKey}>{form}</FormCollapsible>
      )}

      <div className={TOUR_LINE_LIST_CARD}>
        <div className={TOUR_LINE_LIST_HEADER}>
          <h3 className={TOUR_LINE_LIST_TITLE}>{title}</h3>
        </div>
        {itemCount === 0 ? (
          <div className={TOUR_LINE_EMPTY_STATE}>{emptyMessage}</div>
        ) : (
          <>
            <div className={TOUR_LINE_DESKTOP_LIST}>{desktop}</div>
            <div className={TOUR_LINE_MOBILE_LIST}>{mobile}</div>
          </>
        )}
      </div>
    </div>
  );
}
