'use client';

import { Nfc } from 'lucide-react';
import { useEditorStoreContext, usePauseTracking, useResumeTracking } from '@/lib/store/editor-context';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { AutosuggestInput } from '../ui/AutosuggestInput';
import { NumberInput } from '../properties/NumberInput';
import type {
  RfidWriteMode,
  RfidDataFormat,
  RfidMemoryBank,
  RfidErrorHandling,
  RfidConfig,
} from '@/lib/types';

export function RfidSettings({ readOnly = false, suggestions = [] }: { readOnly?: boolean; suggestions?: string[] }) {
  const rfid = useEditorStoreContext((s) => s.document.label.rfid);
  const updateRfidConfig = useEditorStoreContext((s) => s.updateRfidConfig);
  const pauseTracking = usePauseTracking();
  const resumeTracking = useResumeTracking();

  const enabled = rfid?.enabled ?? false;

  const update = (changes: Partial<RfidConfig>) => updateRfidConfig(changes);

  return (
    <CollapsibleSection title="RFID" icon={<Nfc size={12} />} defaultOpen={enabled}>
      <div className="px-3 pb-3 space-y-2">
        <label className={`flex items-center gap-2 ${readOnly ? 'pointer-events-none opacity-60' : ''}`}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => update({ enabled: e.target.checked })}
          />
          <span className="text-xs text-gray-600">Write RFID tag</span>
        </label>

        {enabled && rfid && (
          <div className={`space-y-2 ${readOnly ? 'pointer-events-none opacity-60' : ''}`}>
            <label>
              <span className="text-xs text-gray-500">Write Mode</span>
              <select
                value={rfid.writeMode}
                onChange={(e) => update({ writeMode: e.target.value as RfidWriteMode })}
                className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="epc">EPC (Tag ID)</option>
                <option value="raw">Raw Memory</option>
              </select>
            </label>

            <label>
              <span className="text-xs text-gray-500">Data</span>
              <input
                value={rfid.data}
                onChange={(e) => update({ data: e.target.value })}
                onFocus={pauseTracking}
                onBlur={resumeTracking}
                placeholder={rfid.writeMode === 'epc' ? 'Hex EPC data' : 'Data to write'}
                className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm font-mono"
              />
            </label>

            <label>
              <span className="text-xs text-gray-500">Source Variable</span>
              <AutosuggestInput
                value={rfid.fieldBinding ?? ''}
                onChange={(value) => {
                  const v = value.replace(/[^a-zA-Z0-9_-]/g, '').replace(/^[^a-zA-Z]+/, '');
                  update({ fieldBinding: v || undefined });
                }}
                suggestions={suggestions}
                onFocus={pauseTracking}
                onBlur={resumeTracking}
                placeholder="None"
                className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm font-mono"
              />
              <p className="text-[9px] text-gray-400 mt-0.5">Override data with a variable at print time</p>
            </label>

            {rfid.writeMode === 'raw' && (
              <>
                <label>
                  <span className="text-xs text-gray-500">Data Format</span>
                  <select
                    value={rfid.dataFormat}
                    onChange={(e) => update({ dataFormat: e.target.value as RfidDataFormat })}
                    className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="hex">Hex</option>
                    <option value="ascii">ASCII</option>
                  </select>
                </label>

                <label>
                  <span className="text-xs text-gray-500">Memory Bank</span>
                  <select
                    value={rfid.memoryBank}
                    onChange={(e) => update({ memoryBank: e.target.value as RfidMemoryBank })}
                    className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="epc">EPC (Bank 1)</option>
                    <option value="user">User (Bank 3)</option>
                  </select>
                </label>

                <label>
                  <span className="text-xs text-gray-500">Start Block</span>
                  <NumberInput value={rfid.startBlock} onChange={(v) => update({ startBlock: v })} min={0} max={255} fallback={0} />
                </label>
              </>
            )}

            <label>
              <span className="text-xs text-gray-500">Retries</span>
              <NumberInput value={rfid.retries} onChange={(v) => update({ retries: v })} min={0} max={10} fallback={3} />
            </label>

            <label>
              <span className="text-xs text-gray-500">On Error</span>
              <select
                value={rfid.errorHandling}
                onChange={(e) => update({ errorHandling: e.target.value as RfidErrorHandling })}
                className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="none">No action</option>
                <option value="overstrike">Overstrike (void label)</option>
                <option value="eject">Eject</option>
              </select>
            </label>
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}
