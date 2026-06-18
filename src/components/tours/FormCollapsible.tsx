import { type ReactNode, useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FormCollapsibleProps {
  children: ReactNode;
  defaultOpen?: boolean;
  autoOpenKey?: number | string | null;
}

export function FormCollapsible({ children, defaultOpen = true, autoOpenKey }: FormCollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  const prevKey = useRef(autoOpenKey);

  useEffect(() => {
    if (autoOpenKey !== undefined && autoOpenKey !== null && autoOpenKey !== prevKey.current) {
      setOpen(true);
      prevKey.current = autoOpenKey;
    }
  }, [autoOpenKey]);

  return (
    <div>
      <div className="flex justify-end mb-2">
        <Button variant="ghost" size="sm" onClick={() => setOpen(!open)} className="gap-1">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {open ? 'Ẩn form' : 'Hiện form'}
        </Button>
      </div>
      {open && children}
    </div>
  );
}
