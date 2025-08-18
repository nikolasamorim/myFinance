import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronRight, Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import { cn } from '../../lib/utils';

interface HierarchyItemProps {
  id: string;
  level: number;
  hasChildren: boolean;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCreateChild: () => void;
  children: React.ReactNode;
}

export function HierarchyItem({
  id,
  level,
  hasChildren,
  isExpanded,
  onToggleExpanded,
  onEdit,
  onDelete,
  onCreateChild,
  children,
}: HierarchyItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-all',
        isDragging && 'opacity-50 shadow-lg z-50',
        level > 0 && 'ml-6'
      )}
    >
      <div className="flex items-center space-x-2">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          title="Arrastar para reordenar"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Expand/Collapse Button */}
        <button
          onClick={onToggleExpanded}
          className={cn(
            'p-1 rounded hover:bg-gray-100 transition-colors',
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
          {children}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onCreateChild}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Adicionar sub-item"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors"
            title="Editar"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Excluir"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}