import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, FileJson } from 'lucide-react';
import { toast } from 'sonner';
import { store } from '@/lib/datastore';
import type { Tour } from '@/types/tour';
import type { EntityRef } from '@/types/tour';

interface ImportTourDialogProps {
  onImport: (tours: Partial<Tour>[]) => void;
  trigger?: React.ReactNode;
}

export const ImportTourDialog = ({ onImport, trigger }: ImportTourDialogProps) => {
  const [open, setOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Please upload a JSON file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonInput(content);
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
    };
    reader.readAsText(file);
  };

  const findOrCreateEntityRef = async (
    entityType: 'company' | 'guide' | 'nationality',
    name: string
  ): Promise<EntityRef> => {
    if (!name || name.trim() === '') {
      return { id: '', nameAtBooking: '' };
    }

    try {
      let entities;
      switch (entityType) {
        case 'company':
          entities = await store.listCompanies({ search: name });
          break;
        case 'guide':
          entities = await store.listGuides({ search: name });
          break;
        case 'nationality':
          entities = await store.listNationalities({ search: name });
          break;
      }

      const match = entities.find(e => 
        e.name.toLowerCase() === name.toLowerCase()
      );

      if (match) {
        return { id: match.id, nameAtBooking: match.name };
      }

      // Create new entity if not found
      let newEntity;
      switch (entityType) {
        case 'company':
          newEntity = await store.createCompany({ name, note: '', email: '', phone: '', contactName: '' });
          break;
        case 'guide':
          newEntity = await store.createGuide({ name, note: '', phone: '' });
          break;
        case 'nationality':
          newEntity = await store.createNationality({ name, iso2: '', emoji: '' });
          break;
      }

      return { id: newEntity.id, nameAtBooking: newEntity.name };
    } catch (error) {
      console.error(`Error finding/creating ${entityType}:`, error);
      return { id: '', nameAtBooking: name };
    }
  };

  const transformImportedTour = async (data: any): Promise<Partial<Tour>> => {
    // Check if it's the new format with tour/subcollections structure
    const tourData = data.tour || data;
    const subcollections = data.subcollections || {};

    const companyRef = await findOrCreateEntityRef('company', tourData.company || '');
    const guideRef = await findOrCreateEntityRef('guide', tourData.tourGuide || '');
    const nationalityRef = await findOrCreateEntityRef('nationality', tourData.clientNationality || '');

    return {
      tourCode: tourData.tourCode,
      clientName: tourData.clientName || '',
      adults: tourData.adults || 0,
      children: tourData.children || 0,
      totalGuests: tourData.totalGuests || 0,
      driverName: tourData.driverName || '',
      clientPhone: tourData.clientPhone || '',
      startDate: tourData.startDate,
      endDate: tourData.endDate,
      totalDays: tourData.totalDays || 0,
      companyRef,
      guideRef,
      clientNationalityRef: nationalityRef,
      destinations: subcollections.destinations || [],
      expenses: subcollections.expenses || [],
      meals: subcollections.meals || [],
      allowances: subcollections.allowances || [],
      summary: subcollections.summary || { totalTabs: 0 },
    };
  };

  const validateTourData = (data: any): boolean => {
    const tours = Array.isArray(data) ? data : [data];
    
    for (const tour of tours) {
      const tourData = tour.tour || tour;
      if (!tourData.tourCode || !tourData.startDate || !tourData.endDate) {
        return false;
      }
    }
    return true;
  };

  const handleImport = async () => {
    if (!jsonInput.trim()) {
      toast.error('Please paste JSON data or upload a file');
      return;
    }

    setIsProcessing(true);
    try {
      const parsed = JSON.parse(jsonInput);
      
      if (!validateTourData(parsed)) {
        toast.error('Invalid tour data. Required fields: tourCode, startDate, endDate');
        setIsProcessing(false);
        return;
      }

      const rawTours = Array.isArray(parsed) ? parsed : [parsed];
      const transformedTours = await Promise.all(
        rawTours.map(tour => transformImportedTour(tour))
      );
      
      onImport(transformedTours);
      setOpen(false);
      setJsonInput('');
      toast.success(`${transformedTours.length} tour(s) imported successfully`);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Invalid JSON format or import failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="hover-scale">
            <Upload className="h-4 w-4 mr-2" />
            Import JSON
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Tours from JSON</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="json-file" className="flex items-center gap-2 cursor-pointer">
              <FileJson className="h-4 w-4" />
              Upload JSON File
            </Label>
            <input
              id="json-file"
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="mt-2"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or paste JSON</span>
            </div>
          </div>

          <div>
            <Label htmlFor="json-textarea">JSON Data</Label>
            <Textarea
              id="json-textarea"
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder='{"tour": {"tourCode": "T001", "company": "ABC", "tourGuide": "John", "clientName": "Amy", "clientNationality": "USA", "adults": 2, "children": 0, "startDate": "2024-01-01", "endDate": "2024-01-10"}, "subcollections": {"destinations": [], "expenses": [], "meals": [], "allowances": []}}'
              className="min-h-[300px] font-mono text-sm"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={isProcessing}>
              {isProcessing ? 'Importing...' : 'Import'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
