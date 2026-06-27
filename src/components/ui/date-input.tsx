import { forwardRef, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Calendar } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  COMPACT_STEPPER_BUTTON,
  COMPACT_STEPPER_ICON,
  DEFAULT_STEPPER_BUTTON,
  DEFAULT_STEPPER_ICON,
} from '@/lib/form-control-styles';
import { cn, formatDate, parseDate } from '@/lib/utils';

interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value?: string;
  onChange?: (value: string) => void;
  size?: 'default' | 'sm';
}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ value = '', onChange, disabled, size = 'default', className, ...props }, ref) => {
    const [open, setOpen] = useState(false);
    const [displayValue, setDisplayValue] = useState('');
    const isSmall = size === 'sm';

    useEffect(() => {
      if (value) {
        setDisplayValue(formatDate(value));
      } else {
        setDisplayValue('');
      }
    }, [value]);

    const formatDateToString = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const handleIncrement = () => {
      if (!value) { onChange?.(formatDateToString(new Date())); return; }
      const date = new Date(value + 'T00:00:00');
      date.setDate(date.getDate() + 1);
      onChange?.(formatDateToString(date));
    };

    const handleDecrement = () => {
      if (!value) { onChange?.(formatDateToString(new Date())); return; }
      const date = new Date(value + 'T00:00:00');
      date.setDate(date.getDate() - 1);
      onChange?.(formatDateToString(date));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setDisplayValue(e.target.value);
      const parsed = parseDate(e.target.value);
      if (parsed) onChange?.(parsed);
    };

    const handleCalendarSelect = (date: Date | undefined) => {
      if (date) { onChange?.(formatDateToString(date)); setOpen(false); }
    };

    const btnClass = isSmall ? COMPACT_STEPPER_BUTTON : DEFAULT_STEPPER_BUTTON;
    const iconClass = isSmall ? COMPACT_STEPPER_ICON : DEFAULT_STEPPER_ICON;

    return (
      <div className={`flex items-center ${isSmall ? 'gap-px sm:gap-1' : 'gap-2'}`}>
        <Button type="button" variant="outline" size="icon" onClick={handleDecrement} disabled={disabled} className={btnClass}>
          <Minus className={iconClass} />
        </Button>
        <div className={`flex-1 flex items-center ${isSmall ? 'gap-px sm:gap-1' : 'gap-2'}`}>
          <Input
            {...props}
            ref={ref}
            type="text"
            value={displayValue}
            onChange={handleInputChange}
            disabled={disabled}
            placeholder="DD/MM/YYYY"
            className={cn('flex-1', isSmall && 'h-9 min-h-9 text-sm sm:h-10 sm:min-h-10 sm:text-base', className)}
          />
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="icon" disabled={disabled} className={btnClass}>
                <Calendar className={iconClass} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent mode="single" selected={value ? new Date(value + 'T00:00:00') : undefined} onSelect={handleCalendarSelect} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
        <Button type="button" variant="outline" size="icon" onClick={handleIncrement} disabled={disabled} className={btnClass}>
          <Plus className={iconClass} />
        </Button>
      </div>
    );
  }
);

DateInput.displayName = 'DateInput';
