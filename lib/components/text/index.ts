import { Type } from 'lucide-react';
import type { ComponentDefinition } from '../definition';
import type { TextProperties } from '@/lib/types';
import { TextElement } from './element';
import { TextProperties as TextPropertiesPanel } from './properties';
import { generateTextZpl } from './zpl';

export const textComponent: ComponentDefinition<TextProperties> = {
  type: 'text',
  label: 'Text',
  icon: Type,
  traits: { autoSized: true, rotatable: true, isContainer: false, bindable: true },
  defaultConstraints: { left: 0, top: 0 },
  defaultProps: {
    content: 'Label Text',
    font: '0',
    fontSize: 30,
    fontWidth: 30,
    rotation: 0,
  },
  Element: TextElement,
  PropertiesPanel: TextPropertiesPanel,
  generateZpl: generateTextZpl,
  getSizingMode: (component) => {
    if (component.typeData.type === 'text' && component.typeData.props.fieldBlock) {
      return 'width-only';
    }
    return 'auto';
  },
};
