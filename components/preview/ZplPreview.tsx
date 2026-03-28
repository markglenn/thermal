'use client';

import { useMemo, useEffect, useRef } from 'react';
import { useDocument, useEditorStoreContext } from '@/lib/store/editor-context';
import { generateZplWithMap } from '@/lib/zpl/generator';

export function ZplPreview() {
  const document = useDocument();
  const selectedIds = useEditorStoreContext((s) => s.selectedComponentIds);
  const { zpl, componentLineMap } = useMemo(() => generateZplWithMap(document), [document]);
  const lines = useMemo(() => zpl.split('\n'), [zpl]);

  const highlightedLines = useMemo(() => {
    const set = new Set<number>();
    for (const id of selectedIds) {
      const range = componentLineMap.get(id);
      if (range) {
        for (let i = range.start; i <= range.end; i++) set.add(i);
      }
    }
    return set;
  }, [selectedIds, componentLineMap]);

  const firstHighlightRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (firstHighlightRef.current) {
      firstHighlightRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedLines]);

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
      <pre data-testid="zpl-output" className="flex-1 p-3 text-xs font-mono overflow-auto bg-gray-50 whitespace-pre-wrap break-all">
        {lines.map((line, i) => {
          const isHighlighted = highlightedLines.has(i);
          const isFirstHighlight = isHighlighted && !highlightedLines.has(i - 1);
          return (
            <span
              key={i}
              ref={isFirstHighlight ? firstHighlightRef : undefined}
              className={isHighlighted ? 'bg-blue-100 text-blue-800' : undefined}
            >
              {line}
              {'\n'}
            </span>
          );
        })}
      </pre>
    </div>
  );
}
