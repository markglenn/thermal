'use client';

import { useState } from 'react';
import '@/lib/components'; // Register all component plugins
import { useTabStore } from '@/lib/store/tab-store';
import { EditorStoreProvider } from '@/lib/store/editor-context';
import { TabBar } from './TabBar';
import { ComponentPalette } from '../palette/ComponentPalette';
import { Canvas } from './Canvas';
import { PropertiesPanel } from '../properties/PropertiesPanel';
import { Toolbar } from '../toolbar/Toolbar';
import { ZplPreview } from '../preview/ZplPreview';
import { LabelaryPreview } from '../preview/LabelaryPreview';
import { LabelaryApiPreview } from '../preview/LabelaryApiPreview';
import { PanelResizeHandle } from './PanelResizeHandle';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { DragGhost } from './DragGhost';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, PanelBottomClose, PanelBottomOpen } from 'lucide-react';

export function Editor() {
  const activeTabId = useTabStore((s) => s.activeTabId);
  const activeStore = useTabStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return tab?.store ?? null;
  });

  if (!activeStore) return null;

  return (
    <EditorStoreProvider key={activeTabId} store={activeStore}>
      <EditorInner />
    </EditorStoreProvider>
  );
}

type PreviewTab = 'zpl' | 'preview' | 'labelary';

function EditorInner() {
  useKeyboardShortcuts();
  const [previewTab, setPreviewTab] = useState<PreviewTab>('preview');

  const [leftWidth, setLeftWidth] = useState(208);
  const [rightWidth, setRightWidth] = useState(256);
  const [bottomHeight, setBottomHeight] = useState(320);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [bottomCollapsed, setBottomCollapsed] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-white text-gray-900">
      <DragGhost />
      <Toolbar />
      <TabBar />
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel */}
        {leftCollapsed ? (
          <div className="shrink-0 border-r border-gray-200 bg-white flex flex-col">
            <div className="px-3 py-2 border-b border-gray-200">
              <button onClick={() => setLeftCollapsed(false)} className="text-gray-400 hover:text-gray-600" title="Show components panel">
                <PanelLeftOpen size={14} />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ width: leftWidth }} className="shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
              <ComponentPalette onCollapse={() => setLeftCollapsed(true)} />
            </div>
            <PanelResizeHandle direction="horizontal" size={leftWidth} onSizeChange={setLeftWidth} min={160} max={400} onDoubleClick={() => setLeftCollapsed(true)} />
          </>
        )}

        {/* Center */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex-1 flex overflow-hidden">
            <Canvas />
          </div>

          {/* Bottom preview panel */}
          {bottomCollapsed ? (
            <div className="shrink-0 border-t border-gray-200 flex items-center justify-end px-2 py-1">
              <button onClick={() => setBottomCollapsed(false)} className="text-gray-400 hover:text-gray-600" title="Show preview panel">
                <PanelBottomOpen size={14} />
              </button>
            </div>
          ) : (
            <>
              <PanelResizeHandle direction="vertical" size={bottomHeight} onSizeChange={setBottomHeight} min={100} max={600} invert onDoubleClick={() => setBottomCollapsed(true)} />
              <div style={{ height: bottomHeight }} className="shrink-0 border-t border-gray-200 flex flex-col">
                <div className="flex border-b border-gray-200 items-center">
                  {(['zpl', 'preview', 'labelary'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setPreviewTab(tab)}
                      className={`px-4 py-1.5 text-xs font-medium ${
                        previewTab === tab
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {{ zpl: 'ZPL', preview: 'Preview', labelary: 'Labelary Preview' }[tab]}
                    </button>
                  ))}
                  <div className="ml-auto pr-2">
                    <button onClick={() => setBottomCollapsed(true)} className="text-gray-400 hover:text-gray-600" title="Collapse panel">
                      <PanelBottomClose size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  {previewTab === 'zpl' && <ZplPreview />}
                  {previewTab === 'preview' && <LabelaryPreview />}
                  {previewTab === 'labelary' && <LabelaryApiPreview />}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right panel */}
        {rightCollapsed ? (
          <div className="shrink-0 border-l border-gray-200 bg-white flex flex-col">
            <div className="px-3 py-1.5 border-b border-gray-200">
              <button onClick={() => setRightCollapsed(false)} className="text-gray-400 hover:text-gray-600" title="Show properties panel">
                <PanelRightOpen size={14} />
              </button>
            </div>
          </div>
        ) : (
          <>
            <PanelResizeHandle direction="horizontal" size={rightWidth} onSizeChange={setRightWidth} min={200} max={450} invert onDoubleClick={() => setRightCollapsed(true)} />
            <div style={{ width: rightWidth }} className="shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-y-auto">
              <PropertiesPanel onCollapse={() => setRightCollapsed(true)} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
