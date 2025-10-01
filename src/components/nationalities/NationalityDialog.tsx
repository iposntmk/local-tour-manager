import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Nationality, NationalityInput } from '@/types/master';

interface NationalityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nationality?: Nationality;
  onSubmit: (data: NationalityInput) => Promise<void>;
}

export function NationalityDialog({ open, onOpenChange, nationality, onSubmit }: NationalityDialogProps) {
  const [formData, setFormData] = useState<NationalityInput>({
    name: nationality?.name || '',
    iso2: nationality?.iso2 || '',
    emoji: nationality?.emoji || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onOpenChange(false);
      setFormData({ name: '', iso2: '', emoji: '' });
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
            <DialogTitle>{nationality ? 'Edit Nationality' : 'Add New Nationality'}</DialogTitle>
            <DialogDescription>
              {nationality ? 'Update nationality information' : 'Create a new nationality'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Country Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Country name"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="iso2">ISO Code</Label>
                <Input
                  id="iso2"
                  value={formData.iso2}
                  onChange={(e) => setFormData({ ...formData, iso2: e.target.value.toUpperCase() })}
                  placeholder="VN"
                  maxLength={2}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="emoji">Flag Emoji</Label>
                <Input
                  id="emoji"
                  value={formData.emoji}
                  onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                  placeholder="🇻🇳"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : nationality ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
