# Thermal - WYSIWYG ZPL Label Editor

## What This Is

A constraint-based visual editor for designing Zebra thermal printer labels. Users compose labels from text, barcodes, QR codes, rectangles, lines, and containers on a zoomable canvas. The editor outputs ZPL (Zebra Programming Language) that can be sent directly to a printer. A live preview via the Labelary API shows the actual printed result.

## Why It Exists

Designing ZPL labels by hand is tedious and error-prone. Existing tools are either proprietary (NiceLabel, ZebraDesigner) or basic web viewers (Labelary). Thermal bridges the gap with a modern web-based editor that understands ZPL's constraint model natively.

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **React 19** with React Compiler
- **Zustand + Immer** for state management
- **Tailwind CSS 4**
- **TypeScript 5** (strict mode)
- **JsBarcode** for barcode rendering
- **qrcode.react** for QR code rendering
- **@dnd-kit** for layer reordering

## Development

```bash
npm run dev    # Start dev server
npm run build  # Production build (also runs TypeScript check)
npm run lint   # ESLint
```

## Architecture

### Plugin-Based Components

Each component type lives in `lib/components/<type>/` and is fully self-contained:

```
lib/components/
  text/         # element.tsx, properties.tsx, zpl.ts, index.ts
  barcode/      # ...
  qrcode/       # ...
  rectangle/    # ...
  line/         # ...
  container/    # ...
  image/        # ...
  definition.ts # ComponentDefinition<TProps> interface
  registry.ts   # registerComponent, getDefinition, getSizingMode
  index.ts      # Registers all components (order = palette order)
```

**To add a new component:**
1. Create `lib/components/<type>/` with `element.tsx`, `zpl.ts`, `index.ts`, and optionally `properties.tsx`
2. Export a `ComponentDefinition` from `index.ts`
3. Import and add to the array in `lib/components/index.ts`

No other files need to be modified. The canvas, properties panel, ZPL generator, and palette all use the registry.

### Key Interfaces

```typescript
// Each component plugin implements this
interface ComponentDefinition<TProps> {
  type: string;
  label: string;
  icon: string;
  traits: { autoSized: boolean; rotatable: boolean; isContainer: boolean };
  defaultConstraints: Constraints;
  defaultProps: TProps;
  Element: React.ComponentType<{ props: TProps; isSelected: boolean }>;
  PropertiesPanel: React.ComponentType<{ componentId: string; props: TProps }> | null;
  generateZpl: (props: TProps, bounds: ResolvedBounds) => string[];
  getSizingMode?: (component: LabelComponent) => 'auto' | 'fixed' | 'width-only';
}
```

### Constraint System

All measurements are in **dots** (printer pixels). A 2" x 1" label at 203 DPI = 406 x 203 dots.

Components have optional constraints: `top`, `bottom`, `left`, `right`, `width`, `height`. The resolver (`lib/constraints/resolver.ts`) computes absolute bounds:

- `left + right` set: stretches between edges
- `left + width` set: pinned to left edge
- `right + width` set: pinned to right edge
- Overconstrained (all three): ignores width, stretches

**Pins** are separate from position. A component can have `left: 50` as its position without being "pinned left." Pins lock an axis during drag and enable reflow behavior. They're stored in `component.pins: PinnableEdge[]`.

**Sizing modes:**
- `auto` — content determines both width and height (text, barcode, QR code)
- `fixed` — constraints determine both (rectangle, line, container, image)
- `width-only` — constraints set width, content sets height (text with field block)

### State Management

Single Zustand store (`lib/store/editor-store.ts`) with Immer middleware:

- **Document model**: `LabelDocument` with nested `LabelComponent[]` tree
- **Component CRUD**: add, remove, duplicate, rename, reparent, reorder
- **Constraints**: updateConstraints, togglePin
- **Viewport**: zoom, panX, panY
- **Interaction state**: dragState, resizeState, paletteDropState

### Canvas Architecture

`Canvas.tsx` (~160 lines) composes five hooks:

| Hook | Responsibility |
|------|---------------|
| `use-canvas-zoom-pan` | Wheel zoom, trackpad pan, middle-mouse pan, fit-on-mount, pan clamping |
| `use-canvas-drag` | Component drag with pin constraints |
| `use-canvas-resize` | Resize handle logic |
| `use-palette-drop` | Screen-to-dot conversion, palette drop |
| `use-absolute-bounds` | DOM measurement + constraint resolution |

The canvas uses CSS transforms for zoom/pan. Components are rendered at absolute dot positions inside the label surface div.

