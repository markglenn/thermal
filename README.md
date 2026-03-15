# Thermal

A WYSIWYG label editor for Zebra thermal printers. Design labels visually, generate ZPL code, and preview the output — all in the browser.

## Features

- **Visual canvas** with zoom, pan, and grid overlay
- **Drag-and-drop** components from palette onto the label
- **Constraint-based layout** — pin components to edges so labels reflow when resized
- **Live ZPL generation** — see the ZPL output update in real time
- **Labelary preview** — rendered label image via the Labelary API
- **Component types**: text, barcodes (Code 128, Code 39, EAN-13, UPC-A, ITF), QR codes, rectangles, lines, containers
- **Text features**: independent height/width, rotation, multi-line field blocks with word wrap and justification
- **Font approximation**: Roboto Condensed for ZPL Font 0, Source Code Pro for bitmap fonts A-H
- **Layer management** with drag-to-reorder
- **Label presets**: 4x6, 4x4, 2x1, 3x2 at 203/300/600 DPI

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the editor.

## How It Works

Labels are composed of components positioned using a constraint system inspired by Xcode's Auto Layout. Each component can be pinned to parent edges, given fixed dimensions, or left to auto-size based on content. The constraint resolver computes absolute positions in dots (printer pixels), which map directly to ZPL field origins.

The editor generates ZPL in real time. A proxy route sends the ZPL to the [Labelary API](http://labelary.com) for a rendered PNG preview, so you can compare the canvas approximation against the actual printer output.

## Adding Components

The editor uses a plugin architecture. Each component type is self-contained in `lib/components/<type>/`:

```
lib/components/text/
  index.ts          # Component definition (traits, defaults)
  element.tsx       # Canvas rendering
  properties.tsx    # Properties panel
  zpl.ts            # ZPL generation
```

To add a new component type:
1. Create the directory with those files
2. Export a `ComponentDefinition` from `index.ts`
3. Add one import line to `lib/components/index.ts`

The palette, canvas, properties panel, and ZPL generator all pick it up automatically.

## Project Structure

```
app/
  editor/page.tsx              # Editor page
  api/labelary/route.ts        # Labelary API proxy
lib/
  components/                  # Component plugins (text, barcode, qrcode, etc.)
  store/                       # Zustand store (editor state, actions)
  constraints/resolver.ts      # Constraint solver
  zpl/                         # ZPL generation (generator, fonts, shared utils)
  types.ts                     # TypeScript types
  constants.ts                 # DPI values, font mappings, label presets
components/
  editor/                      # Canvas, selection overlay, constraint guides
  palette/                     # Component palette, layer hierarchy
  properties/                  # Constraint editor, number input
  preview/                     # ZPL output, Labelary preview
  toolbar/                     # Toolbar, label settings
hooks/                         # Canvas interaction hooks (zoom, drag, resize, etc.)
```

## License

MIT
