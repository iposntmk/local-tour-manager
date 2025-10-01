import { forwardRef, useState } from 'react';
import { Input } from '@/components/ui/input';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: number;
  onChange?: (value: number) => void;
}

const formatNumber = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value = 0, onChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState(
      value ? formatNumber(value) : ''
    );

    const parseNumber = (str: string): number => {
      const cleaned = str.replace(/,/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      const cleaned = input.replace(/[^0-9.]/g, '');
      const parsed = parseNumber(cleaned);
      
      setDisplayValue(cleaned ? formatNumber(parsed) : '');
      onChange?.(parsed);
    };

    const handleBlur = () => {
      if (value !== undefined) {
        setDisplayValue(value ? formatNumber(value) : '');
      }
    };

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
      />
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
