import { Fragment, useMemo, useState } from 'react';
import { AlertTriangle, CheckCheck, Edit2, FileText, MessageSquare, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import { getLineGuests, getLineTotal } from '@/lib/tour-line-utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLineReview } from '@/hooks/useLineReview';
import { LineQuickReview } from './LineQuickReview';
import { SummaryLineAttachmentsDialog } from './SummaryLineAttachmentsDialog';
import type {
  Allowance,
  AttachmentLineType,
  Destination,
  Expense,
  LineStatus,
  LineType,
  Meal,
  Tour,
  TourLineAttachment,
} from '@/types/tour';
import {
  canViewTourLineField,
  type Access,
  type TourLineFieldKey,
} from '@/lib/tour-detail-permissions';

export type SummaryLineType = AttachmentLineType | 'allowance';
type ReviewLine = Destination | Meal | Expense | Allowance;

interface SummaryLineReviewTableProps {
  tour: Tour;
  onEditLine?: (lineType: SummaryLineType, index: number) => void;
  canEditLine?: (lineType: SummaryLineType) => boolean;
  evidenceAccess?: Access;
  lineFieldAccess?: Partial<Record<TourLineFieldKey, Access>>;
  lineTypes?: SummaryLineType[];
  title?: string;
}

interface Group {
  title: string;
  lineType: SummaryLineType;
  className: string;
  rows: Array<{ line: ReviewLine; index: number }>;
}

const SUMMARY_STATUS_LABELS: Partial<Record<LineStatus, string>> = {
  valid: 'Đã duyệt',
  need_more: 'Chưa đúng',
  invalid: 'Chưa đúng',
};

type StatusFilter = 'hide_approved' | 'all' | 'pending' | 'invalid';
const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'hide_approved', label: 'Ẩn đã duyệt' },
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chưa duyệt' },
  { value: 'invalid', label: 'Chưa đúng' },
];

