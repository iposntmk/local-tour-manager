import { Link } from 'react-router-dom';
import { Columns3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/currency-utils';
import { StatColumnHelp } from '../StatColumnHelp';
import { SectionHeader } from '../charts/SectionHeader';
import {
  statColumnHelp,
  tourStatsColumns,
  tourStatsTextColumnKeys,
  type StatsTotals,
  type TourStatsColumnKey,
  type TourStatsRow,
} from '../shared';

interface TourStatsTableProps {
  rows: TourStatsRow[];
  totals: StatsTotals;
  visibility: Record<TourStatsColumnKey, boolean>;
  onVisibilityChange: (key: TourStatsColumnKey, visible: boolean) => void;
  isLoading?: boolean;
}

export const TourStatsTable = ({ rows, totals, visibility, onVisibilityChange, isLoading }: TourStatsTableProps) => {
  const firstVisibleTextCol = tourStatsTextColumnKeys.find((k) => visibility[k]);
  const totalLabel = (k: TourStatsColumnKey) => (firstVisibleTextCol === k ? 'Total' : '');

  return (
    <section>
      <SectionHeader
        title="Thống kê theo Tour"
        action={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns3 className="mr-2 h-4 w-4" />
                Cột
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Show columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {tourStatsColumns.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  checked={visibility[col.key]}
                  onCheckedChange={(checked) => onVisibilityChange(col.key, checked === true)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Loading statistics...</div>
      ) : rows.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">No tours found for the selected filters.</div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {visibility.tour && <TableHead>Tour</TableHead>}
                {visibility.date && <TableHead>Date</TableHead>}
                {visibility.days && <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.days} /></TableHead>}
                {visibility.client && <TableHead>Client</TableHead>}
                {visibility.guide && <TableHead>Guide</TableHead>}
                {visibility.company && <TableHead>Company</TableHead>}
                {visibility.allowances && <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.allowances} /></TableHead>}
                {visibility.guestTip && <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.guestTip} /></TableHead>}
                {visibility.companyTip && <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.companyTip} /></TableHead>}
                {visibility.shopping && <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.shopping} /></TableHead>}
                {visibility.ctpOnly && <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.ctpOnly} /></TableHead>}
                {visibility.incomeWithoutCarHotel && (
                  <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.incomeWithoutCarHotel} /></TableHead>
                )}
                {visibility.shopTipAllow && (
                  <TableHead className="text-right font-semibold"><StatColumnHelp {...statColumnHelp.shopTipAllow} /></TableHead>
                )}
                {visibility.finalTotal && (
                  <TableHead className="text-right font-bold bg-blue-100 dark:bg-blue-900">
                    <StatColumnHelp {...statColumnHelp.finalTotal} />
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((tour) => (
                <TableRow key={tour.id}>
                  {visibility.tour && (
                    <TableCell className="font-medium">
                      <Link
                        to={`/tours/${tour.id}`}
                        className="text-primary underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        {tour.tourCode}
                      </Link>
                    </TableCell>
                  )}
                  {visibility.date && <TableCell>{tour.startDate}</TableCell>}
                  {visibility.days && <TableCell className="text-right">{tour.totalDays}</TableCell>}
                  {visibility.client && <TableCell>{tour.clientName}</TableCell>}
                  {visibility.guide && <TableCell>{tour.guideName}</TableCell>}
                  {visibility.company && <TableCell>{tour.companyName}</TableCell>}
                  {visibility.allowances && <TableCell className="text-right">{formatCurrency(tour.totalAllowances)}</TableCell>}
                  {visibility.guestTip && <TableCell className="text-right">{formatCurrency(tour.totalTipFromGuests)}</TableCell>}
                  {visibility.companyTip && <TableCell className="text-right">{formatCurrency(tour.totalCompanyTip)}</TableCell>}
                  {visibility.shopping && <TableCell className="text-right">{formatCurrency(tour.totalShoppings)}</TableCell>}
                  {visibility.ctpOnly && <TableCell className="text-right">{formatCurrency(tour.totalCtpOnly)}</TableCell>}
                  {visibility.incomeWithoutCarHotel && (
                    <TableCell className="text-right font-medium">{formatCurrency(tour.incomeWithoutCarHotel)}</TableCell>
                  )}
                  {visibility.shopTipAllow && (
                    <TableCell className="text-right font-semibold text-primary">{formatCurrency(tour.totalShopTipAllow)}</TableCell>
                  )}
                  {visibility.finalTotal && (
                    <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(tour.finalTotal)}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                {visibility.tour && <TableCell className="font-bold">{totalLabel('tour')}</TableCell>}
                {visibility.date && <TableCell className="font-bold">{totalLabel('date')}</TableCell>}
                {visibility.days && <TableCell className="text-right font-bold">{totals.days}</TableCell>}
                {visibility.client && <TableCell className="font-bold">{totalLabel('client')}</TableCell>}
                {visibility.guide && <TableCell className="font-bold">{totalLabel('guide')}</TableCell>}
                {visibility.company && <TableCell className="font-bold">{totalLabel('company')}</TableCell>}
                {visibility.allowances && <TableCell className="text-right font-bold">{formatCurrency(totals.allowances)}</TableCell>}
                {visibility.guestTip && <TableCell className="text-right font-bold">{formatCurrency(totals.tipFromGuests)}</TableCell>}
                {visibility.companyTip && <TableCell className="text-right font-bold">{formatCurrency(totals.companyTip)}</TableCell>}
                {visibility.shopping && <TableCell className="text-right font-bold">{formatCurrency(totals.shoppings)}</TableCell>}
                {visibility.ctpOnly && <TableCell className="text-right font-bold">{formatCurrency(totals.ctpOnly)}</TableCell>}
                {visibility.incomeWithoutCarHotel && (
                  <TableCell className="text-right font-bold">{formatCurrency(totals.incomeWithoutCarHotel)}</TableCell>
                )}
                {visibility.shopTipAllow && (
                  <TableCell className="text-right font-bold text-primary">{formatCurrency(totals.totalShopTipAllow)}</TableCell>
                )}
                {visibility.finalTotal && (
                  <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(totals.finalTotal)}
                  </TableCell>
                )}
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
    </section>
  );
};
