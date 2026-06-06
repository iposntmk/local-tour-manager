import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, ChevronRight, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { buildFinalTour } from '@/lib/import-review-utils';
import type { ReviewItem } from '@/hooks/useEnhancedImportReview';

interface ImportReviewJsonViewProps {
  /** Bản nháp hiện tại (đã phản ánh các chỉnh sửa của người dùng). */
  draft: ReviewItem[];
  /** OCR thô của Azure (chỉ có ở luồng import từ ảnh). */
  rawOcr?: unknown;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Không thể sao chép JSON');
    }
  };
  return (
    <Button variant="ghost" size="sm" className="h-6 px-2" onClick={handleCopy}>
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  const text = useMemo(() => JSON.stringify(value, null, 2), [value]);
  return (
    <div className="flex flex-col min-w-0 flex-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</span>
        <CopyButton text={text} />
      </div>
      <pre className="text-[11px] leading-relaxed bg-muted/50 rounded-md p-2 overflow-x-auto border whitespace-pre-wrap break-words">
        {text}
      </pre>
    </div>
  );
}

/** OCR thô của Azure thường rất lớn nên mặc định thu gọn. */
function RawOcrBlock({ value }: { value: unknown }) {
  const [open, setOpen] = useState(false);
  const text = useMemo(() => JSON.stringify(value, null, 2), [value]);
  return (
    <div className="border rounded-md">
      <div className="flex items-center justify-between px-2 py-1.5 bg-muted/40">
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          OCR thô (Azure)
        </button>
        <CopyButton text={text} />
      </div>
      {open && (
        <pre className="text-[11px] leading-relaxed bg-muted/50 p-2 overflow-x-auto whitespace-pre-wrap break-words max-h-[40vh]">
          {text}
        </pre>
      )}
    </div>
  );
}

/**
 * Tab "JSON": hiển thị đồng thời OCR thô của Azure, JSON parse ban đầu và dữ liệu
 * tour sẽ được lưu (cập nhật trực tiếp theo chỉnh sửa ở tab Dữ liệu).
 */
export function ImportReviewJsonView({ draft, rawOcr }: ImportReviewJsonViewProps) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y">
      <div className="space-y-4 sm:space-y-6 pr-2 sm:pr-4">
        {rawOcr != null && <RawOcrBlock value={rawOcr} />}

        {draft.map((item, index) => {
          const finalTour = buildFinalTour(item.tour);
          const parsed = item.sourceJson ?? item.raw;
          const label = item.tour.tourCode || item.tour.clientName || `Tour ${index + 1}`;
          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                <span className="text-sm font-medium">{label}</span>
              </div>
              <div className="flex flex-col lg:flex-row gap-3">
                <JsonBlock title="JSON parse ban đầu" value={parsed} />
                <JsonBlock title="Dữ liệu sẽ import" value={finalTour} />
              </div>
              {index < draft.length - 1 && <div className="border-t border-gray-300 pt-2" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
