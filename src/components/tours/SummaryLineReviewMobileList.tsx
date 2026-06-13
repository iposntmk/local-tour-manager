import type { ReactNode } from 'react';
import { Edit2, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/currency-utils';
import { LineQuickReview } from './LineQuickReview';
import type { Destination, Expense, LineType, Meal, Tour, TourLineAttachment } from '@/types/tour';
import {
  getTotal,
  isAttachmentLineType,
  SUMMARY_STATUS_LABELS,
  type FilteredSummaryLineGroup,
  type SummaryLineType,
} from './summary-line-review-utils';

interface SummaryLineReviewMobileListProps {
  groups: FilteredSummaryLineGroup[];
  tour: Tour;
  showName: boolean;
  showPrice: boolean;
  showTotal: boolean;
  showEvidence: boolean;
  reviewAction: (group: FilteredSummaryLineGroup) => ReactNode;
  onOpenAttachments: (attachments: TourLineAttachment[]) => void;
  onApproved?: () => void;
  onEditLine?: (lineType: SummaryLineType, index: number) => void;
  canEditLine?: (lineType: SummaryLineType) => boolean;
}

export function SummaryLineReviewMobileList({
  groups,
  tour,
  showName,
  showPrice,
  showTotal,
  showEvidence,
  reviewAction,
  onOpenAttachments,
  onApproved,
  onEditLine,
  canEditLine,
}: SummaryLineReviewMobileListProps) {
  const tourGuests = tour.totalGuests || 0;

  return (
    <div className="space-y-3 p-2 md:hidden">
      {groups.map((group) => {
        const groupTotal = group.rows.reduce((sum, { line }) => sum + getTotal(line, tourGuests), 0);
        const approvedCount = group.rows.filter(({ line }) => line.lineStatus === 'valid').length;

        return (
          <section key={`${group.lineType}-mobile`} className="space-y-1.5">
            {/* Section header: title + totals left, Duyệt mục right */}
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 text-xs font-semibold">
                <span className="text-muted-foreground">
                  {group.title} ({group.filteredRows.length}{group.filteredRows.length < group.rows.length ? `/${group.rows.length}` : ''})
                </span>
                <span className="ml-1.5 font-bold text-foreground">{formatCurrency(groupTotal)}</span>
                <span className="ml-1.5 text-muted-foreground">{approvedCount}/{group.rows.length} OK</span>
              </div>
              <div className="shrink-0">{reviewAction(group)}</div>
            </div>

            {group.filteredRows.length === 0 ? (
              <div className="py-2 text-center text-xs text-muted-foreground">
                {group.rows.length > 0 ? `Đã ẩn ${group.rows.length} dòng` : 'Chưa có dữ liệu'}
              </div>
            ) : (
              <div className="divide-y rounded-md border bg-background">
                {group.filteredRows.map(({ line, index }) => {
                  const attachments = isAttachmentLineType(group.lineType)
                    ? (line as Destination | Meal | Expense).attachments || []
                    : [];

                  const detailParts = [
                    showPrice && formatCurrency(line.price),
                    showEvidence && attachments.length > 0 && (
                      <button
                        key="att"
                        type="button"
                        className="inline-flex items-center gap-0.5 text-primary"
                        onClick={() => onOpenAttachments(attachments)}
                      >
                        <Paperclip className="h-3 w-3" />
                        {attachments.length}
                      </button>
                    ),
                    showEvidence && 'vatRate' in line && (line.vatRate || 0) > 0 && `VAT ${line.vatRate}%`,
                  ].filter(Boolean);

                  return (
                    <div key={`${group.lineType}-mobile-${line.id || index}`} className="px-2.5 py-2">
                      {/* Row 1: index · name · total · edit */}
                      <div className="flex items-baseline gap-1">
                        <span className="shrink-0 text-[11px] text-muted-foreground">{index + 1}.</span>
                        <p className="min-w-0 flex-1 text-xs font-medium leading-snug">
                          {showName ? line.name : `Dòng #${index + 1}`}
                        </p>
                        {showTotal && (
                          <span className="shrink-0 text-xs font-bold tabular-nums">
                            {formatCurrency(getTotal(line, tourGuests))}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => onEditLine?.(group.lineType, index)}
                          disabled={!onEditLine || canEditLine?.(group.lineType) === false}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Row 2: price · attachments · VAT */}
                      {detailParts.length > 0 && (
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                          {detailParts.map((part, i) => (
                            <span key={i}>{part}</span>
                          ))}
                        </div>
                      )}

                      {showEvidence && 'guideNote' in line && line.guideNote && (
                        <p className="mt-0.5 text-[11px] italic text-slate-500 line-clamp-2">{line.guideNote}</p>
                      )}

                      {tour.id && line.id ? (
                        <div className="mt-1.5">
                          <LineQuickReview
                            tourId={tour.id}
                            lineType={group.lineType as LineType}
                            lineId={line.id}
                            currentStatus={line.lineStatus}
                            currentComment={line.lineComment}
                            editable
                            statusLabels={SUMMARY_STATUS_LABELS}
                            onApproved={onApproved}
                          />
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">-</span>
                      )}

                      {line.lineComment && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">Lý do: {line.lineComment}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
