import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { CheckedState } from '@radix-ui/react-checkbox';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { PERMISSION_TREE, getNodePermissions, type PermissionTreeNode } from '@/lib/permissions';
import type { Permission } from '@/types/user';

interface PermissionTreeProps {
  value: Permission[];
  onChange: (permissions: Permission[]) => void;
  disabledPermissions?: Permission[];
}

function PermissionNode({
  node,
  selected,
  disabled,
  level = 0,
  onToggle,
}: {
  node: PermissionTreeNode;
  selected: Set<Permission>;
  disabled: Set<Permission>;
  level?: number;
  onToggle: (permissions: Permission[], checked: boolean) => void;
}) {
  const [open, setOpen] = useState(level < 1);
  const permissions = useMemo(() => getNodePermissions(node), [node]);
  const checkedCount = permissions.filter((permission) => selected.has(permission)).length;
  const disabledCount = permissions.filter((permission) => disabled.has(permission)).length;
  const allChecked = permissions.length > 0 && checkedCount === permissions.length;
  const partiallyChecked = checkedCount > 0 && checkedCount < permissions.length;
  const checkedState: CheckedState = allChecked ? true : partiallyChecked ? 'indeterminate' : false;
  const hasChildren = !!node.children?.length;
  const fullyDisabled = permissions.length > 0 && disabledCount === permissions.length;

  const handleCheckedChange = (state: CheckedState) => {
    onToggle(permissions, state === true);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="space-y-1">
      <div
        className={cn(
          'flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60',
          level === 0 && 'bg-muted/40 font-medium'
        )}
        style={{ paddingLeft: `${8 + level * 18}px` }}
      >
        {hasChildren ? (
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6">
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        ) : (
          <span className="h-6 w-6" />
        )}
        <Checkbox
          checked={checkedState}
          onCheckedChange={handleCheckedChange}
          disabled={fullyDisabled}
          aria-label={node.label}
        />
        <div className="min-w-0 flex-1">
          <div className="text-sm leading-5">{node.label}</div>
          {node.description && (
            <div className="text-xs text-muted-foreground">{node.description}</div>
          )}
        </div>
        {hasChildren && (
          <span className="text-xs text-muted-foreground">
            {checkedCount}/{permissions.length}
          </span>
        )}
      </div>
      {hasChildren && (
        <CollapsibleContent className="space-y-1">
          {node.children!.map((child) => (
            <PermissionNode
              key={child.id}
              node={child}
              selected={selected}
              disabled={disabled}
              level={level + 1}
              onToggle={onToggle}
            />
          ))}
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

export function PermissionTree({ value, onChange, disabledPermissions = [] }: PermissionTreeProps) {
  const selected = useMemo(() => new Set(value), [value]);
  const disabled = useMemo(() => new Set(disabledPermissions), [disabledPermissions]);

  const handleToggle = (permissions: Permission[], checked: boolean) => {
    const next = new Set(selected);
    permissions.forEach((permission) => {
      if (disabled.has(permission)) return;
      if (checked) {
        next.add(permission);
      } else {
        next.delete(permission);
      }
    });
    disabledPermissions.forEach((permission) => next.add(permission));
    onChange(Array.from(next));
  };

  return (
    <div className="rounded-lg border bg-background p-2">
      {PERMISSION_TREE.map((node) => (
        <PermissionNode
          key={node.id}
          node={node}
          selected={selected}
          disabled={disabled}
          onToggle={handleToggle}
        />
      ))}
    </div>
  );
}
