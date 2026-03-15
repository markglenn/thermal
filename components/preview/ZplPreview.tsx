'use client';

import { useMemo } from 'react';
import { useDocument } from '@/hooks/use-editor-store';
import { generateZpl } from '@/lib/zpl/generator';

export function ZplPreview() {
  const document = useDocument();
  const zpl = useMemo(() => generateZpl(document), [document]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">ZPL Output</h3>
        <button
          onClick={() => navigator.clipboard.writeText(zpl)}
          className="text-xs text-blue-500 hover:text-blue-700"
        >
          Copy
        </button>
      </div>
      <pre className="flex-1 p-3 text-xs font-mono overflow-auto bg-gray-50 whitespace-pre-wrap break-all">
        {zpl}
      </pre>
    </div>
  );
}
