import { Image } from 'lucide-react';
import type { ImageProperties } from '@/lib/types';
import type { ComponentDefinition } from '../definition';
import { ImageElement } from './element';
import { ImagePropertiesPanel } from './properties';
import { imageZpl } from './zpl';

export const imageComponent: ComponentDefinition<ImageProperties> = {
  type: 'image',
  label: 'Image',
  icon: Image,
  traits: {
    autoSized: false,
    rotatable: false,
    isContainer: false,
    bindable: false,
  },
  defaultConstraints: { left: 0, top: 0, width: 100, height: 100 },
  defaultProps: {
    data: '',
    originalWidth: 100,
    originalHeight: 100,
    threshold: 128,
    invert: false,
    monochromeMethod: 'threshold',
    monochromePreview: '',
    monochromePreviewFull: '',
    zplHex: '',
    zplBytesPerRow: 0,
    zplWidth: 0,
    zplHeight: 0,
  },
  Element: ImageElement,
  PropertiesPanel: ImagePropertiesPanel,
  generateZpl: imageZpl,
};
