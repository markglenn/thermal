import { Type } from 'lucide-react';
import type { ComponentDefinition } from '../definition';
import type { TextProperties } from '@/lib/types';
import { TextElement } from './element';
import { TextProperties as TextPropertiesPanel } from './properties';
import { generateTextZpl } from './zpl';

/** Compute the pixel height of one line for a text component with a field block. */
function lineHeightPx(props: TextProperties): number {
  return props.fontSize + (props.fieldBlock?.lineSpacing ?? 0);
}

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
  // No computeContentSize — text uses DOM measurement for accurate
  // proportional font sizing. The CSS rendering (scaleX, letter-spacing,
  // font family) matches ZPL output closely, so DOM measurement is the
  // source of truth for both auto and width-only sizing.
  getSizingMode: (component) => {
    if (component.typeData.type === 'text' && component.typeData.props.fieldBlock) {
      return 'width-only';
    }
    return 'auto';
  },
  constrainSize: (props, _currentLayout, change) => {
    // Only snap height for field block text — snaps to line increments
    if (!props.fieldBlock || change.height === undefined) return change;
    const lh = lineHeightPx(props);
    const snappedLines = Math.max(1, Math.round(change.height / lh));
    return { ...change, height: snappedLines * lh };
  },
};
