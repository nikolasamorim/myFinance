import React, { useState, useMemo } from 'react';
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
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from '@dnd-kit/modifiers';
import { ChevronDown, ChevronRight, Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { HierarchyItem } from './HierarchyItem';

interface HierarchyNode {
  id: string;
  title: string;
  parent_id?: string | null;
  sort_order?: number;
  children?: HierarchyNode[];
  [key: string]: any;
}

interface HierarchyViewProps {
  items: any[];
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
  onCreate: (parentId?: string) => void;
  onReorder: (updates: Array<{ id: string; parent_id: string | null; sort_order: number }>) => Promise<void>;
  renderItemContent?: (item: any) => React.ReactNode;
  className?: string;
}

export function HierarchyView({
  items,
  onEdit,
  onDelete,
  onCreate,
  onReorder,
  renderItemContent,
  className,
}: HierarchyViewProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<HierarchyNode | null>(null);

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

  // Build hierarchy tree
  const hierarchyTree = useMemo(() => {
    const itemMap = new Map<string, HierarchyNode>();
    const rootItems: HierarchyNode[] = [];

    // First pass: create map of all items
    items.forEach(item => {
      const node: HierarchyNode = {
        ...item,
        children: [],
      };
      itemMap.set(item.id, node);
    });

    // Second pass: organize hierarchy
    items.forEach(item => {
      const node = itemMap.get(item.id)!;
      if (item.parent_id && itemMap.has(item.parent_id)) {
        itemMap.get(item.parent_id)!.children!.push(node);
      } else {
        rootItems.push(node);
      }
    });

    // Sort children by sort_order
    const sortChildren = (nodes: HierarchyNode[]) => {
      nodes.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          sortChildren(node.children);
        }
      });
    };

    sortChildren(rootItems);
    return rootItems;
  }, [items]);

  // Flatten tree for drag and drop
  const flattenedItems = useMemo(() => {
    const flatten = (nodes: HierarchyNode[], level = 0): Array<HierarchyNode & { level: number }> => {
      const result: Array<HierarchyNode & { level: number }> = [];
      
      nodes.forEach(node => {
        result.push({ ...node, level });
        
        if (node.children && node.children.length > 0 && expandedItems.has(node.id)) {
          result.push(...flatten(node.children, level + 1));
        }
      });
      
      return result;
    };

    return flatten(hierarchyTree);
  }, [hierarchyTree, expandedItems]);

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const expandAll = () => {
    const allIds = new Set(items.map(item => item.id));
    setExpandedItems(allIds);
  };

  const collapseAll = () => {
    setExpandedItems(new Set());
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    const item = flattenedItems.find(item => item.id === active.id);
    setDraggedItem(item || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDraggedItem(null);

    if (!over || active.id === over.id) {
      return;
    }

    const activeIndex = flattenedItems.findIndex(item => item.id === active.id);
    const overIndex = flattenedItems.findIndex(item => item.id === over.id);

    if (activeIndex === -1 || overIndex === -1) {
      return;
    }

    const activeItem = flattenedItems[activeIndex];
    const overItem = flattenedItems[overIndex];

    // Calculate new position and parent
    let newParentId = overItem.parent_id;
    let newSortOrder = overItem.sort_order || 0;

    // If dropping on an expanded parent, make it a child
    if (overItem.children && overItem.children.length > 0 && expandedItems.has(overItem.id)) {
      newParentId = overItem.id;
      newSortOrder = 0;
    }

    // Generate updates for reordering
    const updates: Array<{ id: string; parent_id: string | null; sort_order: number }> = [];

    // Update the moved item
    updates.push({
      id: activeItem.id,
      parent_id: newParentId,
      sort_order: newSortOrder,
    });

    // Update sort orders for siblings
    const siblings = flattenedItems.filter(item => 
      item.parent_id === newParentId && item.id !== activeItem.id
    );

    siblings.forEach((sibling, index) => {
      const adjustedIndex = index >= newSortOrder ? index + 1 : index;
      updates.push({
        id: sibling.id,
        parent_id: sibling.parent_id,
        sort_order: adjustedIndex,
      });
    });

    try {
      await onReorder(updates);
    } catch (error) {
      console.error('Error reordering items:', error);
    }
  };

  const renderHierarchyNode = (node: HierarchyNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedItems.has(node.id);

    return (
      <div key={node.id}>
        <HierarchyItem
          id={node.id}
          level={level}
          hasChildren={hasChildren}
          isExpanded={isExpanded}
          onToggleExpanded={() => toggleExpanded(node.id)}
          onEdit={() => onEdit(node)}
          onDelete={() => onDelete(node.id)}
          onCreateChild={() => onCreate(node.id)}
        >
          {renderItemContent ? renderItemContent(node) : (
            <span className="font-medium text-gray-900">{node.title}</span>
          )}
        </HierarchyItem>

        {hasChildren && isExpanded && (
          <div className="ml-6">
            {node.children!.map(child => renderHierarchyNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={expandAll}
          >
            Expandir Tudo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={collapseAll}
          >
            Recolher Tudo
          </Button>
        </div>
        <Button
          size="sm"
          onClick={() => onCreate()}
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Item
        </Button>
      </div>

      {/* Hierarchy Tree */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext
          items={flattenedItems.map(item => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1">
            {hierarchyTree.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="w-12 h-12 bg-gray-200 rounded-lg mx-auto mb-3 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-gray-400" />
                </div>
                <p className="font-medium">Nenhum item encontrado</p>
                <p className="text-sm">Comece criando seu primeiro item</p>
              </div>
            ) : (
              hierarchyTree.map(node => renderHierarchyNode(node))
            )}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeId && draggedItem ? (
            <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
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
    </div>
  );
}