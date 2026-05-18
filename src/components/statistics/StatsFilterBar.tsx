import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Option {
  id: string;
  name: string;
}

interface StatsFilterBarProps {
  guides: Option[];
  companies: Option[];
  nationalities: Option[];
  months: string[];
  selectedGuide: string;
  selectedCompany: string;
  selectedNationality: string;
  selectedMonth: string;
  onGuideChange: (id: string) => void;
  onCompanyChange: (id: string) => void;
  onNationalityChange: (id: string) => void;
  onMonthChange: (month: string) => void;
  onReset: () => void;
  matchedCount: number;
}

export const StatsFilterBar = ({
  guides,
  companies,
  nationalities,
  months,
  selectedGuide,
  selectedCompany,
  selectedNationality,
  selectedMonth,
  onGuideChange,
  onCompanyChange,
  onNationalityChange,
  onMonthChange,
  onReset,
  matchedCount,
}: StatsFilterBarProps) => {
  return (
    <div className="rounded-lg border bg-card md:bg-transparent md:border-0 md:border-b md:rounded-none p-4 md:p-0 md:pb-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
        <FilterSelect label="Hướng dẫn viên" value={selectedGuide} onChange={onGuideChange} options={guides} allLabel="Tất cả HDV" />
        <FilterSelect label="Công ty" value={selectedCompany} onChange={onCompanyChange} options={companies} allLabel="Tất cả công ty" />
        <FilterSelect label="Quốc tịch" value={selectedNationality} onChange={onNationalityChange} options={nationalities} allLabel="Tất cả quốc tịch" />
        <div className="flex flex-col">
          <label className="mb-1 text-xs font-medium text-muted-foreground">Tháng</label>
          <Select value={selectedMonth} onValueChange={onMonthChange}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Tất cả tháng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả tháng</SelectItem>
              {months.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col">
          <label className="mb-1 text-xs font-medium text-muted-foreground invisible md:visible">Reset</label>
          <Button variant="outline" className="h-9" onClick={onReset}>
            Reset filters
          </Button>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{matchedCount}</span> tour phù hợp với bộ lọc.
      </p>
    </div>
  );
};

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  allLabel: string;
}

const FilterSelect = ({ label, value, onChange, options, allLabel }: FilterSelectProps) => (
  <div className="flex flex-col">
    <label className="mb-1 text-xs font-medium text-muted-foreground">{label}</label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9">
        <SelectValue placeholder={allLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);
