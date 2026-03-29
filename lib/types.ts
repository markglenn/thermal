// Layout system - all values in dots
export type HorizontalAnchor = 'left' | 'center' | 'right';
export type VerticalAnchor = 'top' | 'bottom';

export interface ComponentLayout {
  x: number;           // distance from anchored horizontal edge
  y: number;           // distance from anchored vertical edge
  width: number;
  height: number;
  horizontalAnchor: HorizontalAnchor;  // which edge x is measured from
  verticalAnchor: VerticalAnchor;      // which edge y is measured from
  lockX?: boolean;     // when true, x cannot change during drag
  lockY?: boolean;     // when true, y cannot change during drag
}

// Legacy Constraints type — kept temporarily for migration compatibility.
// All new code should use ComponentLayout.
export interface Constraints {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  width?: number;
  height?: number;
}

// Resolved absolute position (output of layout resolver)
export interface ResolvedBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A version is either 'published' (live) or null (a regular saved version). */
export type VersionStatus = 'published' | null;

export type ComponentType =
  | 'text'
  | 'barcode'
  | 'qrcode'
  | 'datamatrix'
  | 'pdf417'
  | 'image'
  | 'line'
  | 'rectangle'
  | 'ellipse';

export type BarcodeEncoding = 'code128' | 'code39' | 'ean13' | 'upca' | 'itf';
export type QrErrorCorrection = 'H' | 'Q' | 'M' | 'L';
export type ZplFont = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | '0';
export type Rotation = 0 | 90 | 180 | 270;

export type TextJustification = 'L' | 'C' | 'R' | 'J';

export interface FieldBlockProperties {
  maxLines: number;
  lineSpacing: number;
  justification: TextJustification;
}

export interface TextProperties {
  content: string;
  font: ZplFont;
  fontSize: number;
  fontWidth: number;
  rotation: Rotation;
  fieldBlock?: FieldBlockProperties;
}

export interface BarcodeProperties {
  content: string;
  encoding: BarcodeEncoding;
  height: number;
  showText: boolean;
  rotation: Rotation;
}

export interface QrCodeProperties {
  content: string;
  magnification: number;
  errorCorrection: QrErrorCorrection;
}

export interface DataMatrixProperties {
  content: string;
  moduleSize: number;
}

export interface Pdf417Properties {
  content: string;
  columns: number;
  securityLevel: number;
  rowHeight: number;
}

export type MonochromeMethod = 'threshold' | 'dither';
export type ImageObjectFit = 'fit' | 'fill' | 'stretch';
export type ImageObjectPosition = 'top-left' | 'top' | 'top-right' | 'left' | 'center' | 'right' | 'bottom-left' | 'bottom' | 'bottom-right';

export interface ImageProperties {
  data: string; // base64 data URI
  originalWidth: number;
  originalHeight: number;
  objectFit: ImageObjectFit;
  objectPosition: ImageObjectPosition;
  threshold: number; // 0-255
  invert: boolean;
  monochromeMethod: MonochromeMethod;
  monochromePreview: string; // monochrome PNG at constraint dimensions for idle display
  monochromePreviewFull: string; // monochrome PNG at original dimensions for resize display
  zplHex: string; // pre-computed monochrome hex for ^GFA
  zplBytesPerRow: number;
  zplWidth: number;
  zplHeight: number;
}

export interface LineProperties {
  thickness: number;
  orientation: 'horizontal' | 'vertical';
}

export interface RectangleProperties {
  borderThickness: number;
  cornerRadius: number;
  filled: boolean;
}

export interface EllipseProperties {
  borderThickness: number;
  filled: boolean;
  circle: boolean;
}

export type ComponentProperties =
  | { type: 'text'; props: TextProperties }
  | { type: 'barcode'; props: BarcodeProperties }
  | { type: 'qrcode'; props: QrCodeProperties }
  | { type: 'datamatrix'; props: DataMatrixProperties }
  | { type: 'pdf417'; props: Pdf417Properties }
  | { type: 'image'; props: ImageProperties }
  | { type: 'line'; props: LineProperties }
  | { type: 'rectangle'; props: RectangleProperties }
  | { type: 'ellipse'; props: EllipseProperties };

export type PinnableEdge = 'top' | 'bottom' | 'left' | 'right';

export type ConditionOperator = '==' | '!=' | 'isEmpty' | 'isNotEmpty';

export interface VisibilityCondition {
  field: string;
  operator: ConditionOperator;
  value?: string;
}

export interface LabelComponent {
  id: string;
  name: string;
  layout: ComponentLayout;
  /** @deprecated Use layout instead. Kept for migration of saved documents. */
  constraints?: Constraints;
  /** @deprecated Use layout.horizontalAnchor/verticalAnchor instead. */
  pins?: PinnableEdge[];
  fieldBinding?: string;
  visibilityCondition?: VisibilityCondition;
  // Discriminated union for type + props
  typeData: ComponentProperties;
}

export type VariableType = 'text' | 'date' | 'counter';

export interface CounterConfig {
  start: number;
  increment: number;
  padding: number;       // zero-pad width (e.g., 5 → "00001")
  prefix: string;
  suffix: string;
}

export interface LabelVariable {
  name: string;
  type: VariableType;
  defaultValue: string;
  format?: string;       // date format string (e.g., "YYYY-MM-DD")
  counter?: CounterConfig;
}

export type LabelUnit = 'in' | 'mm';

export interface LabelSizeVariant {
  name: string;
  widthDots: number;
  heightDots: number;
  unit: LabelUnit;
}

export interface LabelConfig {
  dpi: 203 | 300 | 600;
  variants: LabelSizeVariant[];
}

export interface LabelDocument {
  version: 1;
  label: LabelConfig;
  components: LabelComponent[];
  variables?: LabelVariable[];
}

// Editor state types
export interface EditorViewport {
  zoom: number;
  panX: number;
  panY: number;
}

export type InteractionMode = 'select' | 'pan' | 'drag' | 'resize';

export type ResizeHandle =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'right'
  | 'bottom-right'
  | 'bottom'
  | 'bottom-left'
  | 'left';

export interface DragState {
  componentId: string;
  startX: number;
  startY: number;
  startLayout: ComponentLayout;
  /** When dragging multiple selected components, track all their start layouts */
  others?: { componentId: string; startLayout: ComponentLayout }[];
}

export interface ResizeState {
  componentId: string;
  handle: ResizeHandle;
  startX: number;
  startY: number;
  startLayout: ComponentLayout;
}

export interface PaletteDropState {
  type: ComponentType;
  ghostX: number;
  ghostY: number;
}

export interface EditorState {
  document: LabelDocument;
  activeVariant: string;
  selectedComponentIds: string[];
  viewport: EditorViewport;
  interactionMode: InteractionMode;
  dragState: DragState | null;
  resizeState: ResizeState | null;
  paletteDropState: PaletteDropState | null;
  showGrid: boolean;
  showRulers: boolean;
  gridSize: number;
  currentLabelId: string | null;
  currentLabelName: string | null;
  readOnly: boolean;
}
