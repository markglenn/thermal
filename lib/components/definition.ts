import type { ComponentLayout, LabelComponent, ResolvedBounds } from '../types';

export type SizingMode = 'auto' | 'fixed' | 'width-only';

export interface ComponentTraits {
  autoSized: boolean;
  rotatable: boolean;
  bindable: boolean;
}

export interface ComponentDefinition<TProps = unknown> {
  type: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  traits: ComponentTraits;
  defaultLayout: ComponentLayout;
  defaultProps: TProps;

  /** Canvas rendering component */
  Element: React.ComponentType<{ props: TProps; isSelected: boolean }>;

  /** Properties panel component (null = no type-specific properties) */
  PropertiesPanel: React.ComponentType<{ componentId: string; props: TProps }> | null;

  /** Generate ZPL commands for this component */
  generateZpl: (props: TProps, bounds: ResolvedBounds) => string[];

  /** Override sizing mode (default uses traits.autoSized) */
  getSizingMode?: (component: LabelComponent) => SizingMode;

  /** Compute intrinsic content size for auto/width-only components (pure, no DOM) */
  computeContentSize?: (props: TProps, constraintWidth?: number) => { width: number; height: number };

  /** Constrain a manual size change (e.g. enforce aspect ratio, max size). Returns the adjusted update. */
  constrainSize?: (props: TProps, currentLayout: ComponentLayout, change: Partial<Pick<ComponentLayout, 'width' | 'height'>>) => Partial<Pick<ComponentLayout, 'width' | 'height'>>;
}
