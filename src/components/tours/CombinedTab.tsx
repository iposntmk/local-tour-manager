import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import type { Tour } from '@/types/tour';

interface CombinedTabProps {
  tour: Tour | null | undefined;
}

// Helper function to clamp guests (same logic as SummaryTab)
const clampGuests = (guestValue: number | undefined, tourGuests: number): number => {
  if (typeof guestValue !== 'number') return tourGuests;
  if (!tourGuests) return guestValue;
  return Math.min(Math.max(guestValue, 0), tourGuests);
};

export function CombinedTab({ tour }: CombinedTabProps) {
  const tourGuests = tour?.totalGuests || 0;

  const destinations = tour?.destinations || [];
  const expenses = tour?.expenses || [];
  const meals = tour?.meals || [];

  // Calculate totals
  const totalDestinations = destinations.reduce((sum, d) => {
    const g = clampGuests(d.guests as any, tourGuests);
    return sum + (d.price * g);
  }, 0);

  const totalExpenses = expenses.reduce((sum, e) => {
    const g = clampGuests(e.guests as any, tourGuests);
    return sum + (e.price * g);
  }, 0);

  const totalMeals = meals.reduce((sum, m) => {
    const g = clampGuests(m.guests as any, tourGuests);
    return sum + (m.price * g);
  }, 0);

  const grandTotal = totalDestinations + totalExpenses + totalMeals;

  return (
    <div className="space-y-6">
      {/* Destinations Section */}
      <div className="rounded-lg border">
        <div className="p-4 border-b bg-blue-50 dark:bg-blue-950">
          <h3 className="font-semibold text-lg">Điểm đến</h3>
        </div>
        {destinations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Chưa có điểm đến nào
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">STT</TableHead>
                  <TableHead>Điểm đến</TableHead>
                  <TableHead>Đơn giá</TableHead>
                  <TableHead className="w-[80px]">Khách</TableHead>
                  <TableHead>Thành tiền</TableHead>
                  <TableHead>Ngày</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {destinations.map((destination, index) => {
                  const rowGuests = typeof destination.guests === 'number' ? destination.guests : tourGuests;
                  const totalAmount = destination.price * rowGuests;
                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{destination.name}</TableCell>
                      <TableCell>{formatCurrency(destination.price)}</TableCell>
                      <TableCell>{rowGuests}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(totalAmount)}</TableCell>
                      <TableCell>{formatDate(destination.date)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="mt-2 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg flex justify-end border-t-2 border-yellow-400">
              <div className="text-lg font-bold">
                Tổng điểm đến: {formatCurrency(totalDestinations)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Separator Line */}
      <div className="border-t-4 border-gray-300 dark:border-gray-700"></div>

      {/* Expenses Section */}
      <div className="rounded-lg border">
        <div className="p-4 border-b bg-blue-50 dark:bg-blue-950">
          <h3 className="font-semibold text-lg">Chi phí</h3>
        </div>
        {expenses.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Chưa có chi phí nào
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">STT</TableHead>
                  <TableHead>Chi phí</TableHead>
                  <TableHead>Đơn giá</TableHead>
                  <TableHead className="w-[80px]">Khách</TableHead>
                  <TableHead>Thành tiền</TableHead>
                  <TableHead>Ngày</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense, index) => {
                  const rowGuests = typeof expense.guests === 'number' ? expense.guests : tourGuests;
                  const totalAmount = expense.price * rowGuests;
                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{expense.name}</TableCell>
                      <TableCell>{formatCurrency(expense.price)}</TableCell>
                      <TableCell>{rowGuests}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(totalAmount)}</TableCell>
                      <TableCell>{formatDate(expense.date)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="mt-2 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg flex justify-end border-t-2 border-yellow-400">
              <div className="text-lg font-bold">
                Tổng chi phí: {formatCurrency(totalExpenses)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Separator Line */}
      <div className="border-t-4 border-gray-300 dark:border-gray-700"></div>

      {/* Meals Section */}
      <div className="rounded-lg border">
        <div className="p-4 border-b bg-blue-50 dark:bg-blue-950">
          <h3 className="font-semibold text-lg">Bữa ăn</h3>
        </div>
        {meals.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Chưa có bữa ăn nào
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">STT</TableHead>
                  <TableHead>Bữa ăn</TableHead>
                  <TableHead>Đơn giá</TableHead>
                  <TableHead className="w-[80px]">Khách</TableHead>
                  <TableHead>Thành tiền</TableHead>
                  <TableHead>Ngày</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meals.map((meal, index) => {
                  const rowGuests = typeof meal.guests === 'number' ? meal.guests : tourGuests;
                  const totalAmount = meal.price * rowGuests;
                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{meal.name}</TableCell>
                      <TableCell>{formatCurrency(meal.price)}</TableCell>
                      <TableCell>{rowGuests}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(totalAmount)}</TableCell>
                      <TableCell>{formatDate(meal.date)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="mt-2 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg flex justify-end border-t-2 border-yellow-400">
              <div className="text-lg font-bold">
                Tổng bữa ăn: {formatCurrency(totalMeals)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grand Total */}
      <div className="rounded-lg border-4 border-green-500 bg-green-50 dark:bg-green-950 p-6">
        <div className="flex justify-between items-center text-2xl font-bold">
          <span>TỔNG CỘNG (Điểm đến + Chi phí + Bữa ăn):</span>
          <span className="text-green-700 dark:text-green-300">{formatCurrency(grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}
