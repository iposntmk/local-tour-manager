import { memo, type ReactNode } from 'react';
import { ArrowUpDown, Calendar as CalendarIcon, Filter, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Nationality } from '@/types/master';

type MonthOption = {
  value: string;
  label: string;
};

type Props = {
  settlementStatusFilter: string;
  setSettlementStatusFilter: (v: string) => void;
  paymentStatusFilter: string;
  setPaymentStatusFilter: (v: string) => void;
  shoppingCommissionFilter: string;
  setShoppingCommissionFilter: (v: string) => void;
  nationalityFilter: string;
  setNationalityFilter: (v: string) => void;
  nationalities: Nationality[];
  selectedMonth: string;
  setSelectedMonth: (v: string) => void;
  months: MonthOption[];
  selectedYear: string;
  setSelectedYear: (v: string) => void;
  availableYears: number[];
  sortBy: string;
  setSortBy: (v: string) => void;
  toursCount: number;
  hasActiveFilters: boolean;
  clearFilters: () => void;
};

type FilterSelectProps = {
  label: string;
  icon: 'filter' | 'calendar' | 'sort';
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
};

const FilterSelect = ({ label, icon, value, onValueChange, children }: FilterSelectProps) => {
  const Icon = icon === 'calendar' ? CalendarIcon : icon === 'sort' ? ArrowUpDown : Filter;

  return (
    <div className="space-y-0.5 sm:space-y-1">
      <label className="text-[10px] sm:text-xs font-medium text-muted-foreground flex items-center gap-0.5 sm:gap-1">
        <Icon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
        {label}
      </label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-8 sm:h-10 text-xs sm:text-sm">
          <SelectValue placeholder="Tất cả" />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
};

export const ToursFilterAdvancedGrid = memo(function ToursFilterAdvancedGrid({
  settlementStatusFilter, setSettlementStatusFilter,
  paymentStatusFilter, setPaymentStatusFilter,
  shoppingCommissionFilter, setShoppingCommissionFilter,
  nationalityFilter, setNationalityFilter, nationalities,
  selectedMonth, setSelectedMonth, months,
  selectedYear, setSelectedYear, availableYears,
  sortBy, setSortBy,
  toursCount, hasActiveFilters, clearFilters,
}: Props) {
  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="sm:overflow-visible sm:max-h-none flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-3">
            <FilterSelect label="Trạng thái QT" icon="filter" value={settlementStatusFilter} onValueChange={setSettlementStatusFilter}>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="draft">Đang soạn</SelectItem>
              <SelectItem value="submitted">Đã gửi kế toán</SelectItem>
              <SelectItem value="need_changes">Cần bổ sung</SelectItem>
              <SelectItem value="approved">Đã duyệt</SelectItem>
              <SelectItem value="closed">Đã đóng</SelectItem>
            </FilterSelect>
            <FilterSelect label="Thanh toán" icon="filter" value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
              <SelectItem value="all">Tất cả thanh toán</SelectItem>
              <SelectItem value="pending">Chờ thanh toán</SelectItem>
              <SelectItem value="partial">Thanh toán một phần</SelectItem>
              <SelectItem value="paid">Đã thanh toán</SelectItem>
            </FilterSelect>
            <FilterSelect label="Hoa hồng" icon="filter" value={shoppingCommissionFilter} onValueChange={setShoppingCommissionFilter}>
              <SelectItem value="all">Tất cả hoa hồng</SelectItem>
              <SelectItem value="unpaid">Còn chưa nhận</SelectItem>
              <SelectItem value="paid">Đã nhận đủ</SelectItem>
            </FilterSelect>
            <FilterSelect label="Quốc tịch" icon="filter" value={nationalityFilter} onValueChange={setNationalityFilter}>
              <SelectItem value="all">Tất cả quốc tịch</SelectItem>
              {nationalities.map((nationality) => (
                <SelectItem key={nationality.id} value={nationality.id}>
                  {nationality.emoji} {nationality.name}
                </SelectItem>
              ))}
            </FilterSelect>
            <FilterSelect label="Tháng" icon="calendar" value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectItem value="all">Tất cả</SelectItem>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </FilterSelect>
            <FilterSelect label="Năm" icon="calendar" value={selectedYear} onValueChange={setSelectedYear}>
              <SelectItem value="all">Tất cả</SelectItem>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </FilterSelect>
            <FilterSelect label="Sắp xếp" icon="sort" value={sortBy} onValueChange={setSortBy}>
              <SelectItem value="startDate-desc">Ngày bắt đầu (Mới nhất)</SelectItem>
              <SelectItem value="startDate-asc">Ngày bắt đầu (Cũ nhất)</SelectItem>
              <SelectItem value="endDate-desc">Ngày kết thúc (Mới nhất)</SelectItem>
              <SelectItem value="endDate-asc">Ngày kết thúc (Cũ nhất)</SelectItem>
              <SelectItem value="tourCode-asc">Mã tour (A-Z)</SelectItem>
              <SelectItem value="tourCode-desc">Mã tour (Z-A)</SelectItem>
              <SelectItem value="clientName-asc">Tên khách (A-Z)</SelectItem>
              <SelectItem value="clientName-desc">Tên khách (Z-A)</SelectItem>
              <SelectItem value="createdAt-desc">Ngày tạo (Mới nhất)</SelectItem>
              <SelectItem value="createdAt-asc">Ngày tạo (Cũ nhất)</SelectItem>
            </FilterSelect>
          </div>
        </div>
        <Button variant="outline" onClick={clearFilters} className="h-8 sm:h-10 sm:self-end shrink-0">
          <X className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
          Xóa bộ lọc
        </Button>
      </div>
      {hasActiveFilters && (
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="text-base sm:text-lg font-semibold">Hiển thị {toursCount} tour</span>
          {nationalityFilter !== 'all' && (
            <Badge variant="secondary" className="text-sm font-medium">
              {nationalities.find((n) => n.id === nationalityFilter)?.name}
            </Badge>
          )}
          {selectedMonth !== 'all' && selectedYear !== 'all' && (
            <Badge variant="default" className="text-sm sm:text-base font-semibold px-3 py-1">
              {months.find((m) => m.value === selectedMonth)?.label} {selectedYear}
            </Badge>
          )}
          {shoppingCommissionFilter !== 'all' && (
            <Badge variant="secondary" className="text-sm font-medium">
              {shoppingCommissionFilter === 'unpaid' ? 'Hoa hồng chưa nhận' : 'Hoa hồng đã nhận đủ'}
            </Badge>
          )}
        </div>
      )}
    </>
  );
});
