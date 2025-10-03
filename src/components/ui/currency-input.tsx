import { forwardRef, useState, useEffect, useRef, useImperativeHandle } from 'react';
import { X } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'size'> {
  value?: number;
  onChange?: (value: number) => void;
  showQuickAmounts?: boolean;
  currencyLabel?: string;
  containerClassName?: string;
  size?: 'default' | 'compact';
}

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat().format(num);
};

const QUICK_AMOUNTS = [35000, 50000, 100000, 120000, 150000, 200000, 220000];

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      value = 0,
      onChange,
      showQuickAmounts = true,
      currencyLabel = 'VND',
      containerClassName,
      className,
      size = 'compact',
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
      const selectionStart = e.target.selectionStart ?? input.length;

      // Count digits to the left of the caret in the raw input
      const digitsLeftOfCaret = (input.slice(0, selectionStart).match(/\d/g) || []).length;

      // Strip all non-digits and compute numeric value
      const cleaned = input.replace(/\D/g, '');
      const parsed = cleaned === '' ? 0 : parseInt(cleaned, 10);

      // Format with thousand separators
      const formatted = cleaned ? formatNumber(parsed) : '';
      setDisplayValue(formatted);

      // Emit numeric value
      isInternalChange.current = true;
      onChange?.(parsed);

      // Restore caret position based on number of digits to the left
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (!el) return;
        let digitCount = 0;
        let caretPos = 0;
        for (let i = 0; i < formatted.length; i++) {
          if (/\d/.test(formatted[i])) {
            digitCount++;
          }
          caretPos = i + 1;
          if (digitCount >= digitsLeftOfCaret) break;
        }
        // If there are fewer digits in formatted than digitsLeftOfCaret, place at end
        if (digitsLeftOfCaret === 0) caretPos = 0;
        if (digitCount < digitsLeftOfCaret) caretPos = formatted.length;
        try {
          el.setSelectionRange(caretPos, caretPos);
        } catch {}
      });
    };

    const handleFocus = () => {
      setIsFocused(true);
      // Keep formatting while focused so thousands separators show during typing
    };

    const handleBlur = () => {
      setIsFocused(false);
      // Ensure display stays formatted on blur
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

    const isCompact = size === 'compact';

    return (
      <div className={cn(isCompact ? 'space-y-1' : 'space-y-2')}>
        <div
          className={cn(
            'group relative flex items-center rounded-2xl border border-lime-300/70 bg-white/90 shadow-[0_0_0_1px_rgba(190,242,100,0.4)] transition focus-within:border-lime-500 focus-within:shadow-[0_0_0_2px_rgba(132,204,22,0.4)]',
            isCompact ? 'gap-2 rounded-md px-2 py-1' : 'gap-3 px-4 py-2',
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
              'flex-1 border-none bg-transparent px-0 py-0 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0',
              isCompact ? 'h-8 text-sm font-medium' : 'h-10 text-lg font-semibold tracking-wide',
              className,
            )}
          />
          <button
            type="button"
            onClick={handleClear}
            disabled={!hasValue || isDisabled}
            className={cn(
              'flex items-center justify-center rounded-full bg-lime-100/70 text-lime-700 transition hover:bg-lime-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400 disabled:cursor-default disabled:opacity-0',
              isCompact ? 'h-6 w-6' : 'h-8 w-8',
            )}
            aria-label="Clear amount"
          >
            <X className="h-4 w-4" />
          </button>
          <span className={cn('rounded-full bg-orange-400/80', isCompact ? 'h-4 w-px' : 'h-6 w-[2px]')} aria-hidden="true" />
          <span className={cn('font-semibold uppercase tracking-wide text-lime-700', isCompact ? 'text-xs' : 'text-sm')}>
            {currencyLabel}
          </span>
        </div>
        {showQuickAmounts && (
          <div className={cn('flex flex-wrap', isCompact ? 'gap-1' : 'gap-2')}>
            {QUICK_AMOUNTS.map((amount) => (
              <Button
                key={amount}
                type="button"
                variant="outline"
                size={isCompact ? 'xs' as any : 'sm'}
                onClick={() => handleQuickAmount(amount)}
                className={cn(
                  'rounded-full border-lime-200 text-lime-700 transition hover:border-lime-400 hover:bg-lime-50',
                  isCompact ? 'h-6 px-2 py-0.5 text-[11px]' : 'h-8 px-3 py-1 text-xs font-semibold'
                )}
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
