import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Shopping as MasterShopping } from '@/types/master';
import { upsertById } from '@/lib/query-cache';

interface NewShoppingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readOnly?: boolean;
  guideId?: string;
  onCreated: (shopping: { name: string }) => void;
}

export function NewShoppingDialog({ open, onOpenChange, readOnly, guideId, onCreated }: NewShoppingDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');

  const createShoppingMutation = useMutation({
    mutationFn: () => store.createShopping({ name: name.trim(), guideId }),
    onSuccess: (newShopping) => {
      queryClient.setQueryData<MasterShopping[]>(['shoppings', guideId ?? null], (current) => upsertById(current, newShopping));
      queryClient.invalidateQueries({ queryKey: ['shoppings', guideId ?? null] });
      toast.success('Đã tạo mục mua sắm');
      onCreated({ name: newShopping.name });
      setName('');
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(`Tạo mục mua sắm thất bại: ${error.message}`),
  });

  const handleSubmit = () => {
    if (!name.trim()) { toast.error('Vui lòng nhập tên mục mua sắm'); return; }
    createShoppingMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setName(''); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm mục mua sắm mới</DialogTitle>
          <DialogDescription>Tạo mục mua sắm mới để thêm vào danh sách dùng chung.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="new-shopping-name">Tên mục mua sắm *</Label>
            <Input
              id="new-shopping-name"
              placeholder="ví dụ: TIP, Cửa hàng lưu niệm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => { setName(''); onOpenChange(false); }}>Hủy</Button>
          <Button type="button" onClick={handleSubmit} disabled={readOnly || createShoppingMutation.isPending}>
            {createShoppingMutation.isPending ? 'Đang tạo...' : 'Tạo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
