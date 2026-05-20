import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CopyIdRow } from '@/components/master/CopyIdRow';
import type { Language, LanguageInput } from '@/types/master';

interface LanguageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language?: Language;
  onSubmit: (data: LanguageInput) => Promise<void>;
}

export function LanguageDialog({ open, onOpenChange, language, onSubmit }: LanguageDialogProps) {
  const [formData, setFormData] = useState<LanguageInput>({
    code: language?.code || '',
    name: language?.name || '',
    nativeName: language?.nativeName || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ code?: boolean; name?: boolean }>({});

  useEffect(() => {
    if (!open) return;

    setFormData({
      code: language?.code || '',
      name: language?.name || '',
      nativeName: language?.nativeName || '',
    });
    setErrors({});
  }, [language, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { code?: boolean; name?: boolean } = {};
    const missingFields: string[] = [];

    if (!formData.code.trim()) {
      newErrors.code = true;
      missingFields.push('Code');
    }

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
      await onSubmit({
        code: formData.code.trim().toLowerCase(),
        name: formData.name.trim(),
        nativeName: formData.nativeName?.trim() || undefined,
      });
      onOpenChange(false);
      setFormData({ code: '', name: '', nativeName: '' });
    } catch {
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
            <DialogTitle>{language ? 'Edit Language' : 'Add New Language'}</DialogTitle>
            <DialogDescription>
              {language ? 'Update language information' : 'Create a language for guide profiles'}
            </DialogDescription>
          </DialogHeader>
          {language && <CopyIdRow id={language.id} />}

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => {
                  setFormData({ ...formData, code: e.target.value.toLowerCase() });
                  if (errors.code) setErrors({ ...errors, code: false });
                }}
                placeholder="en"
                className={errors.code ? 'border-destructive' : ''}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: false });
                }}
                placeholder="English"
                className={errors.name ? 'border-destructive' : ''}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="nativeName">Native Name</Label>
              <Input
                id="nativeName"
                value={formData.nativeName}
                onChange={(e) => setFormData({ ...formData, nativeName: e.target.value })}
                placeholder="English"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : language ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
