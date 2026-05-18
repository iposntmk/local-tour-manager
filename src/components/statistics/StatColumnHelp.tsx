import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface StatColumnHelpProps {
  label: string;
  title: string;
  description: string;
}

export const StatColumnHelp = ({ label, title, description }: StatColumnHelpProps) => (
  <Popover>
    <PopoverTrigger asChild>
      <button
        type="button"
        className="inline-flex items-center justify-center gap-1 rounded-sm text-center underline decoration-dotted underline-offset-4 hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <span className="whitespace-pre-line">{label}</span>
        <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      </button>
    </PopoverTrigger>
    <PopoverContent align="end" className="w-72 text-left">
      <div className="space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </PopoverContent>
  </Popover>
);
