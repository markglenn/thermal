import { describe, it, expect } from 'vitest';
import { parseSolutionXml, parseFormatXml } from './parse-xml';

describe('parseSolutionXml', () => {
  it('parses variables from solution XML', () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<EuroPlus.NiceLabel>
  <Variables>
    <Item Type="Variable">
      <Id>abc-123</Id>
      <Name>serial_number</Name>
      <SampleValue Type="StringContents">
        <StringValue>SN-001</StringValue>
        <UserValue>SN-001</UserValue>
      </SampleValue>
      <Constraints Type="DataSourceConstraints">
        <Length>0</Length>
        <IsRequired>True</IsRequired>
      </Constraints>
    </Item>
    <Item Type="Variable">
      <Id>def-456</Id>
      <Name>optional_field</Name>
      <SampleValue Type="StringContents">
        <StringValue>??????</StringValue>
        <UserValue>??????</UserValue>
      </SampleValue>
      <Constraints Type="DataSourceConstraints">
        <Length>0</Length>
      </Constraints>
    </Item>
  </Variables>
</EuroPlus.NiceLabel>`;

    const vars = parseSolutionXml(xml);
    expect(vars).toHaveLength(2);

    expect(vars[0].id).toBe('abc-123');
    expect(vars[0].name).toBe('serial_number');
    expect(vars[0].sampleValue).toBe('SN-001');
    expect(vars[0].isRequired).toBe(true);

    expect(vars[1].id).toBe('def-456');
    expect(vars[1].name).toBe('optional_field');
    expect(vars[1].sampleValue).toBe('??????');
    expect(vars[1].isRequired).toBe(false);
  });

  it('handles datetime variables', () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<EuroPlus.NiceLabel>
  <Variables>
    <Item Type="Variable">
      <Id>date-1</Id>
      <Name>CurrentDate</Name>
      <SampleValue Type="SystemDateTimeContents">
        <UserValue>4/6/2026</UserValue>
      </SampleValue>
      <Constraints Type="DataSourceConstraints">
        <Length>0</Length>
      </Constraints>
    </Item>
  </Variables>
</EuroPlus.NiceLabel>`;

    const vars = parseSolutionXml(xml);
    expect(vars).toHaveLength(1);
    expect(vars[0].name).toBe('CurrentDate');
    expect(vars[0].sampleValue).toBe('4/6/2026');
  });

  it('returns empty array for missing variables section', () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<EuroPlus.NiceLabel></EuroPlus.NiceLabel>`;

    expect(parseSolutionXml(xml)).toHaveLength(0);
  });
});

describe('parseFormatXml', () => {
  it('parses media dimensions', () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<EuroPlus.NiceLabel Type="Format">
  <Media Type="FormatMedia">
    <Width>10160</Width>
    <Height>5080</Height>
  </Media>
  <DocumentDesigns>
    <DocumentDesign Type="FormatDocumentDesign">
      <Items></Items>
    </DocumentDesign>
  </DocumentDesigns>
</EuroPlus.NiceLabel>`;

    const result = parseFormatXml(xml);
    expect(result.media.widthMicrons).toBe(10160);
    expect(result.media.heightMicrons).toBe(5080);
  });

  it('parses text and barcode items', () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<EuroPlus.NiceLabel Type="Format">
  <Media Type="FormatMedia">
    <Width>10160</Width>
    <Height>10160</Height>
  </Media>
  <DocumentDesigns>
    <DocumentDesign Type="FormatDocumentDesign">
      <Items>
        <Item Type="TextDocumentItem">
          <Name>Title</Name>
          <TextType>2</TextType>
          <FontDescriptor Type="FontDescriptor">
            <Name>Arial</Name>
            <Height>14</Height>
            <LogFontWrapper Type="LogFontWrapper">
              <Height>-58</Height>
              <Weight>700</Weight>
            </LogFontWrapper>
          </FontDescriptor>
          <Geometry Type="RectGeometry">
            <Width>5080</Width>
            <Height>2540</Height>
            <Left>1270</Left>
            <Top>635</Top>
          </Geometry>
          <FixedContents>Hello</FixedContents>
          <TextBoxAlignment>2</TextBoxAlignment>
          <ZOrder>10001</ZOrder>
        </Item>
        <Item Type="BarcodeDocumentItem">
          <Name>SN Barcode</Name>
          <Geometry Type="PositionGeometry">
            <X>1270</X>
            <Y>5080</Y>
          </Geometry>
          <BarcodeData Type="Code128BarcodeData">
            <ModuleHeight>3810</ModuleHeight>
          </BarcodeData>
          <FixedContents>ABC123</FixedContents>
          <DataSourceReference Type="SolutionDataSourceReference">
            <Id>ref-id-1</Id>
          </DataSourceReference>
          <ZOrder>10002</ZOrder>
        </Item>
      </Items>
    </DocumentDesign>
  </DocumentDesigns>
</EuroPlus.NiceLabel>`;

    const result = parseFormatXml(xml);
    expect(result.textItems).toHaveLength(1);
    expect(result.barcodeItems).toHaveLength(1);

    const text = result.textItems[0];
    expect(text.name).toBe('Title');
    expect(text.left).toBe(1270);
    expect(text.top).toBe(635);
    expect(text.width).toBe(5080);
    expect(text.height).toBe(2540);
    expect(text.content).toBe('Hello');
    expect(text.fontPointSize).toBe(14);
    expect(text.textType).toBe(2);
    expect(text.fontWeight).toBe(700);
    expect(text.justification).toBe(2);
    expect(text.zOrder).toBe(10001);

    const barcode = result.barcodeItems[0];
    expect(barcode.name).toBe('SN Barcode');
    expect(barcode.x).toBe(1270);
    expect(barcode.y).toBe(5080);
    expect(barcode.barcodeType).toBe('Code128BarcodeData');
    expect(barcode.moduleHeight).toBe(3810);
    expect(barcode.content).toBe('ABC123');
    expect(barcode.showText).toBe(false); // HumanInterpretationPosition=0
    expect(barcode.dataSourceId).toBe('ref-id-1');
    expect(barcode.zOrder).toBe(10002);
  });
});
