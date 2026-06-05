import { useEffect, useState } from 'react';
import { FileImage, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImportReviewImageViewProps {
  file: File;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export function ImportReviewImageView({ file }: ImportReviewImageViewProps) {
  const [url, setUrl] = useState('');
  const isPdf = file.type === 'application/pdf';

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <div className="h-[calc(100vh-300px)] min-h-[360px] flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex items-center gap-2 text-sm">
          {isPdf ? <FileText className="h-4 w-4 shrink-0" /> : <FileImage className="h-4 w-4 shrink-0" />}
          <span className="truncate font-medium">{file.name}</span>
          <span className="shrink-0 text-muted-foreground">{formatBytes(file.size)}</span>
        </div>
        {url && (
          <Button asChild variant="outline" size="sm">
            <a href={url} target="_blank" rel="noreferrer">Mở file</a>
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-md border bg-muted/20">
        {url && isPdf && (
          <object data={url} type="application/pdf" className="h-full w-full">
            <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">
              Không thể xem PDF trong trình duyệt này.
            </div>
          </object>
        )}
        {url && !isPdf && (
          <img
            src={url}
            alt="Ảnh chương trình tour đã gửi OCR"
            className="h-full w-full object-contain"
          />
        )}
      </div>
    </div>
  );
}
