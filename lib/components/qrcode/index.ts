import type { QrCodeProperties } from '@/lib/types';
import type { ComponentDefinition } from '../definition';
import { QrCodeElement } from './element';
import { QrCodeProperties as QrCodePropertiesPanel } from './properties';
import { qrcodeCommand } from './zpl';

export const qrcodeComponent: ComponentDefinition<QrCodeProperties> = {
  type: 'qrcode',
  label: 'QR Code',
  icon: '▣',
  traits: { autoSized: true, rotatable: false, isContainer: false },
  defaultConstraints: { left: 0, top: 0 },
  defaultProps: {
    content: 'https://example.com',
    magnification: 5,
    errorCorrection: 'Q',
  },
  Element: QrCodeElement,
  PropertiesPanel: QrCodePropertiesPanel,
  generateZpl: qrcodeCommand,
};
