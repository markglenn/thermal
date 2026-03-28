'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { LabelComponent } from '@/lib/types';
import { useEditorStoreContext, useEditorStoreApi } from '@/lib/store/editor-context';
import { useDocument } from '@/lib/store/editor-context';
import { getDefinition } from '@/lib/components';
import { showComponentContextMenu } from '../shared/component-context-menu';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function defaultLabel(component: LabelComponent): string {
  return component.typeData.type.charAt(0).toUpperCase() + component.typeData.type.slice(1);
}

function SortableLayerItem({ component, depth }: { component: LabelComponent; depth: number }) {
  const isSelected = useEditorStoreContext((s) => s.selectedComponentIds.includes(component.id));
  const selectComponent = useEditorStoreContext((s) => s.selectComponent);
  const removeComponent = useEditorStoreContext((s) => s.removeComponent);
  const renameComponent = useEditorStoreContext((s) => s.renameComponent);
  const storeApi = useEditorStoreApi();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(component.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const itemRef = useRef<HTMLDivElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: component.id });

  const setNodeRef = useCallback((node: HTMLDivElement | null) => {
    setSortableRef(node);
    (itemRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
  }, [setSortableRef]);

  useEffect(() => {
    if (isSelected && itemRef.current) {
      itemRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [isSelected]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commitRename = () => {
    const trimmed = editText.trim();
    if (trimmed) {
      renameComponent(component.id, trimmed);
    }
    setEditing(false);
  };

  const hasCustomName =
    component.name !==
    component.typeData.type.charAt(0).toUpperCase() + component.typeData.type.slice(1);
  const displayName = hasCustomName ? component.name : defaultLabel(component);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    showComponentContextMenu(e, component, storeApi, () => {
      setEditText(displayName);
      setEditing(true);
    });
  }, [component, displayName, storeApi]);

  return (
    <>
      <div
        ref={setNodeRef}
        style={{ ...style, paddingLeft: 8 + depth * 12 }}
        data-testid={`layer-item-${component.id}`}
        data-component-type={component.typeData.type}
        className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded cursor-pointer select-none group ${
          isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
        }`}
        onClick={(e) => selectComponent(component.id, { toggle: e.shiftKey || e.metaKey || e.ctrlKey })}
        onContextMenu={handleContextMenu}
        onDoubleClick={() => {
          setEditText(displayName);
          setEditing(true);
        }}
        {...attributes}
        {...listeners}
      >
        <span className="w-4 text-center text-gray-400 shrink-0 flex items-center justify-center">
          {(() => { const Icon = getDefinition(component.typeData.type).icon; return <Icon size={12} />; })()}
        </span>
        {editing ? (
          <input
            ref={inputRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') setEditing(false);
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 px-1 py-0 text-xs border border-blue-400 rounded outline-none bg-white"
          />
        ) : (
          <span className="flex-1 truncate">{displayName}</span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeComponent(component.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 shrink-0"
        >
          ×
        </button>
      </div>
    </>
  );
}

export function LayerHierarchy() {
  const document = useDocument();
  const reorderComponents = useEditorStoreContext((s) => s.reorderComponents);
  const storeApi = useEditorStoreApi();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const components = storeApi.getState().document.components;
      const fromIndex = components.findIndex((c) => c.id === active.id);
      const toIndex = components.findIndex((c) => c.id === over.id);

      if (fromIndex !== -1 && toIndex !== -1) {
        reorderComponents(fromIndex, toIndex);
      }
    },
    [reorderComponents, storeApi]
  );

  const ids = document.components.map((c) => c.id);

  return (
    <div className="flex flex-col" data-testid="layer-hierarchy">
      <div className="px-3 py-2 border-b border-gray-200">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Layers</h2>
      </div>
      <div className="p-1 flex flex-col gap-px overflow-y-auto">
        {document.components.length === 0 ? (
          <div className="px-3 py-3 text-xs text-gray-400 text-center" data-testid="layers-empty">No components</div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis, restrictToParentElement]}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              {document.components.map((comp) => (
                <SortableLayerItem key={comp.id} component={comp} depth={0} />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
