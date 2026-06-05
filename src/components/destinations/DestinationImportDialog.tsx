import { BulkImportDialog } from '@/components/master/BulkImportDialog';

export type DestinationImportItem = {
  name: string;
  price: number;
  rawName?: string;
};

interface DestinationImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (items: DestinationImportItem[]) => Promise<void>;
}

const parseDestinationImportItem = (parts: string[]): DestinationImportItem | null => {
  if (parts.length < 2 || !parts[0].trim()) return null;

  const name = parts[0].trim();
  const price = parseFloat(parts[1].replace(/[^\d.-]/g, ''));
  if (isNaN(price) || price <= 0) return null;

  const rawName = parts[2]?.trim();
  return { name, price, rawName: rawName || undefined };
};

export function DestinationImportDialog({
  open,
  onOpenChange,
  onImport,
}: DestinationImportDialogProps) {
  return (
    <BulkImportDialog
      open={open}
      onOpenChange={onOpenChange}
      onImport={onImport}
      title="Import điểm đến"
      description="Import điểm đến từ file hoặc dán dữ liệu. Mỗi dòng gồm: tên,đơn giá,tên chưa chuẩn hóa (không bắt buộc)"
      placeholder="Nhập điểm đến (mỗi dòng một điểm, định dạng: tên,đơn giá,tên chưa chuẩn hóa)&#10;Ví dụ:&#10;Vịnh Hạ Long,1500000,Ha Long bay&#10;Sa Pa,2000000&#10;Phố cổ Hội An,800000,Hoi An old town"
      parseItem={parseDestinationImportItem}
    />
  );
}
