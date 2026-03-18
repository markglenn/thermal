import { Type } from 'lucide-react';
import type { ComponentDefinition } from '../definition';
import type { TextProperties } from '@/lib/types';
import { TextElement } from './element';
import { TextProperties as TextPropertiesPanel } from './properties';
import { generateTextZpl } from './zpl';
// Text uses DOM measurement — Font 0 (CG Triumvirate) is proportional and
// can't be computed without per-character width tables for the printer font.

export const textComponent: ComponentDefinition<TextProperties> = {
  type: 'text',
  label: 'Text',
  icon: Type,
  traits: { autoSized: true, rotatable: true, bindable: true },
  defaultLayout: { x: 0, y: 0, width: 100, height: 30, horizontalAnchor: 'left', verticalAnchor: 'top' },
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