### ZPL Generation

`lib/zpl/generator.ts` walks the component tree, resolves bounds, and calls each component's `generateZpl()`. The output is a complete ZPL document (`^XA` ... `^XZ`).

### Labelary Preview

`app/api/labelary/route.ts` proxies to the Labelary API (avoids CORS). DPI is converted to dpmm (203→8, 300→12, 600→24). The preview component debounces at 500ms.

### Font System

ZPL Font 0 (CG Triumvirate Bold Condensed) is approximated with **Roboto Condensed Bold**. Bitmap fonts A-H use **Source Code Pro Bold**. Fonts are loaded via `next/font/google` and applied through CSS variables (`--font-zpl-0`, `--font-zpl-bitmap`).

Text rendering accounts for:
- Independent height/width (`^A0N,h,w`) via CSS `scaleX`
- Bitmap font aspect ratio scaling
- Ascender gap compensation (`marginTop: -0.12em`)
- Letter spacing tuning (`-0.027em` for Font 0)
- Rotation (90/180/270) with position-preserving CSS transforms

## Testing & Linting

- **Always create unit tests** whenever possible for new or changed logic
- **Verify tests pass** (`npm test`) before committing
- Tests use **Vitest** — test files live alongside source as `*.test.ts` or in a `__tests__/` directory
- Run `npm test` for a single pass, `npm run test:watch` during development
- **Always run `npm run lint`** on changed files before committing — this catches React Compiler violations (via `eslint-plugin-react-compiler` included in `eslint-config-next`) that `npm run build` and `tsc` will not catch
- React Compiler lint rules to watch for:
  - **No `setState` synchronously in effects** — use `useRef<T | null>(null)` with `if (ref.current === null)` for one-time initialization instead of `useEffect`
  - **No ref access during render** — only `ref.current === null` checks are allowed (for init); use `useEffect` or event handlers for other ref reads
  - **Manual memoization must match inferred deps** — if `useCallback`/`useMemo` deps don't match what the compiler infers, it will error

## Code Conventions

- **No switch statements** for component dispatch — use the registry
- **Shared utilities** in `lib/utils.ts` (just `findComponent` tree walker)
- **ZPL helpers** in `lib/zpl/commands.ts` (just `fieldOrigin`) and `lib/zpl/fonts.ts`
- **Number inputs** use `NumberInput` component with live-update-on-valid, commit-on-blur pattern
- **Callbacks in hooks** read from `useEditorStore.getState()` instead of closing over render variables (React Compiler compatibility)
- **No `useRef.current` access during render** — exception: `if (ref.current === null)` for one-time init is allowed by the React Compiler

## Important ZPL Behaviors

- `^FO` positions the top-left of the field origin
- `^A` font rotation: N=0, R=90 CW, I=180, B=270 CW
- `^BC` (Code 128) uses subset B by default (one symbol per character)
- `^BQ` (QR) includes a quiet zone at the top
- `^FB` (field block) enables multi-line text with word wrap and justification
- `\&` is the line break escape in `^FD` data within `^FB`
- ZPL renders later fields on top of earlier ones (z-order matters)
- All coordinates are in dots (1 dot = 1/DPI inches)

## Print System

Print jobs are sent to a separate Elixir print server (thermal-printer) via SQS with a hybrid delivery model:

- **Small jobs (< 200 KB raw ZPL):** sent as raw ZPL inline in the SQS message. One AWS API call, fastest path.
- **Large jobs (≥ 200 KB, e.g. labels with `^GFA` images):** gzip-compressed and uploaded to S3 (`print-jobs/{jobId}.zpl.gz`), then a small SQS message with the S3 key is sent. Gzip only on this path where it matters — image hex data compresses 70%+. The S3 bucket should have a lifecycle rule to auto-delete objects after 24 hours.

The print server checks for `s3Key` in the message — if present, fetch from S3 and gunzip. Otherwise, use the `zpl` field directly. All messages include an HMAC-SHA256 signature.

**Environment variables:** `PRINT_QUEUE_URL`, `PRINT_BUCKET`, `PRINT_SIGNING_SECRET`

See `lib/print/` for the S3/SQS client, signing, and compression modules.

## TODO

- **Variables and boolean logic** — Think about how variables could support conditional visibility or content switching (e.g. show/hide a component based on a variable value, conditional text). This would enable a single label template to handle different product types or regional requirements.

## What's Not Yet Implemented

- Export/import document as JSON file
- VStack/HStack auto-layout containers
- Print options / direct printer communication
- Snap-to-grid during drag
- Copy/paste between documents
