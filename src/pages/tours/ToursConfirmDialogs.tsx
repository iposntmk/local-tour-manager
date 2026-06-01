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

interface ToursConfirmDialogsProps {
  showAdminCreateConfirm: boolean;
  pendingDuplicateId: string | null;
  deleteTourId: string | null;
  onAdminCreateOpenChange: (open: boolean) => void;
  onDuplicateOpenChange: (open: boolean) => void;
  onDeleteOpenChange: (open: boolean) => void;
  onAdminCreateConfirm: () => void;
  onDuplicateConfirm: () => void;
  onDeleteConfirm: () => void;
}

export function ToursConfirmDialogs({
  showAdminCreateConfirm,
  pendingDuplicateId,
  deleteTourId,
  onAdminCreateOpenChange,
  onDuplicateOpenChange,
  onDeleteOpenChange,
  onAdminCreateConfirm,
  onDuplicateConfirm,
  onDeleteConfirm,
}: ToursConfirmDialogsProps) {
  return (
    <>
      <AlertDialog open={showAdminCreateConfirm} onOpenChange={onAdminCreateOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận tạo tour</AlertDialogTitle>
            <AlertDialogDescription>Bạn là admin. Bạn có muốn tạo tour mới không?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => onAdminCreateOpenChange(false)}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={onAdminCreateConfirm}>Tạo tour</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingDuplicateId} onOpenChange={onDuplicateOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận sao chép tour</AlertDialogTitle>
            <AlertDialogDescription>Bạn là admin. Bạn có chắc chắn muốn sao chép tour này không?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => onDuplicateOpenChange(false)}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={onDuplicateConfirm}>Sao chép</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTourId} onOpenChange={onDeleteOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa tour này?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Tour sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => onDeleteOpenChange(false)}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={onDeleteConfirm}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
