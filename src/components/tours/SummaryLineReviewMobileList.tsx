import type { ReactNode } from 'react';
import { Edit2, Paperclip } from 'lucide-react';
import { formatCurrency } from '@/lib/currency-utils';
import { LineQuickReview } from './LineQuickReview';
import {
  MOBILE_CARD_NAME,
  MOBILE_CHEVRON_SIZE,
  MOBILE_COMPACT_EDIT_BTN,
  MOBILE_GROUP_CARD,
  MOBILE_INDEX,
  MOBILE_REJECT_COMMENT,
  MOBILE_SEC_HEADER,
  MOBILE_SEC_HEADER_TEXT,
} from '@/lib/tab-styles';
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
            <div className={MOBILE_SEC_HEADER}>
              <div className={MOBILE_SEC_HEADER_TEXT}>
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
              <div className={MOBILE_GROUP_CARD}>
                {group.filteredRows.map(({ line, index }) => {
                  const attachments = isAttachmentLineType(group.lineType)
                    ? (line as Destination | Meal | Expense).attachments || []
                    : [];

                  return (
                    <div key={`${group.lineType}-mobile-${line.id || index}`} className="px-2 py-1.5">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-baseline gap-1">
                            <span className={MOBILE_INDEX}>{index + 1}.</span>
                            <p className={MOBILE_CARD_NAME}>
                              {showName ? line.name : `Dòng #${index + 1}`}
                            </p>
                          </div>

                          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                            {showPrice && <span>Giá: {formatCurrency(line.price)}</span>}
                            {showTotal && (
                              <span className="font-bold tabular-nums text-foreground">
                                Tổng: {formatCurrency(getTotal(line, tourGuests))}
                              </span>
                            )}
                            {showEvidence && attachments.length > 0 && (
                              <button
                                type="button"
                                className="inline-flex items-center gap-0.5 text-primary"
                                onClick={() => onOpenAttachments(attachments)}
                              >
                                <Paperclip className="h-2.5 w-2.5" />
                                {attachments.length}
                              </button>
                            )}
                            {showEvidence && 'vatRate' in line && (line.vatRate || 0) > 0 && (
                              <span>VAT {line.vatRate}%</span>
                            )}
                            {showEvidence && 'guideNote' in line && line.guideNote && (
                              <span className="italic">{line.guideNote}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex min-h-[2.75rem] shrink-0 items-stretch justify-end gap-1">
                          <button
                            type="button"
                            title="Sửa"
                            className={MOBILE_COMPACT_EDIT_BTN}
                            onClick={() => onEditLine?.(group.lineType, index)}
                            disabled={!onEditLine || canEditLine?.(group.lineType) === false}
                          >
                            <Edit2 className={MOBILE_CHEVRON_SIZE} />
                            <span>Sửa</span>
                          </button>
                          {tour.id && line.id ? (
                            <LineQuickReview
                              tourId={tour.id}
                              lineType={group.lineType as LineType}
                              lineId={line.id}
                              currentStatus={line.lineStatus}
                              currentComment={line.lineComment}
                              editable
                              compact
                              statusLabels={SUMMARY_STATUS_LABELS}
                              onApproved={onApproved}
                            />
                          ) : (
                            <span className="self-center text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                      </div>

                      {line.lineComment && (
                        <p className={MOBILE_REJECT_COMMENT}>↳ {line.lineComment}</p>
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
