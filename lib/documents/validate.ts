import type {
  LabelDocument,
  ComponentType,
  Rotation,
  ZplFont,
  BarcodeEncoding,
  QrErrorCorrection,
  TextJustification,
  MonochromeMethod,
  ImageObjectFit,
  ImageObjectPosition,
  HorizontalAnchor,
  VerticalAnchor,
  ConditionOperator,
  VariableType,
  LabelUnit,
} from '../types';

// ---------------------------------------------------------------------------
// Validation result
// ---------------------------------------------------------------------------

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Ctx = { path: string; errors: ValidationError[] };

function err(ctx: Ctx, message: string): void {
  ctx.errors.push({ path: ctx.path, message });
}

function child(ctx: Ctx, segment: string | number): Ctx {
  return { path: `${ctx.path}.${segment}`, errors: ctx.errors };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isOneOf<T>(v: unknown, allowed: readonly T[]): v is T {
  return (allowed as readonly unknown[]).includes(v);
}

// ---------------------------------------------------------------------------
// Allowed value sets (derived from types.ts)
// ---------------------------------------------------------------------------

const VALID_DPI = [203, 300, 600] as const;
const VALID_UNITS: readonly LabelUnit[] = ['in', 'mm'];
const VALID_COMPONENT_TYPES: readonly ComponentType[] = [
  'text', 'barcode', 'qrcode', 'datamatrix', 'pdf417',
  'image', 'line', 'rectangle', 'ellipse',
];
const VALID_ROTATIONS: readonly Rotation[] = [0, 90, 180, 270];
const VALID_FONTS: readonly ZplFont[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', '0'];
const VALID_BARCODE_ENCODINGS: readonly BarcodeEncoding[] = ['code128', 'code39', 'ean13', 'upca', 'itf'];
const VALID_QR_EC: readonly QrErrorCorrection[] = ['H', 'Q', 'M', 'L'];
const VALID_JUSTIFICATIONS: readonly TextJustification[] = ['L', 'C', 'R', 'J'];
const VALID_MONOCHROME_METHODS: readonly MonochromeMethod[] = ['threshold', 'dither', 'ordered'];
const VALID_OBJECT_FIT: readonly ImageObjectFit[] = ['fit', 'fill', 'stretch'];
const VALID_OBJECT_POSITION: readonly ImageObjectPosition[] = [
  'top-left', 'top', 'top-right', 'left', 'center', 'right',
  'bottom-left', 'bottom', 'bottom-right',
];
const VALID_H_ANCHORS: readonly HorizontalAnchor[] = ['left', 'center', 'right'];
const VALID_V_ANCHORS: readonly VerticalAnchor[] = ['top', 'bottom'];
const VALID_CONDITION_OPS: readonly ConditionOperator[] = ['==', '!=', 'isEmpty', 'isNotEmpty'];
const VALID_VARIABLE_TYPES: readonly VariableType[] = ['text', 'date', 'counter'];

// ---------------------------------------------------------------------------
// Sub-validators
// ---------------------------------------------------------------------------

function validateVariant(v: unknown, ctx: Ctx): void {
  if (!isObject(v)) { err(ctx, 'must be an object'); return; }
  const o = v as Record<string, unknown>;
  if (typeof o.name !== 'string' || o.name.length === 0) err(child(ctx, 'name'), 'must be a non-empty string');
  if (typeof o.widthDots !== 'number' || o.widthDots <= 0) err(child(ctx, 'widthDots'), 'must be a positive number');
  if (typeof o.heightDots !== 'number' || o.heightDots <= 0) err(child(ctx, 'heightDots'), 'must be a positive number');
  if (!isOneOf(o.unit, VALID_UNITS)) err(child(ctx, 'unit'), `must be one of: ${VALID_UNITS.join(', ')}`);
}

function validateLabelConfig(v: unknown, ctx: Ctx): void {
  if (!isObject(v)) { err(ctx, 'must be an object'); return; }
  const o = v as Record<string, unknown>;
  if (!isOneOf(o.dpi, VALID_DPI)) err(child(ctx, 'dpi'), `must be one of: ${VALID_DPI.join(', ')}`);

  // Accept new variants format or legacy widthInches/heightInches format
  const hasVariants = 'variants' in o && Array.isArray(o.variants) && (o.variants as unknown[]).length > 0;
  const hasLegacy = typeof o.widthInches === 'number' && (o.widthInches as number) > 0
    && typeof o.heightInches === 'number' && (o.heightInches as number) > 0;

  if (!hasVariants && !hasLegacy) {
    err(child(ctx, 'variants'), 'must have at least one variant (or legacy widthInches/heightInches)');
    return;
  }

  if (hasVariants) {
    const variants = o.variants as unknown[];
    for (let i = 0; i < variants.length; i++) {
      validateVariant(variants[i], child(ctx, `variants[${i}]`));
    }
  }
}

function validateLayout(v: unknown, ctx: Ctx): void {
  if (!isObject(v)) { err(ctx, 'must be an object'); return; }
  const o = v as Record<string, unknown>;
  if (typeof o.x !== 'number') err(child(ctx, 'x'), 'must be a number');
  if (typeof o.y !== 'number') err(child(ctx, 'y'), 'must be a number');
  if (typeof o.width !== 'number') err(child(ctx, 'width'), 'must be a number');
  if (typeof o.height !== 'number') err(child(ctx, 'height'), 'must be a number');
  if (!isOneOf(o.horizontalAnchor, VALID_H_ANCHORS)) err(child(ctx, 'horizontalAnchor'), `must be one of: ${VALID_H_ANCHORS.join(', ')}`);
  if (!isOneOf(o.verticalAnchor, VALID_V_ANCHORS)) err(child(ctx, 'verticalAnchor'), `must be one of: ${VALID_V_ANCHORS.join(', ')}`);
  // lockX, lockY are optional booleans
  if ('lockX' in o && typeof o.lockX !== 'boolean') err(child(ctx, 'lockX'), 'must be a boolean');
  if ('lockY' in o && typeof o.lockY !== 'boolean') err(child(ctx, 'lockY'), 'must be a boolean');
}

function validateTextProps(v: unknown, ctx: Ctx): void {
  if (!isObject(v)) { err(ctx, 'must be an object'); return; }
  const o = v as Record<string, unknown>;
  if (typeof o.content !== 'string') err(child(ctx, 'content'), 'must be a string');
  if (!isOneOf(o.font, VALID_FONTS)) err(child(ctx, 'font'), `must be one of: ${VALID_FONTS.join(', ')}`);
  if (typeof o.fontSize !== 'number' || (o.fontSize as number) <= 0) err(child(ctx, 'fontSize'), 'must be a positive number');
  if (typeof o.fontWidth !== 'number' || (o.fontWidth as number) <= 0) err(child(ctx, 'fontWidth'), 'must be a positive number');
  if (!isOneOf(o.rotation, VALID_ROTATIONS)) err(child(ctx, 'rotation'), `must be one of: ${VALID_ROTATIONS.join(', ')}`);
  if (o.fieldBlock !== undefined) {
    const fb = child(ctx, 'fieldBlock');
    if (!isObject(o.fieldBlock)) { err(fb, 'must be an object'); return; }
    const fbo = o.fieldBlock as Record<string, unknown>;
    if (typeof fbo.maxLines !== 'number' || (fbo.maxLines as number) < 1) err(child(fb, 'maxLines'), 'must be >= 1');
    if (typeof fbo.lineSpacing !== 'number') err(child(fb, 'lineSpacing'), 'must be a number');
    if (!isOneOf(fbo.justification, VALID_JUSTIFICATIONS)) err(child(fb, 'justification'), `must be one of: ${VALID_JUSTIFICATIONS.join(', ')}`);
  }
}

function validateBarcodeProps(v: unknown, ctx: Ctx): void {
  if (!isObject(v)) { err(ctx, 'must be an object'); return; }
  const o = v as Record<string, unknown>;
  if (typeof o.content !== 'string') err(child(ctx, 'content'), 'must be a string');
  if (!isOneOf(o.encoding, VALID_BARCODE_ENCODINGS)) err(child(ctx, 'encoding'), `must be one of: ${VALID_BARCODE_ENCODINGS.join(', ')}`);
  if (typeof o.height !== 'number' || (o.height as number) <= 0) err(child(ctx, 'height'), 'must be a positive number');
  if (typeof o.showText !== 'boolean') err(child(ctx, 'showText'), 'must be a boolean');
  if (!isOneOf(o.rotation, VALID_ROTATIONS)) err(child(ctx, 'rotation'), `must be one of: ${VALID_ROTATIONS.join(', ')}`);
}

function validateQrCodeProps(v: unknown, ctx: Ctx): void {
  if (!isObject(v)) { err(ctx, 'must be an object'); return; }
  const o = v as Record<string, unknown>;
  if (typeof o.content !== 'string') err(child(ctx, 'content'), 'must be a string');
  if (typeof o.magnification !== 'number' || (o.magnification as number) <= 0) err(child(ctx, 'magnification'), 'must be a positive number');
  if (!isOneOf(o.errorCorrection, VALID_QR_EC)) err(child(ctx, 'errorCorrection'), `must be one of: ${VALID_QR_EC.join(', ')}`);
}

function validateDataMatrixProps(v: unknown, ctx: Ctx): void {
  if (!isObject(v)) { err(ctx, 'must be an object'); return; }
  const o = v as Record<string, unknown>;
  if (typeof o.content !== 'string') err(child(ctx, 'content'), 'must be a string');
  if (typeof o.moduleSize !== 'number' || (o.moduleSize as number) <= 0) err(child(ctx, 'moduleSize'), 'must be a positive number');
}

function validatePdf417Props(v: unknown, ctx: Ctx): void {
  if (!isObject(v)) { err(ctx, 'must be an object'); return; }
  const o = v as Record<string, unknown>;
  if (typeof o.content !== 'string') err(child(ctx, 'content'), 'must be a string');
  if (typeof o.columns !== 'number' || (o.columns as number) < 1) err(child(ctx, 'columns'), 'must be >= 1');
  if (typeof o.securityLevel !== 'number') err(child(ctx, 'securityLevel'), 'must be a number');
  if (typeof o.rowHeight !== 'number' || (o.rowHeight as number) <= 0) err(child(ctx, 'rowHeight'), 'must be a positive number');
}

function validateImageProps(v: unknown, ctx: Ctx): void {
  if (!isObject(v)) { err(ctx, 'must be an object'); return; }
  const o = v as Record<string, unknown>;
  if (typeof o.data !== 'string') err(child(ctx, 'data'), 'must be a string');
  if (typeof o.originalWidth !== 'number') err(child(ctx, 'originalWidth'), 'must be a number');
  if (typeof o.originalHeight !== 'number') err(child(ctx, 'originalHeight'), 'must be a number');
  if (!isOneOf(o.objectFit, VALID_OBJECT_FIT)) err(child(ctx, 'objectFit'), `must be one of: ${VALID_OBJECT_FIT.join(', ')}`);
  if (!isOneOf(o.objectPosition, VALID_OBJECT_POSITION)) err(child(ctx, 'objectPosition'), `must be one of: ${VALID_OBJECT_POSITION.join(', ')}`);
  if (typeof o.threshold !== 'number') err(child(ctx, 'threshold'), 'must be a number');
  if (typeof o.invert !== 'boolean') err(child(ctx, 'invert'), 'must be a boolean');
  if (!isOneOf(o.monochromeMethod, VALID_MONOCHROME_METHODS)) err(child(ctx, 'monochromeMethod'), `must be one of: ${VALID_MONOCHROME_METHODS.join(', ')}`);
  if (typeof o.monochromePreview !== 'string') err(child(ctx, 'monochromePreview'), 'must be a string');
  if (typeof o.monochromePreviewFull !== 'string') err(child(ctx, 'monochromePreviewFull'), 'must be a string');
  if (typeof o.zplHex !== 'string') err(child(ctx, 'zplHex'), 'must be a string');
  if (typeof o.zplBytesPerRow !== 'number') err(child(ctx, 'zplBytesPerRow'), 'must be a number');
  if (typeof o.zplWidth !== 'number') err(child(ctx, 'zplWidth'), 'must be a number');
  if (typeof o.zplHeight !== 'number') err(child(ctx, 'zplHeight'), 'must be a number');
}

function validateLineProps(v: unknown, ctx: Ctx): void {
  if (!isObject(v)) { err(ctx, 'must be an object'); return; }
  const o = v as Record<string, unknown>;
  if (typeof o.thickness !== 'number' || (o.thickness as number) <= 0) err(child(ctx, 'thickness'), 'must be a positive number');
  if (o.orientation !== 'horizontal' && o.orientation !== 'vertical') err(child(ctx, 'orientation'), 'must be "horizontal" or "vertical"');
}

function validateRectangleProps(v: unknown, ctx: Ctx): void {
  if (!isObject(v)) { err(ctx, 'must be an object'); return; }
  const o = v as Record<string, unknown>;
  if (typeof o.borderThickness !== 'number') err(child(ctx, 'borderThickness'), 'must be a number');
  if (typeof o.cornerRadius !== 'number') err(child(ctx, 'cornerRadius'), 'must be a number');
  if (typeof o.filled !== 'boolean') err(child(ctx, 'filled'), 'must be a boolean');
}

function validateEllipseProps(v: unknown, ctx: Ctx): void {
  if (!isObject(v)) { err(ctx, 'must be an object'); return; }
  const o = v as Record<string, unknown>;
  if (typeof o.borderThickness !== 'number') err(child(ctx, 'borderThickness'), 'must be a number');
  if (typeof o.filled !== 'boolean') err(child(ctx, 'filled'), 'must be a boolean');
  if (typeof o.circle !== 'boolean') err(child(ctx, 'circle'), 'must be a boolean');
}

const PROPS_VALIDATORS: Record<ComponentType, (v: unknown, ctx: Ctx) => void> = {
  text: validateTextProps,
  barcode: validateBarcodeProps,
  qrcode: validateQrCodeProps,
  datamatrix: validateDataMatrixProps,
  pdf417: validatePdf417Props,
  image: validateImageProps,
  line: validateLineProps,
  rectangle: validateRectangleProps,
  ellipse: validateEllipseProps,
};

function validateTypeData(v: unknown, ctx: Ctx): void {
  if (!isObject(v)) { err(ctx, 'must be an object'); return; }
  const o = v as Record<string, unknown>;
  if (!isOneOf(o.type, VALID_COMPONENT_TYPES)) {
    err(child(ctx, 'type'), `must be one of: ${VALID_COMPONENT_TYPES.join(', ')}`);
    return;
  }
  const propsCtx = child(ctx, 'props');
  PROPS_VALIDATORS[o.type as ComponentType](o.props, propsCtx);
}

function validateVisibilityCondition(v: unknown, ctx: Ctx): void {
  if (!isObject(v)) { err(ctx, 'must be an object'); return; }
  const o = v as Record<string, unknown>;
  if (typeof o.field !== 'string' || o.field.length === 0) err(child(ctx, 'field'), 'must be a non-empty string');
  if (!isOneOf(o.operator, VALID_CONDITION_OPS)) err(child(ctx, 'operator'), `must be one of: ${VALID_CONDITION_OPS.join(', ')}`);
  if (o.value !== undefined && typeof o.value !== 'string') err(child(ctx, 'value'), 'must be a string if present');
}

function validateComponent(v: unknown, ctx: Ctx): void {
  if (!isObject(v)) { err(ctx, 'must be an object'); return; }
  const o = v as Record<string, unknown>;
  if (typeof o.id !== 'string' || o.id.length === 0) err(child(ctx, 'id'), 'must be a non-empty string');
  if (typeof o.name !== 'string' || o.name.length === 0) err(child(ctx, 'name'), 'must be a non-empty string');

  // Layout: required for new docs, but legacy docs may have constraints instead
  if ('layout' in o) {
    validateLayout(o.layout, child(ctx, 'layout'));
  } else if (!('constraints' in o)) {
    err(child(ctx, 'layout'), 'must have layout (or legacy constraints)');
  }

  // typeData is required
  if (!('typeData' in o)) {
    err(child(ctx, 'typeData'), 'is required');
  } else {
    validateTypeData(o.typeData, child(ctx, 'typeData'));
  }

  // Optional fields
  if (o.fieldBinding !== undefined && typeof o.fieldBinding !== 'string') {
    err(child(ctx, 'fieldBinding'), 'must be a string if present');
  }
  if (o.visibilityCondition !== undefined) {
    validateVisibilityCondition(o.visibilityCondition, child(ctx, 'visibilityCondition'));
  }
}

function validateVariable(v: unknown, ctx: Ctx): void {
  if (!isObject(v)) { err(ctx, 'must be an object'); return; }
  const o = v as Record<string, unknown>;
  if (typeof o.name !== 'string' || o.name.length === 0) err(child(ctx, 'name'), 'must be a non-empty string');
  if (!isOneOf(o.type, VALID_VARIABLE_TYPES)) err(child(ctx, 'type'), `must be one of: ${VALID_VARIABLE_TYPES.join(', ')}`);
  if (typeof o.defaultValue !== 'string') err(child(ctx, 'defaultValue'), 'must be a string');
  if (o.format !== undefined && typeof o.format !== 'string') err(child(ctx, 'format'), 'must be a string if present');
  if (o.counter !== undefined) {
    const cc = child(ctx, 'counter');
    if (!isObject(o.counter)) { err(cc, 'must be an object'); return; }
    const c = o.counter as Record<string, unknown>;
    if (typeof c.start !== 'number') err(child(cc, 'start'), 'must be a number');
    if (typeof c.increment !== 'number') err(child(cc, 'increment'), 'must be a number');
    if (typeof c.padding !== 'number') err(child(cc, 'padding'), 'must be a number');
    if (typeof c.prefix !== 'string') err(child(cc, 'prefix'), 'must be a string');
    if (typeof c.suffix !== 'string') err(child(cc, 'suffix'), 'must be a string');
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Deep-validate an unknown value as a LabelDocument. Returns structured errors. */
export function validateDocumentDeep(value: unknown): ValidationResult {
  const ctx: Ctx = { path: 'document', errors: [] };

  if (!isObject(value)) {
    err(ctx, 'must be an object');
    return { valid: false, errors: ctx.errors };
  }
  const doc = value as Record<string, unknown>;

  if (doc.version !== 1) err(child(ctx, 'version'), 'must be 1');

  validateLabelConfig(doc.label, child(ctx, 'label'));

  if (!Array.isArray(doc.components)) {
    err(child(ctx, 'components'), 'must be an array');
  } else {
    // Check for duplicate IDs
    const ids = new Set<string>();
    for (let i = 0; i < doc.components.length; i++) {
      validateComponent(doc.components[i], child(ctx, `components[${i}]`));
      const comp = doc.components[i] as Record<string, unknown> | undefined;
      if (comp && typeof comp.id === 'string') {
        if (ids.has(comp.id)) {
          err(child(ctx, `components[${i}].id`), `duplicate component id: ${comp.id}`);
        }
        ids.add(comp.id);
      }
    }
  }

  if (doc.variables !== undefined) {
    if (!Array.isArray(doc.variables)) {
      err(child(ctx, 'variables'), 'must be an array if present');
    } else {
      const names = new Set<string>();
      for (let i = 0; i < doc.variables.length; i++) {
        validateVariable(doc.variables[i], child(ctx, `variables[${i}]`));
        const v = doc.variables[i] as Record<string, unknown> | undefined;
        if (v && typeof v.name === 'string') {
          if (names.has(v.name)) {
            err(child(ctx, `variables[${i}].name`), `duplicate variable name: ${v.name}`);
          }
          names.add(v.name);
        }
      }
    }
  }

  return { valid: ctx.errors.length === 0, errors: ctx.errors };
}

/** Type guard that performs deep validation. Drop-in replacement for the old shallow check. */
export function validateDocument(value: unknown): value is LabelDocument {
  return validateDocumentDeep(value).valid;
}
