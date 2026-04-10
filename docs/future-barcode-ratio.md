# Barcode Module Width and Ratio Support

## Problem

Thermal's barcode component uses a fixed 2px module width (via JsBarcode defaults) with no user control over bar width or the wide-to-narrow ratio. NiceLabel labels specify both:

- **X dimension** (module/narrow bar width): e.g. 0.027" = ~5.5 dots at 203 DPI
- **Ratio** (wide-to-narrow multiplier): 2.0–3.0, typically 3 for Code 39

This means imported NiceLabel barcodes render significantly smaller than intended. A Code 39 barcode with ratio 3 and 27-mil X dimension is ~2.7x wider than our default rendering.

## NiceLabel XML Fields

```xml
<BarcodeData Type="Code39BarcodeData">
  <BaseBarWidth>677.333</BaseBarWidth>    <!-- microns, narrow bar width -->
  <Ratio>3</Ratio>                        <!-- wide-to-narrow ratio -->
  <ModuleHeight>15036.45</ModuleHeight>   <!-- microns, bar height -->
</BarcodeData>
```

## Proposed Changes

### 1. Add properties to BarcodeProperties

```typescript
export interface BarcodeProperties {
  content: string;
  encoding: BarcodeEncoding;
  height: number;
  showText: boolean;
  rotation: Rotation;
  moduleWidth?: number;  // NEW: narrow bar width in dots (default: 2)
  ratio?: number;        // NEW: wide-to-narrow ratio (default: 3 for code39/itf, ignored for code128/ean/upca)
}
```

`moduleWidth` and `ratio` are optional — existing labels without them use current defaults.

### 2. Update ZPL generation (barcode/zpl.ts)

Emit `^BY` command before the barcode command:

```
^BY{moduleWidth},{ratio},{height}
^B3N,,{height},Y,N
^FD{content}^FS
```

Currently we only emit the barcode command (^BC, ^B3, etc). Adding `^BY` controls the bar dimensions.

### 3. Update canvas renderer (barcode/element.tsx)

Pass `moduleWidth` to JsBarcode options:

```typescript
JsBarcode(svg, content, {
  width: props.moduleWidth ?? 2,
  // ... existing options
});
```

JsBarcode's `width` option is the module width in pixels. For ratio, Code 39 in JsBarcode doesn't have a direct ratio option — it uses a fixed 3:1 ratio. This matches the ZPL default.

### 4. Update computeBarcodeSize

```typescript
const MODULE_WIDTH = props.moduleWidth ?? 2;
// For Code 39: narrow bar = MODULE_WIDTH, wide bar = MODULE_WIDTH * ratio
// Total width calculation changes per encoding
```

### 5. Update properties panel

Add Module Width and Ratio inputs to the barcode properties section. Ratio only shown for encodings that support it (Code 39, ITF).

### 6. Update NiceLabel importer

Map `BaseBarWidth` to `moduleWidth`:
```typescript
moduleWidth: Math.max(1, micronsToDots(item.baseBarWidth, dpi))
```

Map `Ratio` to `ratio` (already parsed as `item.ratio` but not used).

## Encodings and Ratio Support

| Encoding | Ratio applicable | ZPL command |
|----------|-----------------|-------------|
| Code 128 | No (fixed widths) | ^BC |
| Code 39  | Yes (2.0–3.0)    | ^B3 |
| EAN-13   | No (fixed widths) | ^BE |
| UPC-A    | No (fixed widths) | ^BU |
| ITF      | Yes (2.0–3.0)    | ^B2 |

## Impact

- Imported NiceLabel barcodes will render at the correct width
- Users can control barcode density for scanning distance requirements
- Wider barcodes = easier to scan at distance, narrower = more data in less space
