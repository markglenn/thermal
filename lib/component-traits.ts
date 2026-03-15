import type { ComponentType, LabelComponent } from './types';

export interface ComponentTraits {
  /** Content determines the size — no user-set width/height */
  autoSized: boolean;
  /** Supports rotation via ^A/^BC orientation parameter */
  rotatable: boolean;
  /** Has children that render inside it */
  isContainer: boolean;
}

const TRAITS: Record<ComponentType, ComponentTraits> = {
  text: { autoSized: true, rotatable: true, isContainer: false },
  barcode: { autoSized: true, rotatable: true, isContainer: false },
  qrcode: { autoSized: true, rotatable: false, isContainer: false },
  image: { autoSized: false, rotatable: false, isContainer: false },
  line: { autoSized: false, rotatable: false, isContainer: false },
  rectangle: { autoSized: false, rotatable: false, isContainer: false },
  container: { autoSized: false, rotatable: false, isContainer: true },
};

export function getTraits(type: ComponentType): ComponentTraits {
  return TRAITS[type];
}

/** Check if a component is auto-sized, accounting for field block override */
export function isAutoSized(component: LabelComponent): boolean {
  const traits = TRAITS[component.typeData.type];
  if (!traits.autoSized) return false;
  // Text with field block has a constraint-driven width
  if (component.typeData.type === 'text' && component.typeData.props.fieldBlock) return false;
  return true;
}

/** Check if a text component has field block enabled */
export function hasFieldBlock(component: LabelComponent): boolean {
  return component.typeData.type === 'text' && !!component.typeData.props.fieldBlock;
}
