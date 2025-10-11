import { useState, useEffect } from 'react';
import { store } from '@/lib/datastore';
import type { DiaryType } from '@/types/master';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Copy, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DiaryTypeDialog } from '@/components/diary-types/DiaryTypeDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Layout } from '@/components/Layout';

export default function DiaryTypes() {
  const [diaryTypes, setDiaryTypes] = useState<DiaryType[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDiaryType, setEditingDiaryType] = useState<DiaryType | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [diaryTypeToDelete, setDiaryTypeToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadDiaryTypes();
  }, [search]);

  const loadDiaryTypes = async () => {
    setLoading(true);
    try {
      const data = await store.listDiaryTypes({ search, status: 'all' });
      setDiaryTypes(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load diary types',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingDiaryType(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (diaryType: DiaryType) => {
    setEditingDiaryType(diaryType);
    setDialogOpen(true);
  };

  const handleDuplicate = async (diaryType: DiaryType) => {
    try {
      await store.duplicateDiaryType(diaryType.id);
      toast({ title: 'Diary type duplicated successfully' });
      loadDiaryTypes();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClick = (id: string) => {
    setDiaryTypeToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!diaryTypeToDelete) return;
    
    try {
      await store.deleteDiaryType(diaryTypeToDelete);
      toast({ title: 'Diary type deleted successfully' });
      loadDiaryTypes();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setDiaryTypeToDelete(null);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Diary Types</h1>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Diary Type
          </Button>
        </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search diary types..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : diaryTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  No diary types found
                </TableCell>
              </TableRow>
            ) : (
              diaryTypes.map((diaryType) => (
                <TableRow key={diaryType.id}>
                  <TableCell className="font-medium">{diaryType.name}</TableCell>
                  <TableCell>
                    <Badge variant={diaryType.status === 'active' ? 'default' : 'secondary'}>
                      {diaryType.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(diaryType)}>
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicate(diaryType)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(diaryType.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DiaryTypeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        diaryType={editingDiaryType}
        onSuccess={loadDiaryTypes}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the diary type.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </Layout>
  );
}
