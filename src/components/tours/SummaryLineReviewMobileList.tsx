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
    <div className="space-y-4 p-2 md:hidden">
      {groups.map((group) => (
        <section key={`${group.lineType}-mobile`} className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-px flex-1 bg-border" />
            <span className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
              {group.title} ({group.filteredRows.length}{group.filteredRows.length < group.rows.length ? `/${group.rows.length}` : ''})
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="flex justify-end">{reviewAction(group)}</div>

          {group.filteredRows.length === 0 ? (
            <div className="py-3 text-center text-sm text-muted-foreground">
              {group.rows.length > 0 ? `Đã ẩn ${group.rows.length} dòng` : 'Chưa có dữ liệu'}
            </div>
          ) : (
            <div className="divide-y rounded-md border bg-background">
              {group.filteredRows.map(({ line, index }) => {
                const attachments = isAttachmentLineType(group.lineType)
                  ? (line as Destination | Meal | Expense).attachments || []
                  : [];

                return (
                  <div key={`${group.lineType}-mobile-${line.id || index}`} className="p-2.5 text-sm">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="min-w-0">
                          {showName ? (
                            <div className="truncate font-medium">{line.name}</div>
                          ) : (
                            <div className="font-medium">Dòng #{index + 1}</div>
                          )}
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {showPrice && <span>Giá: {formatCurrency(line.price)}</span>}
                            {showTotal && <span>Tổng: {formatCurrency(getTotal(line, tourGuests))}</span>}
                            {showEvidence && (
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 text-left text-primary disabled:text-muted-foreground"
                                onClick={() => attachments.length && onOpenAttachments(attachments)}
                                disabled={!attachments.length}
                              >
                                <Paperclip className="h-3.5 w-3.5" />
                                {attachments.length}
                              </button>
                            )}
                          </div>
                        </div>

                        {showEvidence && 'guideNote' in line && line.guideNote && (
                          <p className="whitespace-pre-wrap text-xs">{line.guideNote}</p>
                        )}

                        {tour.id && line.id ? (
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
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                        {line.lineComment && (
                          <p className="whitespace-pre-wrap text-xs text-muted-foreground">Lý do: {line.lineComment}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => onEditLine?.(group.lineType, index)}
                        disabled={!onEditLine || canEditLine?.(group.lineType) === false}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
