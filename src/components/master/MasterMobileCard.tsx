import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Copy, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import type { ReactNode } from 'react';

interface MasterMobileCardProps {
  title: ReactNode;
  id: string;
  leading?: ReactNode;
  subtitle?: ReactNode;
  metadata?: ReactNode;
  isDefault?: boolean;
  isInactive?: boolean;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onToggleStatus?: () => void;
  onClick?: () => void;
  canEdit?: boolean;
  canCreate?: boolean;
  canDelete?: boolean;
  children?: ReactNode;
}

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  toast.success('Đã sao chép ID');
};

const MasterMobileCard = ({
  title,
  id,
  leading,
  subtitle,
  metadata,
  isDefault,
  isInactive,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleStatus,
  onClick,
  canEdit,
  canCreate,
  canDelete,
  children,
}: MasterMobileCardProps) => {
  return (
    <Card
      className={`p-4 cursor-pointer hover:bg-accent/50 transition-colors ${isInactive ? 'opacity-50 bg-muted/30' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {leading && <span className="shrink-0">{leading}</span>}
            <h3 className="font-semibold truncate">{title}</h3>
            {isDefault && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary shrink-0">
                Mặc định
              </span>
            )}
            {isInactive && (
              <span className="text-xs text-muted-foreground shrink-0">(Đã ẩn)</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground font-mono">ID: {id.slice(0, 8)}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(id);
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Copy className="h-3 w-3" />
            </button>
            {subtitle && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">{subtitle}</span>
              </>
            )}
          </div>

          {metadata && (
            <div className="mt-1.5 text-sm text-muted-foreground">
              {metadata}
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {onToggleStatus && canEdit && (
            <Button variant="ghost" size="sm" onClick={onToggleStatus} className="h-8 w-8 p-0">
              {isInactive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          )}
          {onEdit && canEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 p-0">
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {onDuplicate && canCreate && (
            <Button variant="ghost" size="sm" onClick={onDuplicate} className="h-8 w-8 p-0">
              <Copy className="h-4 w-4" />
            </Button>
          )}
          {onDelete && canDelete && (
            <Button variant="ghost" size="sm" onClick={onDelete} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {children && (
        <div className="mt-3 pt-3 border-t text-sm text-muted-foreground space-y-1">
          {children}
        </div>
      )}
    </Card>
  );
};

export default MasterMobileCard;
