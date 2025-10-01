import { forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value = 0, onChange, min = 0, max, step = 1, ...props }, ref) => {
    const handleIncrement = () => {
      const newValue = (value || 0) + step;
      if (max === undefined || newValue <= max) {
        onChange?.(newValue);
      }
    };

    const handleDecrement = () => {
      const newValue = (value || 0) - step;
      if (newValue >= min) {
        onChange?.(newValue);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseInt(e.target.value);
      if (!isNaN(parsed)) {
        onChange?.(parsed);
      } else if (e.target.value === '') {
        onChange?.(0);
      }
    };

    return (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleDecrement}
          disabled={value <= min}
          className="h-10 w-10 shrink-0"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          {...props}
          ref={ref}
          type="number"
          value={value}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          className="text-center"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleIncrement}
          disabled={max !== undefined && value >= max}
          className="h-10 w-10 shrink-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  }
);

NumberInput.displayName = 'NumberInput';
