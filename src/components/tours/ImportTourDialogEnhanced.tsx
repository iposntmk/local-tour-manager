import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TextareaWithSave } from '@/components/ui/textarea-with-save';
import { Label } from '@/components/ui/label';
import { Upload, FileJson, Download } from 'lucide-react';
import { useImportTourDialogBase } from '@/hooks/useImportTourDialogBase';
import { EnhancedImportReview } from '@/components/tours/EnhancedImportReview';
import type { Tour } from '@/types/tour';

interface ImportTourDialogEnhancedProps {
  onImport: (tours: Partial<Tour>[]) => void;
  trigger?: React.ReactNode;
}

export const ImportTourDialogEnhanced = ({ onImport, trigger }: ImportTourDialogEnhancedProps) => {
  const [open, setOpen] = useState(false);
  const {
    jsonInput, setJsonInput, isProcessing, reviewItems, entityCaches,
    handleFileUpload, handleImport, handleConfirmImport, clearReview, downloadSample,
  } = useImportTourDialogBase(open);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="hover-scale">
            <Upload className="h-4 w-4 mr-2" />Import JSON
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-7xl max-h-[95vh] overflow-hidden">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-lg">Import Tours from JSON</DialogTitle>
          <DialogDescription className="text-sm">Upload or paste JSON, then review and edit tour data before importing.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          {reviewItems.length === 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="json-file-enhanced" className="flex items-center gap-2 cursor-pointer">
                    <FileJson className="h-4 w-4" />Upload JSON File
                  </Label>
                  <input id="json-file-enhanced" type="file" accept=".json" onChange={handleFileUpload} className="mt-2" />
                </div>
                <Button variant="outline" size="sm" onClick={downloadSample} className="ml-2">
                  <Download className="h-4 w-4 mr-2" />Download Sample
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or paste JSON</span>
                </div>
              </div>

              <div>
                <Label htmlFor="json-textarea-enhanced">JSON Data</Label>
                <TextareaWithSave id="json-textarea-enhanced" storageKey="tour-import-json"
                  value={jsonInput} onValueChange={setJsonInput}
                  placeholder='[{"tour": {"tourCode": "T001", "company": "ABC", "tourGuide": "John", ...}}]'
                  className="min-h-[300px] font-mono text-sm" />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleImport} disabled={isProcessing}>
                  {isProcessing ? 'Processing...' : 'Parse & Review'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-hidden">
              <EnhancedImportReview
                items={reviewItems}
                onCancel={clearReview}
                onConfirm={async (tours) => {
                  const ok = await handleConfirmImport(onImport, tours);
                  if (ok) setOpen(false);
                }}
                preloadedEntities={entityCaches ?? undefined}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
