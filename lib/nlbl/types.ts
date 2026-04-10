// Intermediate types representing parsed NiceLabel XML structures
// before conversion to Thermal's LabelDocument format.
// All spatial values from the XML are in microns (1/1000 mm).

export interface NlblVariable {
  id: string;
  name: string;
  sampleValue: string;
  isRequired: boolean;
}

export interface NlblTextItem {
  name: string;
  left: number;   // microns
  top: number;
  width: number;
  height: number;
  anchoringPoint: number; // 0=TL 1=TC 2=TR 3=ML 4=MC 5=MR 6=BL 7=BC 8=BR
  content: string;        // FixedContents
  contentMask: string;    // ContentsMask prefix (e.g. "Rack ID:")
  fontName: string;
  fontPointSize: number; // FontDescriptor.Height in points
  fontWeight: number; // 0 = normal, 700 = bold
  justification: number; // 0 = left, 1 = right, 2 = center
  textType: number; // 1=Text (auto-size), 2=TextBox (fixed-size)
  bestFit: boolean;
  zOrder: number;
  dataSourceId: string | null;
}

export interface NlblBarcodeItem {
  name: string;
  x: number;      // microns
  y: number;
  anchoringPoint: number; // 0=TL 1=TC 2=TR 3=ML 4=MC 5=MR 6=BL 7=BC 8=BR
  barcodeType: string; // e.g. 'Code128BarcodeData'
  baseBarWidth: number; // microns — narrow bar width
  moduleHeight: number; // microns
  showText: boolean; // HumanInterpretationPosition != 0
  humanFontPointSize: number; // HumanInterpretationFontDescriptor.Height
  contentMask: string; // e.g. "Order Number:  *******"
  content: string;
  zOrder: number;
  dataSourceId: string | null;
}

export interface NlblRectangleItem {
  name: string;
  left: number;   // microns
  top: number;
  width: number;
  height: number;
  anchoringPoint: number;
  thickness: number; // microns
  radius: number;    // microns
  filled: boolean;   // FillStyle != 0
  zOrder: number;
}

export interface NlblLineItem {
  name: string;
  startX: number; // microns
  startY: number;
  endX: number;
  endY: number;
  thickness: number; // microns
  zOrder: number;
}

export interface NlblGraphicItem {
  name: string;
  left: number;   // microns
  top: number;
  width: number;
  height: number;
  anchoringPoint: number;
  zOrder: number;
  dataSourceId: string | null;
}

export interface NlblMedia {
  widthMicrons: number;
  heightMicrons: number;
}

export interface NlblParsedLabel {
  name: string;
  media: NlblMedia;
  variables: NlblVariable[];
  textItems: NlblTextItem[];
  barcodeItems: NlblBarcodeItem[];
  rectangleItems: NlblRectangleItem[];
  lineItems: NlblLineItem[];
  graphicItems: NlblGraphicItem[];
}
