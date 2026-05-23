import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TextareaWithSave } from '@/components/ui/textarea-with-save';
import { Label } from '@/components/ui/label';
import { Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface BulkImportDialogProps<T = any> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (items: T[]) => Promise<void>;
  title: string;
  description: string;
  placeholder?: string;
  parseItem?: (parts: string[]) => T | null;
}

export const BulkImportDialog = <T = any,>({
  open,
  onOpenChange,
  onImport,
  title,
  description,
  placeholder = 'Nhập dữ liệu (mỗi dòng một mục, định dạng: tên,giá)\nVí dụ:\nVịnh Hạ Long,1500000\nSapa Trek,2000000',
  parseItem
}: BulkImportDialogProps<T>) => {
  // Create unique storage key based on dialog title
  const storageKey = `bulk-import-${title.toLowerCase().replace(/\s+/g, '-')}`;
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.txt') && !file.name.endsWith('.csv')) {
      toast.error('Vui lòng tải lên file TXT hoặc CSV');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setTextInput(content);
    };
    reader.onerror = () => {
      toast.error('Không thể đọc file');
    };
    reader.readAsText(file);
  };

  const defaultParseItem = (parts: string[]): T | null => {
    if (parts.length >= 2) {
      const name = parts[0];
      const price = parseFloat(parts[1].replace(/[^\d.-]/g, '')); // Remove non-numeric chars except dot and minus

      if (name && !isNaN(price)) {
        return { name, price } as T;
      }
    }
    return null;
  };

  const parseItems = (text: string): T[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const items: T[] = [];
    const parser = parseItem || defaultParseItem;

    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim());
      const item = parser(parts);
      if (item !== null) {
        items.push(item);
      }
    }

    return items;
  };

  const handleImport = async () => {
    if (!textInput.trim()) {
      toast.error('Vui lòng nhập dữ liệu hoặc tải lên file');
      return;
    }

    setIsProcessing(true);
    try {
      const items = parseItems(textInput);

      if (items.length === 0) {
        toast.error('Không tìm thấy mục nào hợp lệ. Sử dụng định dạng: tên,giá (mỗi dòng một mục)');
        return;
      }

      await onImport(items);
      setTextInput('');
      onOpenChange(false);
      toast.success(`Đã nhập thành công ${items.length} mục`);
    } catch (error) {
      console.error('Import error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Import failed';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setTextInput('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="import-file" className="flex items-center gap-2 cursor-pointer">
              <FileText className="h-4 w-4" />
              Tải lên file TXT/CSV
            </Label>
            <input
              id="import-file"
              type="file"
              accept=".txt,.csv"
              onChange={handleFileUpload}
              className="mt-2"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Hoặc dán văn bản</span>
            </div>
          </div>

          <div>
            <Label htmlFor="import-textarea">Nhập dữ liệu</Label>
            <TextareaWithSave
              id="import-textarea"
              storageKey={storageKey}
              value={textInput}
              onValueChange={setTextInput}
              placeholder={placeholder}
              className="min-h-[300px] font-mono text-sm"
            />
          </div>

          <div className="text-sm text-muted-foreground">
            <p className="font-medium">Định dạng:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Mỗi dòng một mục</li>
              <li>Định dạng: <code className="bg-muted px-1 py-0.5 rounded">tên,giá</code></li>
              <li>Giá có thể bao gồm ký hiệu tiền tệ (sẽ được tự động loại bỏ)</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Hủy
            </Button>
            <Button onClick={handleImport} disabled={isProcessing}>
              {isProcessing ? 'Đang nhập...' : 'Nhập'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
