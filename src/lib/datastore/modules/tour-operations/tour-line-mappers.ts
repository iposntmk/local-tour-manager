import type {
  AttachmentLineType,
  Destination,
  Expense,
  Meal,
  Tour,
  TourLineAttachment,
} from '@/types/tour';
import { mapLineReviewFields } from '../mappers';

type TourLine = Destination | Expense | Meal;

const mapEvidenceFields = (row: any) => ({
  guideNote: row?.guide_note ?? undefined,
  vatRate: Number(row?.vat_rate) || 0,
  vatAmount: Number(row?.vat_amount) || 0,
});

export const mapTourDestinationLine = (row: any): Destination => ({
  name: row.name,
  price: Number(row.price) || 0,
  date: row.date,
  guests: row.guests !== null && row.guests !== undefined ? Number(row.guests) : undefined,
  ...mapEvidenceFields(row),
  ...mapLineReviewFields(row),
});

export const mapTourExpenseLine = (row: any): Expense => ({
  name: row.name,
  price: Number(row.price) || 0,
  date: row.date,
  guests: row.guests !== null && row.guests !== undefined ? Number(row.guests) : undefined,
  days: row.days !== null && row.days !== undefined ? Number(row.days) : undefined,
  ...mapEvidenceFields(row),
  ...mapLineReviewFields(row),
});

export const mapTourMealLine = (row: any): Meal => ({
  name: row.name,
  price: Number(row.price) || 0,
  date: row.date,
  guests: row.guests !== null && row.guests !== undefined ? Number(row.guests) : undefined,
  ...mapEvidenceFields(row),
  ...mapLineReviewFields(row),
});

const attachToLines = (
  lines: TourLine[],
  lineType: AttachmentLineType,
  attachments: TourLineAttachment[],
) => {
  const byLineId = new Map<string, TourLineAttachment[]>();
  attachments.filter((a) => a.lineType === lineType).forEach((attachment) => {
    const list = byLineId.get(attachment.lineId) || [];
    list.push(attachment);
    byLineId.set(attachment.lineId, list);
  });
  lines.forEach((line) => {
    line.attachments = line.id ? byLineId.get(line.id) || [] : [];
  });
};

export const attachTourLineAttachments = (tour: Tour, attachments: TourLineAttachment[]) => {
  attachToLines(tour.destinations, 'destination', attachments);
  attachToLines(tour.meals, 'meal', attachments);
  attachToLines(tour.expenses, 'expense', attachments);
};

export const buildLineWritePayload = (line: TourLine) => ({
  name: line.name,
  price: line.price,
  date: line.date,
  guests: line.guests ?? null,
  ...('days' in line ? { days: line.days ?? null } : {}),
  guide_note: line.guideNote?.trim() || null,
  vat_rate: line.vatRate ?? 0,
  vat_amount: line.vatAmount ?? 0,
});
