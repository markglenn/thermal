import { Grid3X3 } from 'lucide-react';
import type { DataMatrixProperties } from '@/lib/types';
import type { ComponentDefinition } from '../definition';
import { DataMatrixElement } from './element';
import { DataMatrixPropertiesPanel } from './properties';
import { datamatrixZpl } from './zpl';

export const datamatrixComponent: ComponentDefinition<DataMatrixProperties> = {
  type: 'datamatrix',
  label: 'Data Matrix',
  icon: Grid3X3,
  traits: { autoSized: true, rotatable: false, bindable: true },
  defaultLayout: { x: 0, y: 0, width: 0, height: 0, horizontalAnchor: 'left', verticalAnchor: 'top' },
  defaultProps: {
    content: '1234567890',
    moduleSize: 5,
  },
  Element: DataMatrixElement,
  PropertiesPanel: DataMatrixPropertiesPanel,
  generateZpl: datamatrixZpl,
};
