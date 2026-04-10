import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
// Register all component types for ZPL generation
import '@/lib/components';

// ---- Mocks ----------------------------------------------------------------

const mockPublishPrintJob = vi.fn();
vi.mock('@/lib/print/sqs', () => ({
  publishPrintJob: (...args: unknown[]) => mockPublishPrintJob(...args),
}));

const mockFindLabel = vi.fn();
const mockFindPublishedOrLatestVersion = vi.fn();
const mockFindVersion = vi.fn();
const mockDbInsert = vi.fn().mockReturnValue({ values: vi.fn() });
const mockGetDatabase = vi.fn().mockResolvedValue({
  db: { insert: mockDbInsert },
  tables: { printJobs: 'printJobs' },
});

vi.mock('@/lib/server/labels', () => ({
  findLabel: (...args: unknown[]) => mockFindLabel(...args),
  findPublishedOrLatestVersion: (...args: unknown[]) => mockFindPublishedOrLatestVersion(...args),
  findVersion: (...args: unknown[]) => mockFindVersion(...args),
  getDatabase: () => mockGetDatabase(),
}));

// ---- Helpers --------------------------------------------------------------

import type { LabelDocument, LabelComponent, ComponentLayout } from '@/lib/types';

function makeLayout(overrides: Partial<ComponentLayout> = {}): ComponentLayout {
  return {
    x: 0, y: 0, width: 100, height: 40,
    horizontalAnchor: 'left', verticalAnchor: 'top',
    ...overrides,
  };
}

function makeDoc(components: LabelComponent[], dpi: 203 | 300 | 600 = 203): LabelDocument {
  const widthDots = dpi === 203 ? 812 : dpi === 300 ? 1200 : 2400;
  const heightDots = dpi === 203 ? 1218 : dpi === 300 ? 1800 : 3600;
  return {
    version: 1,
    label: { dpi, variants: [{ name: 'Default', widthDots, heightDots, unit: 'in' as const }] },
    components,
  };
}

function makeTextComponent(id: string, name: string, fieldBinding?: string): LabelComponent {
  return {
    id,
    name,
    layout: makeLayout({ width: 200, height: 30 }),
    ...(fieldBinding ? { fieldBinding } : {}),
    typeData: {
      type: 'text',
      props: { content: 'placeholder', font: '0', fontSize: 30, fontWidth: 12, rotation: 0 },
    },
  };
}

function postRequest(
  body: unknown,
  labelId = 'label-1',
  query = ''
): NextRequest {
  return new NextRequest(
    new URL(`http://localhost/api/labels/${labelId}/print${query}`),
    { method: 'POST', body: JSON.stringify(body) }
  );
}

async function callRoute(req: NextRequest, id = 'label-1') {
  const { POST } = await import('./route');
  return POST(req, { params: Promise.resolve({ id }) });
}

// ---- Tests ----------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockPublishPrintJob.mockResolvedValue(undefined);
});

