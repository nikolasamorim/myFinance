import React from 'react';
import { Plus } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button } from '../ui/Button';
import { KanbanCard } from './KanbanCard';
import { cn } from '../../lib/utils';

interface KanbanItem {
  id: string;
  title: string;
  type?: string;
  parent_id?: string | null;
  sort_order?: number;
  children?: KanbanItem[];
  [key: string]: any;
}

interface KanbanColumnProps {
  id: string;
  title: string;
  items: KanbanItem[];
  onEdit: (item: KanbanItem) => void;
  onDelete: (id: string) => void;
  onCreate: (parentId?: string, type?: string) => void;
  renderItemContent?: (item: KanbanItem) => React.ReactNode;
  className?: string;
  emptyMessage?: string;
  columnType?: string;
}

export function KanbanColumn({
  id,
  title,
  items,
  onEdit,
  onDelete,
  onCreate,
  renderItemContent,
  className,
  emptyMessage = 'Nenhum item encontrado',
  columnType,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: 'column',
      columnType,
    },
  });

  const topLevelItems = items.filter(item => !item.parent_id);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col bg-gray-50 rounded-lg p-4 min-h-[400px] transition-colors',
        isOver && 'bg-blue-50 ring-2 ring-blue-200',
        className
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">{topLevelItems.length} itens</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onCreate(undefined, columnType)}
          className="flex-shrink-0"
        >
          <Plus className="w-4 h-4 mr-1" />
          Adicionar
        </Button>
      </div>

      {/* Items */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        <SortableContext
          items={topLevelItems.map(item => item.id)}
          strategy={verticalListSortingStrategy}
        >
          {topLevelItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="w-12 h-12 bg-gray-200 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <Plus className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium">{emptyMessage}</p>
              <p className="text-xs">Clique em "Adicionar" para começar</p>
            </div>
          ) : (
            topLevelItems.map(item => (
              <KanbanCard
                key={item.id}
                item={item}
                allItems={items}
                onEdit={onEdit}
                onDelete={onDelete}
                onCreate={onCreate}
                renderContent={renderItemContent}
                columnType={columnType}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}