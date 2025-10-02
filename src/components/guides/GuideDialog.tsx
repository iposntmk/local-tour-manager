import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TextareaWithSave } from '@/components/ui/textarea-with-save';
import { toast } from 'sonner';
import type { Guide, GuideInput } from '@/types/master';

interface GuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guide?: Guide;
  onSubmit: (data: GuideInput) => Promise<void>;
}

export function GuideDialog({ open, onOpenChange, guide, onSubmit }: GuideDialogProps) {
  const [formData, setFormData] = useState<GuideInput>({
    name: guide?.name || '',
    phone: guide?.phone || '',
    note: guide?.note || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: boolean }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const newErrors: { name?: boolean } = {};
    const missingFields: string[] = [];

    if (!formData.name.trim()) {
      newErrors.name = true;
      missingFields.push('Name');
    }

    if (missingFields.length > 0) {
      setErrors(newErrors);
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onOpenChange(false);
      setFormData({ name: '', phone: '', note: '' });
    } catch (error) {
      // Error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{guide ? 'Edit Guide' : 'Add New Guide'}</DialogTitle>
            <DialogDescription>
              {guide ? 'Update guide information' : 'Create a new guide profile'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: false });
                }}
                placeholder="Full name"
                className={errors.name ? 'border-destructive' : ''}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+84 XXX XXX XXX"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="note">Note</Label>
              <TextareaWithSave
                id="note"
                storageKey={guide ? `guide-note-edit-${guide.id}` : 'guide-note-create'}
                value={formData.note}
                onValueChange={(value) => setFormData({ ...formData, note: value })}
                placeholder="Languages, specialties, etc."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : guide ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