describe('POST /api/labels/[id]/print', () => {
  describe('request validation', () => {
    it('rejects invalid JSON', async () => {
      const req = new NextRequest(
        new URL('http://localhost/api/labels/label-1/print'),
        { method: 'POST', body: 'not json{' }
      );
      const res = await callRoute(req);
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: 'Invalid JSON' });
    });

    it('rejects request with missing data array', async () => {
      const res = await callRoute(postRequest({ printer: 'zd421' }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Invalid print request');
    });

    it('rejects request with empty data array', async () => {
      const res = await callRoute(postRequest({ data: [] }));
      expect(res.status).toBe(400);
    });
  });

  describe('label/version lookup', () => {
    it('returns 404 when label not found', async () => {
      mockFindLabel.mockResolvedValue(null);
      const res = await callRoute(postRequest({ data: [{}] }));
      expect(res.status).toBe(404);
      expect(await res.json()).toMatchObject({ error: 'Label not found' });
    });

    it('returns 404 when no versions exist', async () => {
      mockFindLabel.mockResolvedValue({ id: 'label-1', name: 'Test' });
      mockFindPublishedOrLatestVersion.mockResolvedValue(null);
      const res = await callRoute(postRequest({ data: [{}] }));
      expect(res.status).toBe(404);
      expect(await res.json()).toMatchObject({ error: 'No versions found' });
    });

    it('returns 404 when specific version not found', async () => {
      mockFindLabel.mockResolvedValue({ id: 'label-1', name: 'Test' });
      mockFindVersion.mockResolvedValue(null);
      const res = await callRoute(postRequest({ data: [{}] }, 'label-1', '?version=99'));
      expect(res.status).toBe(404);
      expect(await res.json()).toMatchObject({ error: 'Version not found' });
    });

    it('returns 400 for invalid version number', async () => {
      mockFindLabel.mockResolvedValue({ id: 'label-1', name: 'Test' });
      const res = await callRoute(postRequest({ data: [{}] }, 'label-1', '?version=abc'));
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: 'Invalid version number' });
    });

    it('returns 500 for corrupt stored document', async () => {
      mockFindLabel.mockResolvedValue({ id: 'label-1', name: 'Test' });
      mockFindPublishedOrLatestVersion.mockResolvedValue({ version: 1, document: { bad: true } });
      const res = await callRoute(postRequest({ data: [{}] }));
      expect(res.status).toBe(500);
      expect(await res.json()).toMatchObject({ error: 'Stored document is corrupt or incompatible' });
    });
  });

  describe('no-printer path — returns raw ZPL', () => {
    it('returns ZPL as text/plain when no printer specified', async () => {
      const doc = makeDoc([makeTextComponent('t1', 'Title')]);
      mockFindLabel.mockResolvedValue({ id: 'label-1', name: 'Shipping' });
      mockFindPublishedOrLatestVersion.mockResolvedValue({ version: 1, document: doc });

      const res = await callRoute(postRequest({ data: [{}] }));
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('text/plain');

      const zpl = await res.text();
      expect(zpl).toContain('^XA');
      expect(zpl).toContain('^XZ');
      expect(mockPublishPrintJob).not.toHaveBeenCalled();
    });

    it('substitutes field data into ZPL output', async () => {
      const doc = makeDoc([makeTextComponent('t1', 'Name', 'name')]);
      mockFindLabel.mockResolvedValue({ id: 'label-1', name: 'Shipping' });
      mockFindPublishedOrLatestVersion.mockResolvedValue({ version: 1, document: doc });

      const res = await callRoute(postRequest({ data: [{ name: 'Alice' }] }));
      const zpl = await res.text();
      expect(zpl).toContain('Alice');
      expect(zpl).not.toContain('placeholder');
    });

    it('generates one ZPL block per data row', async () => {
      const doc = makeDoc([makeTextComponent('t1', 'Name', 'name')]);
      mockFindLabel.mockResolvedValue({ id: 'label-1', name: 'Shipping' });
      mockFindPublishedOrLatestVersion.mockResolvedValue({ version: 1, document: doc });

      const res = await callRoute(postRequest({ data: [{ name: 'Alice' }, { name: 'Bob' }] }));
      const zpl = await res.text();
      expect(zpl).toContain('Alice');
      expect(zpl).toContain('Bob');
      // Two labels = two XA/XZ blocks
      expect(zpl.match(/\^XA/g)?.length).toBe(2);
    });
  });

  describe('printer path — publishes to SQS', () => {
    it('publishes print job and returns 202', async () => {
      const doc = makeDoc([makeTextComponent('t1', 'Title')]);
      mockFindLabel.mockResolvedValue({ id: 'label-1', name: 'Shipping' });
      mockFindPublishedOrLatestVersion.mockResolvedValue({ version: 3, document: doc });

      const res = await callRoute(postRequest({ data: [{}], printer: 'zd421', copies: 2 }));
      expect(res.status).toBe(202);

      const json = await res.json();
      expect(json.status).toBe('queued');
      expect(json.printer).toBe('zd421');
      expect(json.jobId).toBeDefined();

      expect(mockPublishPrintJob).toHaveBeenCalledOnce();
    });

    it('passes contentType as application/vnd.zebra.zpl', async () => {
      const doc = makeDoc([makeTextComponent('t1', 'Title')]);
      mockFindLabel.mockResolvedValue({ id: 'label-1', name: 'Shipping' });
      mockFindPublishedOrLatestVersion.mockResolvedValue({ version: 1, document: doc });

      await callRoute(postRequest({ data: [{}], printer: 'zd421' }));

      const [, , , , contentType] = mockPublishPrintJob.mock.calls[0];
      expect(contentType).toBe('application/vnd.zebra.zpl');
    });

    it('computes labelSize from dots and dpi (203 DPI)', async () => {
      // 812 x 1218 dots at 203 DPI = 4x6 inches
      const doc = makeDoc([makeTextComponent('t1', 'Title')], 203);
      mockFindLabel.mockResolvedValue({ id: 'label-1', name: 'Shipping' });
      mockFindPublishedOrLatestVersion.mockResolvedValue({ version: 1, document: doc });

      await callRoute(postRequest({ data: [{}], printer: 'zd421' }));

      const metadata = mockPublishPrintJob.mock.calls[0][5];
      expect(metadata.labelSize).toBe('4x6');
      expect(metadata.dpmm).toBe('8dpmm');
    });

    it('computes correct dpmm for 300 DPI', async () => {
      const doc = makeDoc([makeTextComponent('t1', 'Title')], 300);
      mockFindLabel.mockResolvedValue({ id: 'label-1', name: 'Shipping' });
      mockFindPublishedOrLatestVersion.mockResolvedValue({ version: 1, document: doc });

      await callRoute(postRequest({ data: [{}], printer: 'zd421' }));

      const metadata = mockPublishPrintJob.mock.calls[0][5];
      expect(metadata.labelSize).toBe('4x6');
      expect(metadata.dpmm).toBe('12dpmm');
    });

    it('computes correct dpmm for 600 DPI', async () => {
      const doc = makeDoc([makeTextComponent('t1', 'Title')], 600);
      mockFindLabel.mockResolvedValue({ id: 'label-1', name: 'Shipping' });
      mockFindPublishedOrLatestVersion.mockResolvedValue({ version: 1, document: doc });

      await callRoute(postRequest({ data: [{}], printer: 'zd421' }));

      const metadata = mockPublishPrintJob.mock.calls[0][5];
      expect(metadata.labelSize).toBe('4x6');
      expect(metadata.dpmm).toBe('24dpmm');
    });

    it('passes label metadata through to SQS', async () => {
      const doc = makeDoc([makeTextComponent('t1', 'Title')]);
      mockFindLabel.mockResolvedValue({ id: 'label-1', name: 'Shipping Label' });
      mockFindPublishedOrLatestVersion.mockResolvedValue({ version: 5, document: doc });

      await callRoute(postRequest({ data: [{}], printer: 'zd421' }));

      const metadata = mockPublishPrintJob.mock.calls[0][5];
      expect(metadata.labelId).toBe('label-1');
      expect(metadata.labelVersion).toBe(5);
      expect(metadata.labelName).toBe('Shipping Label');
    });

    it('sends substituted ZPL data to publishPrintJob', async () => {
      const doc = makeDoc([makeTextComponent('t1', 'SKU', 'sku')]);
      mockFindLabel.mockResolvedValue({ id: 'label-1', name: 'Product' });
      mockFindPublishedOrLatestVersion.mockResolvedValue({ version: 1, document: doc });

      await callRoute(postRequest({ data: [{ sku: 'ABC-123' }], printer: 'zd421' }));

      const zplData = mockPublishPrintJob.mock.calls[0][1];
      expect(zplData).toContain('ABC-123');
      expect(zplData).not.toContain('placeholder');
    });

    it('records print job in the database', async () => {
      const doc = makeDoc([makeTextComponent('t1', 'Title')]);
      mockFindLabel.mockResolvedValue({ id: 'label-1', name: 'Shipping' });
      mockFindPublishedOrLatestVersion.mockResolvedValue({ version: 2, document: doc });

      await callRoute(postRequest({ data: [{}], printer: 'zd421', copies: 3 }));

      expect(mockDbInsert).toHaveBeenCalledWith('printJobs');
      const insertValues = mockDbInsert.mock.results[0].value.values;
      expect(insertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          labelId: 'label-1',
          labelVersion: 2,
          printer: 'zd421',
          status: 'queued',
          copies: 3,
          totalChunks: 1,
        })
      );
    });

    it('uses specific version when ?version param is provided', async () => {
      const doc = makeDoc([makeTextComponent('t1', 'Title')]);
      mockFindLabel.mockResolvedValue({ id: 'label-1', name: 'Test' });
      mockFindVersion.mockResolvedValue({ version: 7, document: doc });

      await callRoute(postRequest({ data: [{}], printer: 'zd421' }, 'label-1', '?version=7'));

      expect(mockFindVersion).toHaveBeenCalledWith('label-1', 7);
      expect(mockFindPublishedOrLatestVersion).not.toHaveBeenCalled();

      const metadata = mockPublishPrintJob.mock.calls[0][5];
      expect(metadata.labelVersion).toBe(7);
    });
  });
});
