import { QrCode } from 'lucide-react';
import type { QrCodeProperties } from '@/lib/types';
import type { ComponentDefinition } from '../definition';
import { QrCodeElement } from './element';
import { QrCodeProperties as QrCodePropertiesPanel } from './properties';
import { qrcodeCommand } from './zpl';
import { computeQrCodeSize } from './compute-size';

export const qrcodeComponent: ComponentDefinition<QrCodeProperties> = {
  type: 'qrcode',
  label: 'QR Code',
  icon: QrCode,
  traits: { autoSized: true, rotatable: false, bindable: true },
  defaultLayout: { x: 0, y: 0, width: 100, height: 100, horizontalAnchor: 'left', verticalAnchor: 'top' },
  defaultProps: {
    content: 'https://example.com',
    magnification: 5,
    errorCorrection: 'Q',
  },
  Element: QrCodeElement,
  PropertiesPanel: QrCodePropertiesPanel,
  generateZpl: qrcodeCommand,
  computeContentSize: computeQrCodeSize,
};
