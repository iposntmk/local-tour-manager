import { Fragment, useMemo, useState } from 'react';
import { AlertTriangle, CheckCheck, CheckCircle2, Circle, Edit2, EyeOff, FileText, ListFilter, MessageSquare, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLineReview } from '@/hooks/useLineReview';
import { LineQuickReview } from './LineQuickReview';
import { SummaryLineAttachmentsDialog } from './SummaryLineAttachmentsDialog';
import { SummaryLineReviewMobileList } from './SummaryLineReviewMobileList';
import type { Destination, Expense, LineType, Meal, Tour, TourLineAttachment } from '@/types/tour';
import { canViewTourLineField, type Access, type TourLineFieldKey } from '@/lib/tour-detail-permissions';
import {
  buildGroups,
  getQuantity,
  getTotal,
  isAttachmentLineType,
  STATUS_FILTERS,
  SUMMARY_STATUS_LABELS,
  type FilteredSummaryLineGroup,
  type StatusFilter,
  type SummaryLineGroup,
  type SummaryLineType,
} from './summary-line-review-utils';

export type { SummaryLineType } from './summary-line-review-utils';

interface SummaryLineReviewTableProps {
  tour: Tour;
  onEditLine?: (lineType: SummaryLineType, index: number) => void;
  canEditLine?: (lineType: SummaryLineType) => boolean;
  evidenceAccess?: Access;
  lineFieldAccess?: Partial<Record<TourLineFieldKey, Access>>;
  lineTypes?: SummaryLineType[];
  title?: string;
}

const FILTER_ICONS: Record<StatusFilter, typeof EyeOff> = {
  hide_approved: EyeOff,
  all: ListFilter,
  approved: CheckCircle2,
  pending: Circle,
  invalid: AlertTriangle,
};

const getGroupAmount = (group: SummaryLineGroup, tourGuests: number) =>
  group.rows.reduce((sum, { line }) => sum + getTotal(line, tourGuests), 0);

const getApprovedCount = (group: SummaryLineGroup) =>
  group.rows.filter(({ line }) => line.lineStatus === 'valid').length;

export function SummaryLineReviewTable({ tour, onEditLine, canEditLine, evidenceAccess, lineFieldAccess, lineTypes, title = 'Đối chiếu VAT, ghi chú và chứng từ' }: SummaryLineReviewTableProps) {
  const { hasPermission } = useAuth();
  const { busy: reviewBusy, updateMany } = useLineReview(tour.id);
  const [dialogAttachments, setDialogAttachments] = useState<TourLineAttachment[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('hide_approved');
  const canReviewLines = !!tour.id && hasPermission('review_settlement_line');

  const approveSection = async (group: SummaryLineGroup) => {
    const targets = group.rows
      .filter(({ line }) => line.id)
      .map(({ line }) => ({ lineType: group.lineType as LineType, lineId: line.id as string }));
    if (!targets.length) return;
    const ok = await updateMany(targets, { lineStatus: 'valid' });
    if (ok) setStatusFilter('hide_approved');
  };

  const renderApproveAll = (group: SummaryLineGroup) => {
    const allApproved = group.rows.length > 0 && getApprovedCount(group) === group.rows.length;
    return canReviewLines && group.rows.some(({ line }) => line.id) ? (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 w-7 gap-1 bg-background p-0 sm:w-auto sm:px-2"
        disabled={reviewBusy || allApproved}
        onClick={() => approveSection(group)}
        title={allApproved ? 'Đã duyệt tất cả dòng' : 'Duyệt tất cả dòng trong mục'}
      >
        <CheckCheck className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Duyệt mục</span>
      </Button>
    ) : null;
  };
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
  const lineTypeSet = useMemo(() => new Set(lineTypes || []), [lineTypes]);
  const groups = useMemo(() => {
    const allGroups = buildGroups(tour);
    if (!lineTypeSet.size) return allGroups;
    return allGroups.filter((group) => lineTypeSet.has(group.lineType));
  }, [tour, lineTypeSet]);
  const filteredGroups = useMemo(() => groups.map((g) => {
    let rows = g.rows;
    if (statusFilter === 'hide_approved') rows = rows.filter(({ line }) => line.lineStatus !== 'valid');
    else if (statusFilter === 'pending') rows = rows.filter(({ line }) => !line.lineStatus || line.lineStatus === 'unchecked');
    else if (statusFilter === 'approved') rows = rows.filter(({ line }) => line.lineStatus === 'valid');
    else if (statusFilter === 'invalid') rows = rows.filter(({ line }) => line.lineStatus === 'need_more' || line.lineStatus === 'invalid');
    return { ...g, filteredRows: rows } as FilteredSummaryLineGroup;
  }), [groups, statusFilter]);
  const tourGuests = tour.totalGuests || 0;

  const openAttachments = (attachments: TourLineAttachment[]) => {
    setDialogAttachments(attachments);
    setDialogOpen(true);
  };

  return (
    <div className="sm:rounded-lg sm:border">
      <div className="border-b bg-muted/40 p-2 sm:bg-muted/50 sm:p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold sm:text-base">{title}</h3>
          <div className="grid w-full grid-cols-5 gap-1 sm:w-auto sm:flex">
            {STATUS_FILTERS.map((f) => {
              const Icon = FILTER_ICONS[f.value];
              return (
                <Button
                  key={f.value}
                  size="sm"
                  variant={statusFilter === f.value ? 'secondary' : 'ghost'}
                  className="h-7 min-w-0 gap-1 px-1 text-[11px] sm:px-2 sm:text-xs"
                  onClick={() => setStatusFilter(f.value)}
                  title={f.label}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">{f.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </div>
      <SummaryLineReviewMobileList
        groups={filteredGroups}
        tour={tour}
        showName={showName}
        showPrice={showPrice}
        showTotal={showTotal}
        showEvidence={showEvidence}
        reviewAction={renderApproveAll}
        onOpenAttachments={openAttachments}
        onApproved={() => setStatusFilter('hide_approved')}
        onEditLine={onEditLine}
        canEditLine={canEditLine}
      />

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
                    <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                        <span>{group.title} ({group.filteredRows.length}{group.filteredRows.length < group.rows.length ? `/${group.rows.length}` : ''})</span>
                        <span>Tổng: {formatCurrency(getGroupAmount(group, tourGuests))}</span>
                        <span>Đã duyệt: {getApprovedCount(group)}/{group.rows.length}</span>
                      </div>
                      <div className="shrink-0">{renderApproveAll(group)}</div>
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
                              onApproved={() => setStatusFilter('hide_approved')}
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
