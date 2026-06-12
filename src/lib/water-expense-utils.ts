import type { Expense } from '@/types/tour';

export const WATER_EXPENSE_NAMES = [
  'Nước uống cho khách 15k/1 khách / 1 ngày',
  'Nước uống cho khách 10k/1 khách / 1 ngày',
];
const WATER_EXPENSE_NAME_KEYS = WATER_EXPENSE_NAMES.map((name) => name.toLowerCase());

const toNonNegativeNumber = (value: number | undefined, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(value, 0) : fallback;

export const isWaterExpenseName = (name: string | undefined) =>
  WATER_EXPENSE_NAME_KEYS.includes((name || '').trim().toLowerCase());

export const isWaterExpense = (expense: Pick<Expense, 'name'>) =>
  isWaterExpenseName(expense.name);

export const getExpenseGuestCount = (expense: Expense, tourGuests: number) => {
  if (isWaterExpense(expense)) return toNonNegativeNumber(tourGuests, toNonNegativeNumber(expense.guests));
  return typeof expense.guests === 'number' ? toNonNegativeNumber(expense.guests) : toNonNegativeNumber(tourGuests);
};

export const getWaterExpenseDays = (expense: Expense, tourGuests: number, fallbackDays = 1) => {
  if (!isWaterExpense(expense)) return 1;
  if (typeof expense.days === 'number' && Number.isFinite(expense.days)) return Math.max(expense.days, 0);
  if (typeof expense.guests === 'number' && tourGuests > 0 && expense.guests > tourGuests) {
    return Math.max(expense.guests / tourGuests, 0);
  }
  return toNonNegativeNumber(fallbackDays, 1);
};

export const getExpenseLineTotal = (expense: Expense, tourGuests: number, fallbackDays = 1) => {
  const guests = getExpenseGuestCount(expense, tourGuests);
  const days = isWaterExpense(expense) ? getWaterExpenseDays(expense, tourGuests, fallbackDays) : 1;
  return (Number(expense.price) || 0) * guests * days;
};

export const normalizeWaterExpenseLine = (
  expense: Expense,
  tourGuests: number,
  fallbackDays = 1,
): Expense => {
  if (!isWaterExpense(expense)) return expense;
  return {
    ...expense,
    guests: toNonNegativeNumber(tourGuests),
    days: getWaterExpenseDays(expense, tourGuests, fallbackDays),
  };
};
