'use client';

import { useState, useRef, useEffect } from 'react';
import type { LabelComponent } from '@/lib/types';
import { useEditorStore } from '@/lib/store/editor-store';
import { useDocument } from '@/hooks/use-editor-store';

const TYPE_ICONS: Record<string, string> = {
  text: 'T',
  barcode: '║',
  qrcode: '▣',
  rectangle: '□',
  line: '―',
  container: '⊞',
  image: '▨',
};

function defaultLabel(component: LabelComponent): string {
  if (component.typeData.type === 'text') {
    const content = component.typeData.props.content;
    return content.length > 20 ? content.slice(0, 20) + '...' : content;
  }
  return component.typeData.type.charAt(0).toUpperCase() + component.typeData.type.slice(1);
}

function LayerItem({ component, depth }: { component: LabelComponent; depth: number }) {
  const selectedId = useEditorStore((s) => s.selectedComponentId);
  const selectComponent = useEditorStore((s) => s.selectComponent);
  const removeComponent = useEditorStore((s) => s.removeComponent);
  const renameComponent = useEditorStore((s) => s.renameComponent);
  const isSelected = selectedId === component.id;
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(component.name);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Show custom name if it differs from the default type name
  const hasCustomName = component.name !== component.typeData.type.charAt(0).toUpperCase() + component.typeData.type.slice(1);
  const displayName = hasCustomName ? component.name : defaultLabel(component);

  return (
    <>
      <div
        className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded cursor-pointer select-none group ${
          isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
        }`}
        style={{ paddingLeft: 8 + depth * 12 }}
        onClick={() => selectComponent(component.id)}
        onDoubleClick={() => {
          setEditText(component.name);
          setEditing(true);
        }}
      >
        <span className="w-4 text-center text-gray-400 shrink-0">
          {TYPE_ICONS[component.typeData.type] || '?'}
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
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 shrink-0"
        >
          ×
        </button>
      </div>
      {component.children?.map((child) => (
        <LayerItem key={child.id} component={child} depth={depth + 1} />
      ))}
    </>
  );
}

export function LayerHierarchy() {
  const document = useDocument();

  return (
    <div className="flex flex-col">
      <div className="px-3 py-2 border-b border-gray-200">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Layers</h2>
      </div>
      <div className="p-1 flex flex-col gap-px overflow-y-auto">
        {document.components.length === 0 ? (
          <div className="px-3 py-3 text-xs text-gray-400 text-center">No components</div>
        ) : (
          document.components.map((comp) => (
            <LayerItem key={comp.id} component={comp} depth={0} />
          ))
        )}
      </div>
    </div>
  );
}
