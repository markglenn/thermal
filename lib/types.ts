// Constraint system - all values in dots
export interface Constraints {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  width?: number;
  height?: number;
}

// Resolved absolute position (output of constraint resolver)
export interface ResolvedBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ComponentType =
  | 'text'
  | 'barcode'
  | 'qrcode'
  | 'image'
  | 'line'
  | 'rectangle'
  | 'container';

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

export type MonochromeMethod = 'threshold' | 'dither';

export interface ImageProperties {
  data: string; // base64 data URI
  originalWidth: number;
  originalHeight: number;
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

export interface ContainerProperties {}

export type ComponentProperties =
  | { type: 'text'; props: TextProperties }
  | { type: 'barcode'; props: BarcodeProperties }
  | { type: 'qrcode'; props: QrCodeProperties }
  | { type: 'image'; props: ImageProperties }
  | { type: 'line'; props: LineProperties }
  | { type: 'rectangle'; props: RectangleProperties }
  | { type: 'container'; props: ContainerProperties };

export type PinnableEdge = 'top' | 'bottom' | 'left' | 'right';

export interface LabelComponent {
  id: string;
  name: string;
  constraints: Constraints;
  pins: PinnableEdge[];
  children?: LabelComponent[];
  // Discriminated union for type + props
  typeData: ComponentProperties;
}

export interface LabelConfig {
  widthInches: number;
  heightInches: number;
  dpi: 203 | 300 | 600;
}

export interface LabelDocument {
  version: 1;
  label: LabelConfig;
  components: LabelComponent[];
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
  startConstraints: Constraints;
}

export interface ResizeState {
  componentId: string;
  handle: ResizeHandle;
  startX: number;
  startY: number;
  startConstraints: Constraints;
}

export interface PaletteDropState {
  type: ComponentType;
  ghostX: number;
  ghostY: number;
}

export interface EditorState {
  document: LabelDocument;
  selectedComponentId: string | null;
  viewport: EditorViewport;
  interactionMode: InteractionMode;
  dragState: DragState | null;
  resizeState: ResizeState | null;
  paletteDropState: PaletteDropState | null;
  showGrid: boolean;
  gridSize: number;
}
