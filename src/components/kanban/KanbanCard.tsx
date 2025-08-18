import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronRight, Plus, Edit, Trash2, GripVertical } from 'lucide-react';
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

interface KanbanCardProps {
  item: KanbanItem;
  allItems: KanbanItem[];
  onEdit: (item: KanbanItem) => void;
  onDelete: (id: string) => void;
  onCreate: (parentId?: string, type?: string) => void;
  renderContent?: (item: KanbanItem) => React.ReactNode;
  level?: number;
  columnType?: string;
}

export function KanbanCard({
  item,
  allItems,
  onEdit,
  onDelete,
  onCreate,
  renderContent,
  level = 0,
  columnType,
}: KanbanCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: item.id,
    data: {
      type: 'item',
      item,
      columnType,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Find children of this item
  const children = allItems.filter(child => child.parent_id === item.id);
  const hasChildren = children.length > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-white rounded-lg border border-gray-200 shadow-sm transition-all',
        isDragging && 'opacity-50 shadow-lg z-50 rotate-2',
        level > 0 && 'ml-4 border-l-4 border-blue-200'
      )}
    >
      {/* Main Card */}
      <div className="p-3 group">
        <div className="flex items-start space-x-2">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
            title="Arrastar para reordenar"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          {/* Expand/Collapse Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              'p-1 rounded hover:bg-gray-100 transition-colors mt-0.5',
              hasChildren ? 'text-gray-600' : 'text-transparent cursor-default'
            )}
            disabled={!hasChildren}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )
            ) : (
              <div className="w-4 h-4" />
            )}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {renderContent ? renderContent(item) : (
              <div>
                <h4 className="font-medium text-gray-900 truncate">{item.title}</h4>
                {item.description && (
                  <p className="text-sm text-gray-500 mt-1 truncate">{item.description}</p>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onCreate(item.id, columnType)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Adicionar sub-item"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onEdit(item)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors"
              title="Editar"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Excluir"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {children
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
            .map(child => (
              <KanbanCard
                key={child.id}
                item={child}
                allItems={allItems}
                onEdit={onEdit}
                onDelete={onDelete}
                onCreate={onCreate}
                renderContent={renderContent}
                level={level + 1}
                columnType={columnType}
              />
            ))}
        </div>
      )}
    </div>
  );
}