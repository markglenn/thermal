'use client';

import { useCallback, useRef } from 'react';
import { X, Plus, Circle, FileText } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToHorizontalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTabStore, type TabInfo } from '@/lib/store/tab-store';

export function TabBar() {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const createTab = useTabStore((s) => s.createTab);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const state = useTabStore.getState();
    const fromIndex = state.tabs.findIndex((t) => t.id === active.id);
    const toIndex = state.tabs.findIndex((t) => t.id === over.id);

    if (fromIndex !== -1 && toIndex !== -1) {
      state.reorderTabs(fromIndex, toIndex);
    }
  }, []);

  const handleClose = useCallback((e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    const state = useTabStore.getState();
    const tab = state.tabs.find((t) => t.id === tabId);
    if (tab?.dirty) {
      if (!confirm(`"${tab.name}" has unsaved changes. Close anyway?`)) return;
    }
    state.closeTab(tabId);
  }, []);

  const tabIds = tabs.map((t) => t.id);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!scrollRef.current) return;
    // Convert vertical scroll to horizontal
    if (e.deltaY !== 0) {
      e.preventDefault();
      scrollRef.current.scrollLeft += e.deltaY;
    }
  }, []);

  return (
    <div className="h-8 bg-gray-50 border-b border-gray-200 flex items-stretch text-xs" data-testid="tab-bar">
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        className="flex items-stretch min-w-0 overflow-x-auto overflow-y-hidden scrollbar-none"
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToHorizontalAxis, restrictToParentElement]}
        >
          <SortableContext items={tabIds} strategy={horizontalListSortingStrategy}>
            {tabs.map((tab) => (
              <SortableTab
                key={tab.id}
                tab={tab}
                isActive={tab.id === activeTabId}
                onClose={handleClose}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
      <button
        onClick={createTab}
        data-testid="new-tab-button"
        className="px-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 shrink-0"
        title="New label"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

function SortableTab({
  tab,
  isActive,
  onClose,
}: {
  tab: TabInfo;
  isActive: boolean;
  onClose: (e: React.MouseEvent, tabId: string) => void;
}) {
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tab.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => setActiveTab(tab.id)}
      data-testid={`editor-tab-${tab.id}`}
      className={`flex items-center gap-1.5 px-3 border-r border-gray-200 cursor-pointer shrink-0 max-w-64 ${
        isActive
          ? 'bg-white text-gray-900 border-b-2 border-b-blue-500'
          : 'text-gray-500 hover:bg-gray-100'
      }`}
    >
      <FileText size={12} className="shrink-0 text-gray-400" />
      <span className="truncate">
        {tab.name}
        {tab.latestVersion !== null && (
          <span className={`ml-1 ${tab.viewingVersion !== null ? 'text-amber-600' : 'text-gray-400'}`}>
            v{tab.viewingVersion ?? tab.latestVersion}
          </span>
        )}
        {((tab.viewingVersion === null && tab.latestStatus === 'published') ||
          (tab.viewingVersion !== null && tab.viewingVersionStatus === 'published')) && (
          <span className="ml-1 inline-block px-1 py-0.5 rounded text-[9px] font-medium bg-green-100 text-green-700 align-middle leading-none">
            Published
          </span>
        )}
      </span>
      <button
        onClick={(e) => onClose(e, tab.id)}
        className="ml-auto text-gray-400 hover:text-gray-700 shrink-0 w-3 h-3 flex items-center justify-center group/close"
        title="Close tab"
      >
        {tab.dirty ? (
          <>
            <Circle size={8} className="text-blue-500 fill-blue-500 group-hover/close:hidden" />
            <X size={12} className="hidden group-hover/close:block" />
          </>
        ) : (
          <X size={12} />
        )}
      </button>
    </div>
  );
}
