import { formatDate } from '@/lib/utils';
import type { Tour } from '@/types/tour';

type Numeric = number | null | undefined;

const formatAmount = (value: Numeric) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'N/A';
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatDateOrNA = (value?: string | null) => {
  if (!value) {
    return 'N/A';
  }

  return formatDate(value);
};

const appendSection = (lines: string[], title: string, items: string[]) => {
  lines.push('', `${title}:`);

  if (items.length === 0) {
    lines.push('- None');
    return;
  }

  items.forEach(item => lines.push(`- ${item}`));
};

export const exportTourToTxt = (tour: Tour) => {
  const lines: string[] = [];

  const totalGuests = tour.totalGuests ?? tour.adults + tour.children;
  const summary = tour.summary ?? {};

  lines.push(`Tour Code: ${tour.tourCode}`);
  lines.push(`Client: ${tour.clientName}`);
  lines.push(`Nationality: ${tour.clientNationalityRef?.nameAtBooking ?? 'N/A'}`);
  lines.push(`Company: ${tour.companyRef?.nameAtBooking ?? 'N/A'}`);
  lines.push(`Guide: ${tour.guideRef?.nameAtBooking ?? 'N/A'}`);
  lines.push(`Driver: ${tour.driverName || 'N/A'}`);
  lines.push(`Client Phone: ${tour.clientPhone || 'N/A'}`);
  lines.push(
    `Dates: ${formatDateOrNA(tour.startDate)} → ${formatDateOrNA(tour.endDate)} (${tour.totalDays ?? 'N/A'} day(s))`
  );
  lines.push(
    `Guests: ${tour.adults} adult(s), ${tour.children} child(ren), total ${totalGuests}`
  );

  appendSection(
    lines,
    'Destinations',
    (tour.destinations ?? []).map(dest => {
      const amount = typeof dest.price === 'number' ? ` - ${formatAmount(dest.price)}` : '';
      return `${formatDateOrNA(dest.date)} • ${dest.name}${amount}`;
    })
  );

  appendSection(
    lines,
    'Expenses',
    (tour.expenses ?? []).map(expense => {
      const amount = typeof expense.price === 'number' ? ` - ${formatAmount(expense.price)}` : '';
      return `${formatDateOrNA(expense.date)} • ${expense.name}${amount}`;
    })
  );

  appendSection(
    lines,
    'Meals',
    (tour.meals ?? []).map(meal => {
      const amount = typeof meal.price === 'number' ? ` - ${formatAmount(meal.price)}` : '';
      return `${formatDateOrNA(meal.date)} • ${meal.name}${amount}`;
    })
  );

  appendSection(
    lines,
    'Allowances',
    (tour.allowances ?? []).map(allowance => {
      return `${formatDateOrNA(allowance.date)} • ${allowance.name} - ${formatAmount(allowance.price)}`;
    })
  );

  const summaryItems: string[] = [];
  if (typeof summary.totalTabs === 'number') {
    summaryItems.push(`Total Tabs: ${summary.totalTabs}`);
  }
  if (typeof summary.advancePayment === 'number') {
    summaryItems.push(`Advance Payment: ${formatAmount(summary.advancePayment)}`);
  }
  if (typeof summary.totalAfterAdvance === 'number') {
    summaryItems.push(`Total After Advance: ${formatAmount(summary.totalAfterAdvance)}`);
  }
  if (typeof summary.companyTip === 'number') {
    summaryItems.push(`Company Tip: ${formatAmount(summary.companyTip)}`);
  }
  if (typeof summary.totalAfterTip === 'number') {
    summaryItems.push(`Total After Tip: ${formatAmount(summary.totalAfterTip)}`);
  }
  if (typeof summary.collectionsForCompany === 'number') {
    summaryItems.push(`Collections for Company: ${formatAmount(summary.collectionsForCompany)}`);
  }
  if (typeof summary.totalAfterCollections === 'number') {
    summaryItems.push(`Total After Collections: ${formatAmount(summary.totalAfterCollections)}`);
  }
  if (typeof summary.finalTotal === 'number') {
    summaryItems.push(`Final Total: ${formatAmount(summary.finalTotal)}`);
  }

  appendSection(lines, 'Summary', summaryItems);

  lines.push('', `Generated on: ${new Date().toLocaleString()}`);

  const txtContent = lines.join('\n');
  const blob = new Blob([txtContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `tour-${tour.tourCode}-${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};
