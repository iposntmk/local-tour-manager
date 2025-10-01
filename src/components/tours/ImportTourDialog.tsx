import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, FileJson } from 'lucide-react';
import { toast } from 'sonner';
import type { Tour } from '@/types/tour';

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

  const validateTourData = (data: any): boolean => {
    // Check if it's an array or single object
    const tours = Array.isArray(data) ? data : [data];
    
    for (const tour of tours) {
      if (!tour.tourCode || !tour.startDate || !tour.endDate) {
        return false;
      }
    }
    return true;
  };

  const handleImport = () => {
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

      const tours = Array.isArray(parsed) ? parsed : [parsed];
      onImport(tours);
      setOpen(false);
      setJsonInput('');
      toast.success(`${tours.length} tour(s) imported successfully`);
    } catch (error) {
      toast.error('Invalid JSON format');
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
              placeholder='{"tourCode": "T001", "clientName": "John Doe", "startDate": "2024-01-01", "endDate": "2024-01-10", ...}'
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
