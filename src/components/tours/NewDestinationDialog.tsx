import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { store } from '@/lib/datastore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { CurrencyInput } from '@/components/ui/currency-input';
import { ProvinceDialog } from '@/components/provinces/ProvinceDialog';
import { toast } from 'sonner';
import type { Province, ProvinceInput, TouristDestination } from '@/types/master';
import { upsertById } from '@/lib/query-cache';

interface NewDestinationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readOnly?: boolean;
  onCreated: (destination: { name: string; price: number }) => void;
}

export function NewDestinationDialog({ open, onOpenChange, readOnly, onCreated }: NewDestinationDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [provinceId, setProvinceId] = useState('');
  const [openProvince, setOpenProvince] = useState(false);
  const [showProvinceDialog, setShowProvinceDialog] = useState(false);

  const { data: provinces = [] } = useQuery({
    queryKey: ['provinces'],
    queryFn: () => store.listProvinces({ status: 'active' }),
  });

  const createProvinceMutation = useMutation({
    mutationFn: (data: ProvinceInput) => store.createProvince(data),
    onSuccess: (province) => {
      queryClient.setQueryData<Province[]>(['provinces'], (current) => upsertById(current, province));
      queryClient.invalidateQueries({ queryKey: ['provinces'] });
      setProvinceId(province.id);
      setShowProvinceDialog(false);
      toast.success('Đã tạo tỉnh/thành');
    },
    onError: (error: Error) => toast.error(`Tạo tỉnh/thành thất bại: ${error.message}`),
  });

  const createDestinationMutation = useMutation({
    mutationFn: () => {
      const province = provinces.find((p) => p.id === provinceId);
      if (!province) throw new Error('Không tìm thấy tỉnh/thành');
      return store.createTouristDestination({ name, price, provinceRef: { id: provinceId, nameAtBooking: province.name } });
    },
    onSuccess: (newDest) => {
      queryClient.setQueryData<TouristDestination[]>(['touristDestinations'], (current) => upsertById(current, newDest));
      queryClient.invalidateQueries({ queryKey: ['touristDestinations'] });
      toast.success('Đã tạo điểm tham quan');
      onCreated({ name: newDest.name, price: newDest.price });
      reset();
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(`Tạo điểm đến thất bại: ${error.message}`),
  });

  const reset = () => {
    setName('');
    setPrice(0);
    setProvinceId('');
  };

  const handleSubmit = () => {
    if (!name.trim()) { toast.error('Vui lòng nhập tên điểm đến'); return; }
    if (price <= 0) { toast.error('Vui lòng nhập giá hợp lệ'); return; }
    if (!provinceId) { toast.error('Vui lòng chọn tỉnh/thành'); return; }
    createDestinationMutation.mutate();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm điểm tham quan mới</DialogTitle>
            <DialogDescription>Tạo điểm tham quan mới để có thể dùng lại cho các tour khác.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-dest-name">Tên điểm đến</Label>
              <Input
                id="new-dest-name"
                placeholder="ví dụ: Vịnh Hạ Long, Hội An"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tỉnh/Thành phố</Label>
              <div className="flex gap-2">
                <Popover open={openProvince} onOpenChange={setOpenProvince}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" role="combobox" className="min-w-0 flex-1 justify-between">
                      <span className="truncate">
                        {provinceId ? provinces.find((p) => p.id === provinceId)?.name : 'Chọn tỉnh/thành...'}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Tìm tỉnh/thành..." />
                      <CommandList>
                        <CommandEmpty>Không tìm thấy tỉnh/thành.</CommandEmpty>
                        <CommandGroup>
                          {provinces.map((prov) => (
                            <CommandItem key={prov.id} value={prov.name} onSelect={() => { setProvinceId(prov.id); setOpenProvince(false); }}>
                              <Check className={cn('mr-2 h-4 w-4', provinceId === prov.id ? 'opacity-100' : 'opacity-0')} />
                              {prov.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button type="button" variant="outline" size="icon" title="Thêm tỉnh/thành" onClick={() => setShowProvinceDialog(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Giá mặc định (VND)</Label>
              <CurrencyInput placeholder="Giá mặc định" value={price} onChange={setPrice} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Hủy</Button>
            <Button type="button" onClick={handleSubmit} disabled={readOnly || createDestinationMutation.isPending}>
              {createDestinationMutation.isPending ? 'Đang tạo...' : 'Tạo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ProvinceDialog
        open={showProvinceDialog}
        onOpenChange={setShowProvinceDialog}
        onSubmit={(data) => createProvinceMutation.mutate(data)}
      />
    </>
  );
}
