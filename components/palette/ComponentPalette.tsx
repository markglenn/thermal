'use client';

import { PaletteItem } from './PaletteItem';

const paletteItems = [
  { type: 'text' as const, label: 'Text', icon: 'T' },
  { type: 'barcode' as const, label: 'Barcode', icon: '║' },
  { type: 'qrcode' as const, label: 'QR Code', icon: '▣' },
  { type: 'rectangle' as const, label: 'Rectangle', icon: '□' },
  { type: 'line' as const, label: 'Line', icon: '―' },
  { type: 'container' as const, label: 'Container', icon: '⊞' },
  { type: 'image' as const, label: 'Image', icon: '▨' },
];

export function ComponentPalette() {
  return (
    <div className="w-52 border-r border-gray-200 bg-white flex flex-col">
      <div className="px-3 py-2 border-b border-gray-200">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Components</h2>
      </div>
      <div className="p-1 flex flex-col gap-0.5">
        {paletteItems.map((item) => (
          <PaletteItem key={item.type} {...item} />
        ))}
      </div>
    </div>
  );
}
