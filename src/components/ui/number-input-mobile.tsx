import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';
import {
  COMPACT_STEPPER_BUTTON,
  COMPACT_STEPPER_ICON,
  DEFAULT_STEPPER_BUTTON,
  DEFAULT_STEPPER_ICON,
  ULTRA_COMPACT_STEPPER_BUTTON,
  ULTRA_COMPACT_STEPPER_ICON,
} from '@/lib/form-control-styles';
import { cn } from '@/lib/utils';

interface NumberInputMobileProps {
  value: number | string | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  size?: 'default' | 'sm';
  density?: 'default' | 'ultra';
}

export function NumberInputMobile({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  placeholder,
  className = '',
  disabled = false,
  size = 'default',
  density = 'default',
}: NumberInputMobileProps) {
  const numValue = typeof value === 'number' ? value : (value === '' || value === undefined) ? undefined : Number(value);
  const isSmall = size === 'sm';
  const isUltra = density === 'ultra';
  const btnClass = isUltra
    ? ULTRA_COMPACT_STEPPER_BUTTON
    : isSmall ? COMPACT_STEPPER_BUTTON : DEFAULT_STEPPER_BUTTON;
  const iconClass = isUltra
    ? ULTRA_COMPACT_STEPPER_ICON
    : isSmall ? COMPACT_STEPPER_ICON : DEFAULT_STEPPER_ICON;

  const handleIncrement = () => {
    const current = numValue ?? min;
    const newValue = current + step;
    if (max === undefined || newValue <= max) onChange(newValue);
  };

  const handleDecrement = () => {
    const current = numValue ?? min;
    const newValue = current - step;
    if (newValue >= min) onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (inputValue === '') { onChange(undefined); return; }
    let val = Number(inputValue);
    if (!Number.isNaN(val)) {
      if (val < min) val = min;
      if (max !== undefined && val > max) val = max;
      onChange(val);
    }
  };

  return (
    <div className={cn('flex items-center', isUltra ? 'gap-px sm:gap-0.5' : isSmall ? 'gap-px sm:gap-1' : 'gap-1')}>
      <Button type="button" variant="outline" size="icon" className={btnClass} onClick={handleDecrement} disabled={disabled || (numValue !== undefined && numValue <= min)}>
        <Minus className={iconClass} />
      </Button>
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        className={cn(
          isUltra && 'h-6 min-h-6 px-1 py-0 text-sm leading-none sm:h-7 sm:min-h-7 sm:px-1.5 sm:text-base',
          isSmall && !isUltra && 'h-9 min-h-9 text-sm sm:h-10 sm:min-h-10 sm:text-base',
          className,
        )}
        value={value ?? ''}
        onChange={handleInputChange}
        disabled={disabled}
      />
      <Button type="button" variant="outline" size="icon" className={btnClass} onClick={handleIncrement} disabled={disabled || (max !== undefined && numValue !== undefined && numValue >= max)}>
        <Plus className={iconClass} />
      </Button>
    </div>
  );
}
