'use client';

import { X, Plus, Circle, FileText } from 'lucide-react';
import { useTabStore, type TabInfo } from '@/lib/store/tab-store';

export function TabBar() {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const createTab = useTabStore((s) => s.createTab);
  const closeTab = useTabStore((s) => s.closeTab);

  const handleClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    const tab = tabs.find((t) => t.id === tabId);
    if (tab?.dirty) {
      if (!confirm(`"${tab.name}" has unsaved changes. Close anyway?`)) return;
    }
    closeTab(tabId);
  };

  return (
    <div className="h-8 bg-gray-50 border-b border-gray-200 flex items-stretch text-xs overflow-x-auto" data-testid="tab-bar">
      {tabs.map((tab) => (
        <Tab
          key={tab.id}
          tab={tab}
          isActive={tab.id === activeTabId}
          onClick={() => setActiveTab(tab.id)}
          onClose={(e) => handleClose(e, tab.id)}
        />
      ))}
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

function Tab({
  tab,
  isActive,
  onClick,
  onClose,
}: {
  tab: TabInfo;
  isActive: boolean;
  onClick: () => void;
  onClose: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onClick={onClick}
      data-testid={`editor-tab-${tab.id}`}
      className={`flex items-center gap-1.5 px-3 border-r border-gray-200 cursor-pointer shrink-0 max-w-45 ${
        isActive
          ? 'bg-white text-gray-900 border-b-2 border-b-blue-500'
          : 'text-gray-500 hover:bg-gray-100'
      }`}
    >
      <FileText size={12} className="shrink-0 text-gray-400" />
      <span className="truncate">{tab.name}</span>
      <button
        onClick={onClose}
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
