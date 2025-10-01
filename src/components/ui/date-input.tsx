import { forwardRef, useRef, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Calendar } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { formatDate, parseDate } from '@/lib/utils';

interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value?: string;
  onChange?: (value: string) => void;
}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ value = '', onChange, ...props }, ref) => {
    const [open, setOpen] = useState(false);
    const [displayValue, setDisplayValue] = useState('');

    useEffect(() => {
      if (value) {
        // Convert YYYY-MM-DD to DD/MM/YYYY for display
        setDisplayValue(formatDate(value));
      } else {
        setDisplayValue('');
      }
    }, [value]);

    const handleIncrement = () => {
      if (!value) {
        const today = new Date().toISOString().split('T')[0];
        onChange?.(today);
        return;
      }
      const date = new Date(value);
      date.setDate(date.getDate() + 1);
      onChange?.(date.toISOString().split('T')[0]);
    };

    const handleDecrement = () => {
      if (!value) {
        const today = new Date().toISOString().split('T')[0];
        onChange?.(today);
        return;
      }
      const date = new Date(value);
      date.setDate(date.getDate() - 1);
      onChange?.(date.toISOString().split('T')[0]);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      setDisplayValue(input);

      // Try to parse DD/MM/YYYY format
      const parsed = parseDate(input);
      if (parsed) {
        onChange?.(parsed);
      }
    };

    const handleCalendarSelect = (date: Date | undefined) => {
      if (date) {
        const formatted = date.toISOString().split('T')[0];
        onChange?.(formatted);
        setOpen(false);
      }
    };

    return (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleDecrement}
          className="h-10 w-10 shrink-0"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <div className="flex-1 flex items-center gap-2">
          <Input
            {...props}
            ref={ref}
            type="text"
            value={displayValue}
            onChange={handleInputChange}
            placeholder="DD/MM/YYYY"
            className="flex-1"
          />
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
              >
                <Calendar className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="single"
                selected={value ? new Date(value) : undefined}
                onSelect={handleCalendarSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleIncrement}
          className="h-10 w-10 shrink-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  }
);

DateInput.displayName = 'DateInput';
