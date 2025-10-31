import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';

interface NumberInputMobileProps {
  value: number | string | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function NumberInputMobile({
  value,
  onChange,
  min = 0,
  max,
  placeholder,
  className = '',
  disabled = false,
}: NumberInputMobileProps) {
  const numValue = typeof value === 'number' ? value : (value === '' || value === undefined) ? undefined : Number(value);

  const handleIncrement = () => {
    const current = numValue ?? min;
    const newValue = current + 1;
    if (max === undefined || newValue <= max) {
      onChange(newValue);
    }
  };

  const handleDecrement = () => {
    const current = numValue ?? min;
    const newValue = current - 1;
    if (newValue >= min) {
      onChange(newValue);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (inputValue === '') {
      onChange(undefined);
      return;
    }

    let val = Number(inputValue);
    if (!Number.isNaN(val)) {
      if (val < min) val = min;
      if (max !== undefined && val > max) val = max;
      onChange(val);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0 md:hidden"
        onClick={handleDecrement}
        disabled={disabled || (numValue !== undefined && numValue <= min)}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Input
        type="number"
        min={min}
        max={max}
        placeholder={placeholder}
        className={className}
        value={value ?? ''}
        onChange={handleInputChange}
        disabled={disabled}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0 md:hidden"
        onClick={handleIncrement}
        disabled={disabled || (max !== undefined && numValue !== undefined && numValue >= max)}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
