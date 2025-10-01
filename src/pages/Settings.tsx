import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Upload, Trash2 } from 'lucide-react';
import { store } from '@/lib/datastore';
import { toast } from 'sonner';
import { db } from '@/lib/datastore/db';

const Settings = () => {
  const handleExportData = async () => {
    try {
      const data = await store.exportData();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tour-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Data exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      try {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        
        const text = await file.text();
        const data = JSON.parse(text);
        await store.importData(data);
        
        toast.success('Data imported successfully');
        setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
        console.error('Import error:', error);
        toast.error('Failed to import data');
      }
    };
    input.click();
  };

  const handleResetDatabase = async () => {
    if (!confirm('Are you sure you want to delete ALL data? This cannot be undone!')) {
      return;
    }
    
    try {
      await db.delete();
      toast.success('Database reset successfully. Reloading...');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Reset error:', error);
      toast.error('Failed to reset database');
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your data and preferences</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>
              Export, import, or reset your tour management data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleExportData}
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <Download className="h-4 w-4" />
                Export All Data (JSON)
              </Button>
              
              <Button
                onClick={handleImportData}
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <Upload className="h-4 w-4" />
                Import Data (JSON)
              </Button>
              
              <Button
                onClick={handleResetDatabase}
                variant="destructive"
                className="w-full justify-start gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Reset Database
              </Button>
            </div>

            <div className="mt-6 p-4 bg-muted rounded-lg text-sm space-y-2">
              <p className="font-medium">About Local Storage:</p>
              <p className="text-muted-foreground">
                All your data is stored locally in your browser using IndexedDB. 
                Make sure to export backups regularly to prevent data loss.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Settings;
