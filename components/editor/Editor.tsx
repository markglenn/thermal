'use client';

import { useState } from 'react';
import '@/lib/components'; // Register all component plugins
import { ComponentPalette } from '../palette/ComponentPalette';
import { Canvas } from './Canvas';
import { PropertiesPanel } from '../properties/PropertiesPanel';
import { Toolbar } from '../toolbar/Toolbar';
import { ZplPreview } from '../preview/ZplPreview';
import { LabelaryPreview } from '../preview/LabelaryPreview';
import { LabelaryApiPreview } from '../preview/LabelaryApiPreview';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { DragGhost } from './DragGhost';

type PreviewTab = 'zpl' | 'preview' | 'labelary';

export function Editor() {
  useKeyboardShortcuts();
  const [previewTab, setPreviewTab] = useState<PreviewTab>('preview');

  return (
    <div className="h-screen flex flex-col bg-white text-gray-900">
      <DragGhost />
      <Toolbar />
      <div className="flex-1 flex overflow-hidden">
        <ComponentPalette />
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex overflow-hidden">
            <Canvas />
          </div>
          {/* Bottom preview panel */}
          <div className="h-80 border-t border-gray-200 flex flex-col">
            <div className="flex border-b border-gray-200">
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
            </div>
            <div className="flex-1 overflow-hidden">
              {previewTab === 'zpl' && <ZplPreview />}
              {previewTab === 'preview' && <LabelaryPreview />}
              {previewTab === 'labelary' && <LabelaryApiPreview />}
            </div>
          </div>
        </div>
        <PropertiesPanel />
      </div>
    </div>
  );
}
