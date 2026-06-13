import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/currency-utils';
import { formatDateDisplay } from '@/lib/date-utils';
import { buildServiceItems, formatNgayRangeForExcel } from '@/lib/excel/excel-helpers';
import { TOUR_SHEET_COLUMNS, TOUR_SHEET_HEADER_GROUPS } from '@/lib/excel/tour-sheet-layout';
import { cn } from '@/lib/utils';
import type { Allowance, Tour } from '@/types/tour';

interface CombinedTabProps {
  tour: Tour | null | undefined;
}

const sheetCellClass = 'border border-slate-300 px-2 py-1 align-middle text-xs';
const totalCellClass = 'border border-slate-300 bg-yellow-200 px-2 py-1 text-xs font-bold';

const formatSheetDate = (date?: string) => date ? formatDateDisplay(date) : '';

const getAllowanceDays = (allowance: Allowance) =>
  allowance.quantity && allowance.quantity > 0 ? allowance.quantity : 1;

const buildSummaryRows = (tour: Tour, totalTabs: number) => {
  const advancePayment = tour.summary?.advancePayment ?? 0;
  const collectionsForCompany = tour.summary?.collectionsForCompany ?? 0;
  const companyTip = tour.summary?.companyTip ?? 0;
  if (advancePayment === 0 && collectionsForCompany === 0 && companyTip === 0) return [];

  const afterAdvance = totalTabs - advancePayment;
  const afterCollections = afterAdvance - collectionsForCompany;
  const afterTip = afterCollections + companyTip;
  return [
    { label: 'Tổng chi phí + công tác phí', value: totalTabs },
    { label: '- Tạm ứng', value: advancePayment, labelClass: 'text-red-600' },
    { label: 'Sau tạm ứng', value: afterAdvance },
    { label: '- Thu của khách', value: collectionsForCompany, labelClass: 'text-red-600' },
    { label: 'Sau thu khách', value: afterCollections },
    { label: '+ Tip HDV nhận từ công ty', value: companyTip, labelClass: 'text-blue-700' },
    { label: 'Sau tip HDV', value: afterTip },
    { label: 'TỔNG CỘNG', value: afterTip, rowClass: 'bg-blue-100' },
  ];
};

