import { useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import type { EntityRef } from '@/types/tour';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus } from 'lucide-react';

export interface EntitySelectorProps {
  entities: any[];
  selected: EntityRef | undefined;
  onSelect: (entity: any) => void;
  onCreateNew: () => void;
  placeholder: string;
}

export function EntitySelector({ entities, selected, onSelect, onCreateNew, placeholder }: EntitySelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredEntities = useMemo(() => {
    if (!searchQuery.trim()) return entities;

    const fuse = new Fuse(entities, {
      keys: ['name'],
      threshold: 0.4,
      includeScore: true,
    });

    return fuse.search(searchQuery).map(result => result.item);
  }, [entities, searchQuery]);

  return (
    <div className="flex items-center gap-1">
      <Select
        value={selected?.id || undefined}
        onValueChange={(value) => {
          const entity = entities.find(e => e.id === value);
          if (entity) onSelect(entity);
        }}
        onOpenChange={setIsOpen}
      >
        <SelectTrigger className="h-7 flex-1 text-xs">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <div className="p-1">
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 text-xs"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <Separator />
          {filteredEntities.map((entity) => (
            <SelectItem key={entity.id} value={entity.id} className="text-xs">
              {entity.name}
            </SelectItem>
          ))}
          {filteredEntities.length === 0 && (
            <div className="p-1 text-xs text-muted-foreground text-center">
              No results found
            </div>
          )}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onCreateNew}
        className="h-7 w-7 p-0"
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}
