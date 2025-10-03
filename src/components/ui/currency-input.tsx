import { forwardRef, useState, useEffect, useRef, useImperativeHandle } from 'react';
import { X } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: number;
  onChange?: (value: number) => void;
  showQuickAmounts?: boolean;
  currencyLabel?: string;
  containerClassName?: string;
}

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

const QUICK_AMOUNTS = [50000, 100000, 120000, 150000, 200000];

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      value = 0,
      onChange,
      showQuickAmounts = true,
      currencyLabel = 'VND',
      containerClassName,
      className,
      ...props
    },
    ref,
  ) => {
    const [displayValue, setDisplayValue] = useState(
      value ? formatNumber(value) : ''
    );
    const [isFocused, setIsFocused] = useState(false);
    const isInternalChange = useRef(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => inputRef.current!, []);

    // Sync internal display when value prop changes from external source
    useEffect(() => {
      if (!isFocused && !isInternalChange.current) {
        setDisplayValue(value ? formatNumber(value) : '');
      }
      isInternalChange.current = false;
    }, [value, isFocused]);

    const parseNumber = (str: string): number => {
      const cleaned = str.replace(/[^0-9]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      const cleaned = input.replace(/[^0-9]/g, '');

      // Update display value with raw input (no formatting while typing)
      setDisplayValue(cleaned);

      // Parse and send the numeric value
      const parsed = cleaned === '' ? 0 : parseInt(cleaned, 10);
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
      isInternalChange.current = true;
      onChange?.(amount);
    };

    const handleClear = () => {
      setDisplayValue('');
      isInternalChange.current = true;
      onChange?.(0);
      inputRef.current?.focus();
    };

    const hasValue = displayValue !== '';
    const isDisabled = props.disabled;

    return (
      <div className="space-y-2">
        <div
          className={cn(
            'group relative flex items-center gap-3 rounded-2xl border border-lime-300/70 bg-white/90 px-4 py-2 shadow-[0_0_0_1px_rgba(190,242,100,0.4)] transition focus-within:border-lime-500 focus-within:shadow-[0_0_0_2px_rgba(132,204,22,0.4)]',
            isDisabled && 'cursor-not-allowed opacity-60',
            containerClassName,
          )}
        >
          <Input
            {...props}
            ref={inputRef}
            type="text"
            value={displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={props.disabled}
            className={cn(
              'h-10 flex-1 border-none bg-transparent px-0 py-0 text-lg font-semibold tracking-wide text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0',
              className,
            )}
          />
          <button
            type="button"
            onClick={handleClear}
            disabled={!hasValue || isDisabled}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full bg-lime-100/70 text-lime-700 transition hover:bg-lime-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400 disabled:cursor-default disabled:opacity-0',
            )}
            aria-label="Clear amount"
          >
            <X className="h-4 w-4" />
          </button>
          <span className="h-6 w-[2px] rounded-full bg-orange-400/80" aria-hidden="true" />
          <span className="text-sm font-semibold uppercase tracking-wide text-lime-700">
            {currencyLabel}
          </span>
        </div>
        {showQuickAmounts && (
          <div className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((amount) => (
              <Button
                key={amount}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(amount)}
                className="h-8 rounded-full border-lime-200 px-3 py-1 text-xs font-semibold text-lime-700 transition hover:border-lime-400 hover:bg-lime-50"
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