export function CombinedTab({ tour }: CombinedTabProps) {
  if (!tour) return null;

  const totalGuests = tour.totalGuests || tour.adults + tour.children;
  const { serviceItems, allowanceItems } = buildServiceItems(tour);
  const rowCount = Math.max(serviceItems.length, allowanceItems.length);
  const serviceTotal = serviceItems.reduce((sum, item) => sum + item.price * (item.guests ?? totalGuests), 0);
  const allowanceTotal = allowanceItems.reduce((sum, item) => sum + item.price * getAllowanceDays(item), 0);
  const totalTabs = serviceTotal + allowanceTotal;
  const summaryRows = buildSummaryRows(tour, totalTabs);
  const isDraft = tour.settlementStatus !== 'approved' && tour.settlementStatus !== 'closed';

  return (
    <div className="space-y-3">
      {isDraft && (
        <div className="border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          BẢN NHÁP - CHƯA DUYỆT
        </div>
      )}
      <div className="overflow-x-auto border bg-background">
        <Table className="min-w-[1560px] border-collapse text-xs">
          <TableHeader>
            <TableRow>
              {TOUR_SHEET_HEADER_GROUPS.map((group) => (
                <TableHead
                  key={group.label}
                  colSpan={group.colSpan}
                  className={cn('border border-slate-300 px-2 py-2 text-center text-xs font-bold uppercase', group.className)}
                >
                  {group.label}
                </TableHead>
              ))}
            </TableRow>
            <TableRow className="bg-sky-400">
              {TOUR_SHEET_COLUMNS.map((column) => (
                <TableHead
                  key={column.key}
                  className="border border-slate-300 px-2 py-2 text-center text-xs font-bold text-slate-950"
                  style={{ width: `${column.width * 8}px` }}
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rowCount }).map((_, index) => {
              const service = serviceItems[index];
              const allowance = allowanceItems[index];
              const serviceQuantity = service ? service.guests ?? totalGuests : undefined;
              const allowanceDays = allowance ? getAllowanceDays(allowance) : undefined;

              return (
                <TableRow key={`combined-${index}`}>
                  <TableCell className={sheetCellClass}>
                    {index === 0 ? `${tour.tourCode} x ${totalGuests} pax` : ''}
                  </TableCell>
                  <TableCell className={sheetCellClass}>
                    {index === 0 ? formatNgayRangeForExcel(tour.startDate, tour.endDate) : ''}
                  </TableCell>
                  <TableCell className={cn(sheetCellClass, service?.price === 0 && 'bg-red-100')}>
                    {service?.name || ''}
                  </TableCell>
                  <TableCell className={sheetCellClass}>{formatSheetDate(service?.date)}</TableCell>
                  <TableCell className={cn(sheetCellClass, 'text-right', service?.price === 0 && 'bg-red-100')}>
                    {service ? formatCurrency(service.price) : ''}
                  </TableCell>
                  <TableCell className={cn(sheetCellClass, 'text-center')}>{serviceQuantity ?? ''}</TableCell>
                  <TableCell className={cn(sheetCellClass, 'text-right font-semibold')}>
                    {service ? formatCurrency(service.price * (serviceQuantity ?? 0)) : ''}
                  </TableCell>
                  <TableCell className={cn(sheetCellClass, allowance?.price === 0 && 'bg-red-100')}>
                    {allowance?.name || ''}
                  </TableCell>
                  <TableCell className={sheetCellClass}>{formatSheetDate(allowance?.date)}</TableCell>
                  <TableCell className={cn(sheetCellClass, 'text-center')}>{allowanceDays ?? ''}</TableCell>
                  <TableCell className={cn(sheetCellClass, 'text-right', allowance?.price === 0 && 'bg-red-100')}>
                    {allowance ? formatCurrency(allowance.price) : ''}
                  </TableCell>
                  <TableCell className={cn(sheetCellClass, 'text-right font-semibold')}>
                    {allowance ? formatCurrency(allowance.price * (allowanceDays ?? 1)) : ''}
                  </TableCell>
                  <TableCell className={sheetCellClass} />
                  <TableCell className={cn(sheetCellClass, 'text-center')}>{service ? service.vatRate || 0 : ''}</TableCell>
                  <TableCell className={cn(sheetCellClass, 'text-right')}>
                    {service ? formatCurrency(service.vatAmount || 0) : ''}
                  </TableCell>
                  <TableCell className={cn(sheetCellClass, 'whitespace-pre-wrap')}>{service?.guideNote || ''}</TableCell>
                  <TableCell className={cn(sheetCellClass, 'text-center')}>{service ? service.attachmentCount || 0 : ''}</TableCell>
                </TableRow>
              );
            })}
            <TableRow>
              <TableCell colSpan={2} className={totalCellClass} />
              <TableCell colSpan={4} className={totalCellClass}>dịch vụ</TableCell>
              <TableCell className={cn(totalCellClass, 'text-right')}>{formatCurrency(serviceTotal)}</TableCell>
              <TableCell className={totalCellClass}>công tác phí</TableCell>
              <TableCell colSpan={3} className={totalCellClass} />
              <TableCell className={cn(totalCellClass, 'text-right')}>{formatCurrency(allowanceTotal)}</TableCell>
              <TableCell className={cn(totalCellClass, 'text-right')}>{formatCurrency(totalTabs)}</TableCell>
              <TableCell colSpan={4} className={totalCellClass} />
            </TableRow>
            {summaryRows.length > 0 && (
              <TableRow>
                <TableCell colSpan={11} className={sheetCellClass} />
                <TableCell colSpan={2} className={totalCellClass + ' text-center'}>TỔNG KẾT</TableCell>
                <TableCell colSpan={4} className={sheetCellClass} />
              </TableRow>
            )}
            {summaryRows.map((row) => (
              <TableRow key={row.label} className={row.rowClass}>
                <TableCell colSpan={11} className={sheetCellClass} />
                <TableCell className={cn(sheetCellClass, 'text-right font-bold', row.labelClass)}>{row.label}</TableCell>
                <TableCell className={cn(sheetCellClass, 'text-right font-bold')}>{formatCurrency(row.value)}</TableCell>
                <TableCell colSpan={4} className={sheetCellClass} />
              </TableRow>
            ))}
            {tour.notes && (
              <TableRow>
                <TableCell colSpan={17} className="border border-slate-300 bg-slate-100 px-2 py-2 text-sm text-red-600">
                  Ghi chú: {tour.notes}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
