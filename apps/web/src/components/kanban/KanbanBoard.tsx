import React, { useState } from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';

interface KanbanItem {
  id: string;
  title: string;
  type?: string;
  parent_id?: string | null;
  sort_order?: number;
  children?: KanbanItem[];
  [key: string]: any;
}

interface KanbanColumn {
  id: string;
  title: string;
  type?: string;
}

interface KanbanBoardProps {
  items: KanbanItem[];
  columns: KanbanColumn[];
  onEdit: (item: KanbanItem) => void;
  onDelete: (id: string) => void;
  onCreate: (parentId?: string, type?: string) => void;
  onReorder: (updates: Array<{ id: string; parent_id: string | null; sort_order: number; type?: string }>) => Promise<void>;
  renderItemContent?: (item: KanbanItem) => React.ReactNode;
  className?: string;
}

export function KanbanBoard({
  items,
  columns,
  onEdit,
  onDelete,
  onCreate,
  onReorder,
  renderItemContent,
  className,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<KanbanItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    const item = items.find(item => item.id === active.id);
    setDraggedItem(item || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Handle drag over logic if needed
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDraggedItem(null);

    if (!over || active.id === over.id) {
      return;
    }

    const activeItem = items.find(item => item.id === active.id);
    if (!activeItem) return;

    const overData = over.data.current;
    
    try {
      let newParentId: string | null = null;
      let newType = activeItem.type;
      let newSortOrder = 0;

      if (overData?.type === 'column') {
        // Dropped on a column - make it a top-level item
        newParentId = null;
        newType = overData.columnType || activeItem.type;
        
        // Find the highest sort order in this column
        const columnItems = items.filter(item => 
          !item.parent_id && item.type === newType
        );
        newSortOrder = Math.max(...columnItems.map(item => item.sort_order || 0), -1) + 1;
      } else if (overData?.type === 'item') {
        // Dropped on another item
        const overItem = overData.item;
        
        if (overItem.parent_id === null) {
          // Dropped on a top-level item - make it a child
          newParentId = overItem.id;
          newType = overItem.type;
          
          // Find the highest sort order among children
          const siblings = items.filter(item => item.parent_id === overItem.id);
          newSortOrder = Math.max(...siblings.map(item => item.sort_order || 0), -1) + 1;
        } else {
          // Dropped on a child item - make it a sibling
          newParentId = overItem.parent_id;
          newType = overItem.type;
          
          const siblings = items.filter(item => item.parent_id === overItem.parent_id);
          const overIndex = siblings.findIndex(item => item.id === overItem.id);
          newSortOrder = (overItem.sort_order || 0) + 1;
          
          // Update sort orders for items that come after
          const updates: Array<{ id: string; parent_id: string | null; sort_order: number; type?: string }> = [];
          
          siblings.forEach((sibling, index) => {
            if (index > overIndex && sibling.id !== activeItem.id) {
              updates.push({
                id: sibling.id,
                parent_id: sibling.parent_id,
                sort_order: (sibling.sort_order || 0) + 1,
                type: sibling.type,
              });
            }
          });
          
          // Add the moved item
          updates.push({
            id: activeItem.id,
            parent_id: newParentId,
            sort_order: newSortOrder,
            type: newType,
          });
          
          await onReorder(updates);
          return;
        }
      }

      // Simple case - just update the moved item
      await onReorder([{
        id: activeItem.id,
        parent_id: newParentId,
        sort_order: newSortOrder,
        type: newType,
      }]);
    } catch (error) {
      console.error('Error reordering items:', error);
    }
  };

  const getItemsForColumn = (columnType?: string) => {
    return items.filter(item => item.type === columnType);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToWindowEdges]}
    >
      <div className={cn(
        'grid gap-6',
        columns.length === 1 ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2',
        className
      )}>
        {columns.map(column => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            items={getItemsForColumn(column.type)}
            onEdit={onEdit}
            onDelete={onDelete}
            onCreate={onCreate}
            renderItemContent={renderItemContent}
            columnType={column.type}
          />
        ))}
      </div>

      <DragOverlay>
        {activeId && draggedItem ? (
          <div className="bg-white rounded-lg border border-gray-300 shadow-lg p-3 rotate-2">
            <div className="flex items-center space-x-2">
              <GripVertical className="w-4 h-4 text-gray-400" />
              {renderItemContent ? renderItemContent(draggedItem) : (
                <span className="font-medium text-gray-900">{draggedItem.title}</span>
              )}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}