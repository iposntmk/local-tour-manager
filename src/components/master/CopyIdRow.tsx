import { useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface CopyIdRowProps {
  id: string;
}

/**
 * "ID: <uuid> [📋]" row for entity dialogs. Renders an offscreen input
 * INSIDE the dialog content so the legacy execCommand('copy') fallback
 * works on HTTP LAN — Radix Dialog marks document.body siblings inert
 * when open, which would silently invalidate any textarea appended there.
 */
export const CopyIdRow = ({ id }: CopyIdRowProps) => {
  const [copied, setCopied] = useState(false);
  const helperRef = useRef<HTMLInputElement>(null);

  const handleCopy = () => {
    if (!id) return;

    const markCopied = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(id).then(markCopied).catch(() => {
        toast.error('Không thể copy ID vào clipboard');
      });
      return;
    }

    const input = helperRef.current;
    if (!input) {
      toast.error('Không thể copy ID. Vui lòng copy thủ công.');
      return;
    }
    input.value = id;
    input.focus();
    input.select();
    input.setSelectionRange(0, id.length);

    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }

    if (ok) markCopied();
    else toast.error('Không thể copy ID. Vui lòng copy thủ công.');
  };

  return (
    <>
      <input
        ref={helperRef}
        tabIndex={-1}
        aria-hidden="true"
        readOnly
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
      <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
        <span className="text-sm text-muted-foreground">ID:</span>
        <code className="flex-1 text-sm font-mono">{id}</code>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleCopy();
          }}
          className="h-7 w-7 p-0"
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </>
  );
};
