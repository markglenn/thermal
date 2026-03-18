import type { Constraints, LabelComponent, ResolvedBounds } from '../types';

export type SizingMode = 'auto' | 'fixed' | 'width-only';

export interface ComponentTraits {
  autoSized: boolean;
  rotatable: boolean;
  isContainer: boolean;
  bindable: boolean;
}

export interface ComponentDefinition<TProps = unknown> {
  type: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  traits: ComponentTraits;
  defaultConstraints: Constraints;
  defaultProps: TProps;

  /** Canvas rendering component */
  Element: React.ComponentType<{ props: TProps; isSelected: boolean }>;

  /** Properties panel component (null = no type-specific properties) */
  PropertiesPanel: React.ComponentType<{ componentId: string; props: TProps }> | null;

  /** Generate ZPL commands for this component */
  generateZpl: (props: TProps, bounds: ResolvedBounds) => string[];

  /** Override sizing mode (default uses traits.autoSized) */
  getSizingMode?: (component: LabelComponent) => SizingMode;
}
