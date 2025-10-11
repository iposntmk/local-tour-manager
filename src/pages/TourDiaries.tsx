import { useState, useEffect } from 'react';
import { store } from '@/lib/datastore';
import type { TourDiary } from '@/types/master';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Copy, Trash2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TourDiaryDialog } from '@/components/tour-diaries/TourDiaryDialog';
import { TourDiaryViewDialog } from '@/components/tour-diaries/TourDiaryViewDialog';
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
import { format } from 'date-fns';
import { Layout } from '@/components/Layout';

export default function TourDiaries() {
  const [tourDiaries, setTourDiaries] = useState<TourDiary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingDiary, setEditingDiary] = useState<TourDiary | undefined>();
  const [viewingDiary, setViewingDiary] = useState<TourDiary | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [diaryToDelete, setDiaryToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadTourDiaries();
  }, [search]);

  const loadTourDiaries = async () => {
    setLoading(true);
    try {
      const data = await store.listTourDiaries({ search });
      setTourDiaries(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load tour diaries',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingDiary(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (diary: TourDiary) => {
    setEditingDiary(diary);
    setDialogOpen(true);
  };

  const handleView = (diary: TourDiary) => {
    setViewingDiary(diary);
    setViewDialogOpen(true);
  };

  const handleDuplicate = async (diary: TourDiary) => {
    try {
      await store.duplicateTourDiary(diary.id);
      toast({ title: 'Tour diary duplicated successfully' });
      loadTourDiaries();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClick = (id: string) => {
    setDiaryToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!diaryToDelete) return;
    
    try {
      await store.deleteTourDiary(diaryToDelete);
      toast({ title: 'Tour diary deleted successfully' });
      loadTourDiaries();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setDiaryToDelete(null);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Tour Diaries</h1>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Tour Diary
          </Button>
        </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by tour code or diary type..."
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
              <TableHead>Tour Code</TableHead>
              <TableHead>Diary Type</TableHead>
              <TableHead>Content Type</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : tourDiaries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  No tour diaries found
                </TableCell>
              </TableRow>
            ) : (
              tourDiaries.map((diary) => (
                <TableRow key={diary.id}>
                  <TableCell className="font-medium">
                    {diary.tourRef.tourCodeAtBooking}
                  </TableCell>
                  <TableCell>{diary.diaryTypeRef.nameAtBooking}</TableCell>
                  <TableCell>
                    <Badge>{diary.contentType}</Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(diary.createdAt), 'dd/MM/yyyy HH:mm')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => handleView(diary)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(diary)}>
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicate(diary)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(diary.id)}
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

      <TourDiaryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tourDiary={editingDiary}
        onSuccess={loadTourDiaries}
      />

      <TourDiaryViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        tourDiary={viewingDiary}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the tour diary.
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
