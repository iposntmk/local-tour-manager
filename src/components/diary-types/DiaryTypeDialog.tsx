import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { store } from '@/lib/datastore';
import type { DiaryType, DiaryTypeInput, DiaryDataType } from '@/types/master';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface DiaryTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diaryType?: DiaryType;
  onSuccess: () => void;
}

interface FormData extends DiaryTypeInput {
  status?: 'active' | 'inactive';
  dataType: DiaryDataType;
}

export function DiaryTypeDialog({ open, onOpenChange, diaryType, onSuccess }: DiaryTypeDialogProps) {
  const { toast } = useToast();
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>();

  const status = watch('status');
  const dataType = watch('dataType');

  useEffect(() => {
    if (diaryType) {
      reset({
        name: diaryType.name,
        dataType: diaryType.dataType,
        status: diaryType.status,
      });
    } else {
      reset({
        name: '',
        dataType: 'text',
        status: 'active',
      });
    }
  }, [diaryType, reset, open]);

  const onSubmit = async (data: FormData) => {
    try {
      if (diaryType) {
        await store.updateDiaryType(diaryType.id, data);
        toast({ title: 'Diary type updated successfully' });
      } else {
        await store.createDiaryType(data);
        toast({ title: 'Diary type created successfully' });
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{diaryType ? 'Edit Diary Type' : 'Add Diary Type'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              {...register('name', { required: 'Name is required' })}
              placeholder="Enter diary type name"
            />
            {errors.name && (
              <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="dataType">Data Type *</Label>
            <Select value={dataType} onValueChange={(value: DiaryDataType) => setValue('dataType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select data type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="time">Time</SelectItem>
                <SelectItem value="datetime">Date & Time</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="boolean">Boolean (Yes/No)</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="location">Location</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {diaryType && (
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value: 'active' | 'inactive') => setValue('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : diaryType ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
