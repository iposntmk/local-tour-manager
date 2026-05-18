import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/currency-utils';
import { StatColumnHelp } from '../StatColumnHelp';
import { statColumnHelp, type GroupStatsRow } from '../shared';
import { SectionHeader } from '../charts/SectionHeader';

interface GroupStatsTableProps {
  title: string;
  firstColumnLabel: string;
  rows: GroupStatsRow[];
  isLoading?: boolean;
}

export const GroupStatsTable = ({ title, firstColumnLabel, rows, isLoading }: GroupStatsTableProps) => {
  return (
    <section>
      <SectionHeader title={title} />
      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Đang tải thống kê...</div>
      ) : rows.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">No tours found for the selected filters.</div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{firstColumnLabel}</TableHead>
                <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.totalTours} /></TableHead>
                <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.allowances} /></TableHead>
                <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.guestTip} /></TableHead>
                <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.companyTip} /></TableHead>
                <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.shopping} /></TableHead>
                <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.ctpOnly} /></TableHead>
                <TableHead className="text-right"><StatColumnHelp {...statColumnHelp.incomeWithoutCarHotel} /></TableHead>
                <TableHead className="text-right font-semibold"><StatColumnHelp {...statColumnHelp.shopTipAllow} /></TableHead>
                <TableHead className="text-right font-bold bg-blue-100 dark:bg-blue-900">
                  <StatColumnHelp {...statColumnHelp.finalTotal} />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell>{row.label}</TableCell>
                  <TableCell className="text-right">{row.totalTours}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.totalAllowances)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.totalTipFromGuests)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.totalCompanyTip)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.totalShoppings)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.totalCtpOnly)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(row.totalIncomeWithoutCarHotel)}</TableCell>
                  <TableCell className="text-right font-semibold text-primary">{formatCurrency(row.totalShopTipAllow)}</TableCell>
                  <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(row.finalTotal)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
};
