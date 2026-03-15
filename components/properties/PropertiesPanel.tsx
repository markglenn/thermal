'use client';

import { useEditorStore } from '@/lib/store/editor-store';
import { useSelectedComponent } from '@/hooks/use-editor-store';
import { LabelSettings } from '../toolbar/LabelSettings';
import { ConstraintEditor } from './ConstraintEditor';
import { TextProperties } from './TextProperties';
import { BarcodeProperties } from './BarcodeProperties';
import { QrCodeProperties } from './QrCodeProperties';
import { BoxProperties } from './BoxProperties';

export function PropertiesPanel() {
  const selected = useSelectedComponent();

  return (
    <div className="w-64 border-l border-gray-200 bg-white flex flex-col overflow-y-auto">
      <LabelSettings />

      {selected ? (
        <>
          <div className="px-3 py-2 border-b border-gray-200">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {selected.typeData.type}
            </h3>
          </div>

          <ConstraintEditor component={selected} />

          {selected.typeData.type === 'text' && (
            <TextProperties componentId={selected.id} props={selected.typeData.props} />
          )}
          {selected.typeData.type === 'barcode' && (
            <BarcodeProperties componentId={selected.id} props={selected.typeData.props} />
          )}
          {selected.typeData.type === 'qrcode' && (
            <QrCodeProperties componentId={selected.id} props={selected.typeData.props} />
          )}
          {(selected.typeData.type === 'rectangle' || selected.typeData.type === 'line') && (
            <BoxProperties componentId={selected.id} component={selected} />
          )}
        </>
      ) : (
        <div className="p-3 text-sm text-gray-400 text-center mt-8">
          Select a component to edit its properties
        </div>
      )}
    </div>
  );
}
