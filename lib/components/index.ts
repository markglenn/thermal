import { registerComponent } from './registry';
import { textComponent } from './text';
import { barcodeComponent } from './barcode';
import { qrcodeComponent } from './qrcode';
import { rectangleComponent } from './rectangle';
import { lineComponent } from './line';
import { imageComponent } from './image';
import { ellipseComponent } from './ellipse';
import { datamatrixComponent } from './datamatrix';

// Order here determines palette order
[
  textComponent,
  barcodeComponent,
  qrcodeComponent,
  datamatrixComponent,
  rectangleComponent,
  ellipseComponent,
  lineComponent,
  imageComponent,
].forEach(registerComponent);

export { getDefinition, getAllDefinitions, getSizingMode } from './registry';
export type { ComponentDefinition, ComponentTraits, SizingMode } from './definition';
