import type { Tour } from '@/types/tour';

export function mapLineReviewFields(row: any): {
  id?: string;
  lineStatus?: Tour['destinations'][number]['lineStatus'];
  lineComment?: string;
  reviewedBy?: string;
  reviewedAt?: string;
} {
  return {
    id: row?.id,
    lineStatus: (row?.line_status as any) ?? 'unchecked',
    lineComment: row?.line_comment ?? undefined,
    reviewedBy: row?.reviewed_by ?? undefined,
    reviewedAt: row?.reviewed_at ?? undefined,
  };
}
