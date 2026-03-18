import { Image } from 'lucide-react';
import type { ImageProperties } from '@/lib/types';
import type { ComponentDefinition } from '../definition';
import { ImageElement } from './element';
import { ImagePropertiesPanel } from './properties';
import { imageZpl } from './zpl';
import { constrainImageSize } from './constrain-size';

export const imageComponent: ComponentDefinition<ImageProperties> = {
  type: 'image',
  label: 'Image',
  icon: Image,
  traits: {
    autoSized: false,
    rotatable: false,
    bindable: false,
  },
  defaultLayout: { x: 0, y: 0, width: 100, height: 100, horizontalAnchor: 'left', verticalAnchor: 'top' },
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
  constrainSize: constrainImageSize,
};
