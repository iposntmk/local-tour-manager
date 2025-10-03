import { forwardRef, useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: number;
  onChange?: (value: number) => void;
  showQuickAmounts?: boolean;
}

const formatNumber = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const QUICK_AMOUNTS = [50000, 100000, 120000, 150000, 200000];

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value = 0, onChange, showQuickAmounts = true, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState(
      value ? formatNumber(value) : ''
    );
    const [isFocused, setIsFocused] = useState(false);
    const isInternalChange = useRef(false);

    // Sync internal display when value prop changes from external source
    useEffect(() => {
      if (!isFocused && !isInternalChange.current) {
        setDisplayValue(value ? formatNumber(value) : '');
      }
      isInternalChange.current = false;
    }, [value, isFocused]);

    const parseNumber = (str: string): number => {
      const cleaned = str.replace(/\./g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      const cleaned = input.replace(/[^0-9]/g, '');

      // Update display value with raw input (no formatting while typing)
      setDisplayValue(cleaned);

      // Parse and send the numeric value
      const parsed = cleaned === '' ? 0 : parseInt(cleaned);
      isInternalChange.current = true;
      onChange?.(parsed);
    };

    const handleFocus = () => {
      setIsFocused(true);
      // Remove formatting when focused for easier editing
      const numValue = parseNumber(displayValue);
      if (numValue > 0) {
        setDisplayValue(numValue.toString());
      }
    };

    const handleBlur = () => {
      setIsFocused(false);
      // Format the number when user leaves the field
      const numValue = parseNumber(displayValue);
      setDisplayValue(numValue ? formatNumber(numValue) : '');
      isInternalChange.current = true;
      onChange?.(numValue);
    };

    const handleQuickAmount = (amount: number) => {
      setDisplayValue(formatNumber(amount));
      onChange?.(amount);
    };

    return (
      <div className="space-y-2">
        <Input
          {...props}
          ref={ref}
          type="text"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {showQuickAmounts && (
          <div className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((amount) => (
              <Button
                key={amount}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(amount)}
                className="text-xs px-2 py-1 h-7"
              >
                {amount >= 1000 ? `${amount / 1000}k` : amount}
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