const buildGroups = (tour: Tour): Group[] => [
  { title: 'Điểm đến (vé)', lineType: 'destination', className: 'bg-sky-50 text-sky-900 dark:bg-sky-950 dark:text-sky-100', rows: (tour.destinations || []).map((line, index) => ({ line, index })) },
  { title: 'Ăn', lineType: 'meal', className: 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100', rows: (tour.meals || []).map((line, index) => ({ line, index })) },
  { title: 'Dịch vụ / Chi phí', lineType: 'expense', className: 'bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100', rows: (tour.expenses || []).map((line, index) => ({ line, index })) },
  { title: 'Công tác phí', lineType: 'allowance', className: 'bg-violet-50 text-violet-900 dark:bg-violet-950 dark:text-violet-100', rows: (tour.allowances || []).map((line, index) => ({ line, index })) },
];

const isAttachmentLineType = (lineType: SummaryLineType): lineType is AttachmentLineType =>
  lineType === 'destination' || lineType === 'meal' || lineType === 'expense';

const getQuantity = (line: ReviewLine, tourGuests: number) =>
  'quantity' in line ? (line.quantity || 1) : getLineGuests(line, tourGuests);

const getTotal = (line: ReviewLine, tourGuests: number) =>
  'quantity' in line ? line.price * (line.quantity || 1) : getLineTotal(line, tourGuests);

export function SummaryLineReviewTable({ tour, onEditLine, canEditLine, evidenceAccess, lineFieldAccess, lineTypes, title = 'Đối chiếu VAT, ghi chú và chứng từ' }: SummaryLineReviewTableProps) {
  const { hasPermission } = useAuth();
  const { busy: reviewBusy, updateMany } = useLineReview(tour.id);
  const [dialogAttachments, setDialogAttachments] = useState<TourLineAttachment[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('hide_approved');
  const canReviewLines = !!tour.id && hasPermission('review_settlement_line');

  const approveSection = (group: Group) => {
    const targets = group.rows
      .filter(({ line }) => line.id)
      .map(({ line }) => ({ lineType: group.lineType as LineType, lineId: line.id as string }));
    if (targets.length) updateMany(targets, { lineStatus: 'valid' });
  };

  const renderApproveAll = (group: Group) =>
    canReviewLines && group.rows.some(({ line }) => line.id) ? (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 gap-1 bg-background px-2"
        disabled={reviewBusy}
        onClick={() => approveSection(group)}
      >
        <CheckCheck className="h-3.5 w-3.5" />
        Duyệt cả mục
      </Button>
    ) : null;
  const showName = canViewTourLineField(lineFieldAccess, 'name');
  const showDate = canViewTourLineField(lineFieldAccess, 'date');
  const showPrice = canViewTourLineField(lineFieldAccess, 'price');
  const showQuantity = canViewTourLineField(lineFieldAccess, 'quantity');
  const showTotal = showPrice && showQuantity;
  const showEvidence = (evidenceAccess ?? lineFieldAccess?.evidence)?.view !== false;
  const columnCount = [
    true,
    showName,
    showDate,
    showPrice,
    showQuantity,
    showTotal,
    showEvidence,
    showEvidence,
    showEvidence,
    true,
    true,
    true,
  ].filter(Boolean).length;
  const lineTypeKey = lineTypes?.join('|') || 'all';
  const groups = useMemo(() => {
    const allGroups = buildGroups(tour);
    if (!lineTypes?.length) return allGroups;
    return allGroups.filter((group) => lineTypes.includes(group.lineType));
  }, [tour, lineTypeKey]);
  const filteredGroups = useMemo(() => groups.map((g) => {
    let rows = g.rows;
    if (statusFilter === 'hide_approved') rows = rows.filter(({ line }) => line.lineStatus !== 'valid');
    else if (statusFilter === 'pending') rows = rows.filter(({ line }) => !line.lineStatus);
    else if (statusFilter === 'invalid') rows = rows.filter(({ line }) => line.lineStatus === 'need_more' || line.lineStatus === 'invalid');
    return { ...g, filteredRows: rows };
  }), [groups, statusFilter]);
  const tourGuests = tour.totalGuests || 0;

  const openAttachments = (attachments: TourLineAttachment[]) => {
    setDialogAttachments(attachments);
    setDialogOpen(true);
  };

  return (
    <div className="rounded-lg border">
      <div className="border-b bg-muted/50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">{title}</h3>
          <div className="flex flex-wrap gap-1">
            {STATUS_FILTERS.map((f) => (
              <Button key={f.value} size="sm" variant={statusFilter === f.value ? 'secondary' : 'ghost'} className="h-7 px-2 text-xs" onClick={() => setStatusFilter(f.value)}>
                {f.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-3 p-3 md:hidden">
        {filteredGroups.map((group) => (
          <div key={`${group.lineType}-mobile`} className="overflow-hidden rounded-lg border">
            <div className={`flex items-center justify-between gap-2 px-3 py-2 text-sm font-semibold ${group.className}`}>
              <span>{group.title} ({group.filteredRows.length}{group.filteredRows.length < group.rows.length ? `/${group.rows.length}` : ''})</span>
              {renderApproveAll(group)}
            </div>
            <div className="space-y-2 p-2">
              {group.filteredRows.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  {group.rows.length > 0 ? `Đã ẩn ${group.rows.length} dòng` : 'Chưa có dữ liệu'}
                </div>
              ) : group.filteredRows.map(({ line, index }) => {
                const attachments = isAttachmentLineType(group.lineType) ? (line as Destination | Meal | Expense).attachments || [] : [];
                return (
                  <div key={`${group.lineType}-mobile-${line.id || index}`} className="rounded-md border bg-card p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {showName ? (
                        <div className="font-medium">{line.name}</div>
                        ) : (
                          <div className="font-medium">Dòng #{index + 1}</div>
                        )}
                        {(showDate || showQuantity) && (
                          <div className="text-xs text-muted-foreground">
                            {[showDate ? formatDate(line.date) : null, showQuantity ? `SL/khách: ${getQuantity(line, tourGuests)}` : null]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEditLine?.(group.lineType, index)} disabled={!onEditLine || canEditLine?.(group.lineType) === false}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      {showPrice && (
                      <div><span className="text-muted-foreground">Giá: </span>{formatCurrency(line.price)}</div>
                      )}
                      {showTotal && (
                      <div><span className="text-muted-foreground">Tổng: </span>{formatCurrency(getTotal(line, tourGuests))}</div>
                      )}
                      {showEvidence && <div><span className="text-muted-foreground">VAT: </span>{'vatRate' in line ? `${line.vatRate || 0}% / ${formatCurrency(line.vatAmount || 0)}` : '-'}</div>}
                      {showEvidence && (
                        <button type="button" className="text-left" onClick={() => attachments.length && openAttachments(attachments)} disabled={!attachments.length}>
                          <span className="text-muted-foreground">Chứng từ: </span>{attachments.length}
                        </button>
                      )}
                    </div>
                    {showEvidence && 'guideNote' in line && line.guideNote && <p className="mt-2 whitespace-pre-wrap text-xs">{line.guideNote}</p>}
                    <div className="mt-2">
                      {tour.id && line.id ? (
                        <LineQuickReview
                          tourId={tour.id}
                          lineType={group.lineType as LineType}
                          lineId={line.id}
                          currentStatus={line.lineStatus}
                          currentComment={line.lineComment}
                          editable
                          statusLabels={SUMMARY_STATUS_LABELS}
                        />
                      ) : <span className="text-muted-foreground">-</span>}
                      {line.lineComment && (
                        <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">Lý do: {line.lineComment}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <Table className="min-w-[1120px] text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[52px]">#</TableHead>
              {showName && (
              <TableHead>Dòng</TableHead>
              )}
              {showDate && (
              <TableHead>Ngày</TableHead>
              )}
              {showPrice && (
              <TableHead className="text-right">Đơn giá</TableHead>
              )}
              {showQuantity && (
              <TableHead className="text-right">Khách</TableHead>
              )}
              {showTotal && (
              <TableHead className="text-right">Thành tiền</TableHead>
              )}
              {showEvidence && <TableHead>VAT</TableHead>}
              {showEvidence && <TableHead>Ghi chú HDV</TableHead>}
              {showEvidence && <TableHead>Chứng từ</TableHead>}
              <TableHead>Trạng thái duyệt</TableHead>
              <TableHead>Lý do</TableHead>
              <TableHead className="text-right">Sửa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGroups.map((group) => (
              <Fragment key={group.lineType}>
                <TableRow className={group.className}>
                  <TableCell colSpan={columnCount} className="font-semibold">
                    <div className="flex items-center justify-between gap-2">
                      <span>{group.title} ({group.filteredRows.length}{group.filteredRows.length < group.rows.length ? `/${group.rows.length}` : ''})</span>
                      {renderApproveAll(group)}
                    </div>
                  </TableCell>
                </TableRow>
                {group.filteredRows.length === 0 ? (
                  <TableRow key={`${group.lineType}-empty`}>
                    <TableCell colSpan={columnCount} className="text-center text-muted-foreground">
                      {group.rows.length > 0 ? `Đã ẩn ${group.rows.length} dòng` : 'Chưa có dữ liệu'}
                    </TableCell>
                  </TableRow>
                ) : (
                  group.filteredRows.map(({ line, index }) => {
                    const attachments = isAttachmentLineType(group.lineType) ? (line as Destination | Meal | Expense).attachments || [] : [];
                    const hasVatWithoutAttachment = 'vatRate' in line && (line.vatRate || 0) > 0 && attachments.length === 0;
                    return (
                      <TableRow key={`${group.lineType}-${line.id || index}`}>
                        <TableCell>{index + 1}</TableCell>
                        {showName && (
                        <TableCell className="font-medium">{line.name}</TableCell>
                        )}
                        {showDate && (
                        <TableCell>{formatDate(line.date)}</TableCell>
                        )}
                        {showPrice && (
                        <TableCell className="text-right">{formatCurrency(line.price)}</TableCell>
                        )}
                        {showQuantity && (
                        <TableCell className="text-right">{getQuantity(line, tourGuests)}</TableCell>
                        )}
                        {showTotal && (
                        <TableCell className="text-right font-semibold">{formatCurrency(getTotal(line, tourGuests))}</TableCell>
                        )}
                        {showEvidence && <TableCell>
                          {'vatRate' in line ? (
                            <div className="flex flex-col">
                              <span>{line.vatRate || 0}%</span>
                              <span className="text-xs text-muted-foreground">{formatCurrency(line.vatAmount || 0)}</span>
                            </div>
                          ) : <span className="text-muted-foreground">-</span>}
                        </TableCell>}
                        {showEvidence && <TableCell>
                          {'guideNote' in line && line.guideNote ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 gap-1 px-2">
                                  <MessageSquare className="h-4 w-4" />
                                  Xem
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 text-sm" align="start">
                                <p className="whitespace-pre-wrap">{line.guideNote}</p>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>}
                        {showEvidence && <TableCell>
                          {attachments.length > 0 ? (
                            <Button variant="outline" size="sm" className="gap-1" onClick={() => openAttachments(attachments)}>
                              <Paperclip className="h-4 w-4" />
                              {attachments.length}
                            </Button>
                          ) : (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <FileText className="h-4 w-4" />
                              0
                              {hasVatWithoutAttachment && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                            </div>
                          )}
                        </TableCell>}
                        <TableCell className="min-w-[200px]">
                          {tour.id && line.id ? (
                            <LineQuickReview
                              tourId={tour.id}
                              lineType={group.lineType as LineType}
                              lineId={line.id}
                              currentStatus={line.lineStatus}
                              currentComment={line.lineComment}
                              editable
                              statusLabels={SUMMARY_STATUS_LABELS}
                            />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[180px] whitespace-pre-wrap text-xs">
                          {line.lineComment || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => onEditLine?.(group.lineType, index)} disabled={!onEditLine || canEditLine?.(group.lineType) === false}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
      <SummaryLineAttachmentsDialog
        open={dialogOpen}
        attachments={dialogAttachments}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
