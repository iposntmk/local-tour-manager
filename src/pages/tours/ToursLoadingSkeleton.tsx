import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const ToursLoadingSkeleton = () => (
  <>
    <div className="grid grid-cols-1 gap-4 mt-6 md:hidden">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
      ))}
    </div>
    <div className="hidden md:block mt-6 rounded-lg border bg-card overflow-hidden">
      <Table className="min-w-[1350px]">
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead>Mã tour</TableHead>
            <TableHead>Ngày</TableHead>
            <TableHead>Ngày đi</TableHead>
            <TableHead>Khách</TableHead>
            <TableHead>Công ty</TableHead>
            <TableHead className="text-right">CTP</TableHead>
            <TableHead className="text-right">Tổng</TableHead>
            <TableHead>Cờ cảnh báo</TableHead>
            <TableHead className="text-right">Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[1, 2, 3, 4, 5].map((i) => (
            <TableRow key={i}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((cell) => (
                <TableCell key={cell}>
                  <div className="h-4 rounded bg-muted animate-pulse" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </>
);
