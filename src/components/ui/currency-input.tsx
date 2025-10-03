import { forwardRef, useState, useEffect } from 'react';
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

    // Sync internal display when value prop changes
    useEffect(() => {
      setDisplayValue(value ? formatNumber(value) : '');
    }, [value]);

    const parseNumber = (str: string): number => {
      const cleaned = str.replace(/\./g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      const cleaned = input.replace(/[^0-9]/g, '');
      const parsed = parseInt(cleaned) || 0;

      // Don't format while typing - just show the cleaned numbers
      setDisplayValue(cleaned);
      onChange?.(parsed);
    };

    const handleBlur = () => {
      // Format the number when user leaves the field
      const numValue = parseNumber(displayValue);
      setDisplayValue(numValue ? formatNumber(numValue) : '');
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
