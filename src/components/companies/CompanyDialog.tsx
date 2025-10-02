import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TextareaWithSave } from '@/components/ui/textarea-with-save';
import { toast } from 'sonner';
import type { Company, CompanyInput } from '@/types/master';

interface CompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: Company;
  onSubmit: (data: CompanyInput) => Promise<void>;
}

export function CompanyDialog({ open, onOpenChange, company, onSubmit }: CompanyDialogProps) {
  const [formData, setFormData] = useState<CompanyInput>({
    name: company?.name || '',
    contactName: company?.contactName || '',
    phone: company?.phone || '',
    email: company?.email || '',
    note: company?.note || '',
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
      missingFields.push('Company Name');
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
      setFormData({ name: '', contactName: '', phone: '', email: '', note: '' });
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
            <DialogTitle>{company ? 'Edit Company' : 'Add New Company'}</DialogTitle>
            <DialogDescription>
              {company ? 'Update company information' : 'Create a new company profile'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Company Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: false });
                }}
                placeholder="Company name"
                className={errors.name ? 'border-destructive' : ''}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contactName">Contact Person</Label>
              <Input
                id="contactName"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                placeholder="Mr./Ms. Name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@company.com"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="note">Note</Label>
              <TextareaWithSave
                id="note"
                storageKey="company-note"
                value={formData.note}
                onValueChange={(value) => setFormData({ ...formData, note: value })}
                placeholder="Additional information"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : company ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
