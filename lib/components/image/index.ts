import type { ImageProperties } from '@/lib/types';
import type { ComponentDefinition } from '../definition';
import { ImageElement } from './element';
import { imageZpl } from './zpl';

export const imageComponent: ComponentDefinition<ImageProperties> = {
  type: 'image',
  label: 'Image',
  icon: '\u25A8',
  traits: {
    autoSized: false,
    rotatable: false,
    isContainer: false,
  },
  defaultConstraints: { left: 0, top: 0, width: 200, height: 200 },
  defaultProps: {
    data: '',
    originalWidth: 200,
    originalHeight: 200,
  },
  Element: ImageElement,
  PropertiesPanel: null,
  generateZpl: imageZpl,
};
