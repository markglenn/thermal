'use client';

import { useState } from 'react';
import { ComponentPalette } from '../palette/ComponentPalette';
import { Canvas } from './Canvas';
import { PropertiesPanel } from '../properties/PropertiesPanel';
import { Toolbar } from '../toolbar/Toolbar';
import { ZplPreview } from '../preview/ZplPreview';
import { LabelaryPreview } from '../preview/LabelaryPreview';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';

type PreviewTab = 'zpl' | 'labelary';

export function Editor() {
  useKeyboardShortcuts();
  const [previewTab, setPreviewTab] = useState<PreviewTab>('zpl');

  return (
    <div className="h-screen flex flex-col bg-white text-gray-900">
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
              <button
                onClick={() => setPreviewTab('zpl')}
                className={`px-4 py-1.5 text-xs font-medium ${
                  previewTab === 'zpl'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                ZPL
              </button>
              <button
                onClick={() => setPreviewTab('labelary')}
                className={`px-4 py-1.5 text-xs font-medium ${
                  previewTab === 'labelary'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Preview
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {previewTab === 'zpl' ? <ZplPreview /> : <LabelaryPreview />}
            </div>
          </div>
        </div>
        <PropertiesPanel />
      </div>
    </div>
  );
}
