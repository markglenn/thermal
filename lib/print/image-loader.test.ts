import { describe, it, expect, vi, beforeEach } from 'vitest';

const { convertMock } = vi.hoisted(() => ({ convertMock: vi.fn() }));

vi.mock('@/lib/components/image/convert-server', () => ({
  convertImageUrlToMonochrome: convertMock,
}));

beforeEach(() => {
  convertMock.mockReset();
});

function makeResult(tag: string) {
  return { bytesPerRow: 1, height: 1, hex: tag };
}

describe('createBatchImageLoader — dedupe', () => {
  it('calls the underlying converter once for identical URL + params', async () => {
    convertMock.mockResolvedValue(makeResult('A'));
    const { createBatchImageLoader } = await import('./image-loader');
    const loader = createBatchImageLoader(5);

    const [a, b, c] = await Promise.all([
      loader.convert('http://x/a.png', 10, 10, 128, false, 'threshold'),
      loader.convert('http://x/a.png', 10, 10, 128, false, 'threshold'),
      loader.convert('http://x/a.png', 10, 10, 128, false, 'threshold'),
    ]);

    expect(convertMock).toHaveBeenCalledTimes(1);
    expect(a.hex).toBe('A');
    expect(b.hex).toBe('A');
    expect(c.hex).toBe('A');
  });

  it('treats different params as cache misses', async () => {
    convertMock
      .mockResolvedValueOnce(makeResult('x1'))
      .mockResolvedValueOnce(makeResult('x2'))
      .mockResolvedValueOnce(makeResult('x3'));
    const { createBatchImageLoader } = await import('./image-loader');
    const loader = createBatchImageLoader(5);

    await loader.convert('http://x/a.png', 10, 10, 128, false, 'threshold');
    await loader.convert('http://x/a.png', 20, 10, 128, false, 'threshold'); // different width
    await loader.convert('http://x/a.png', 10, 10, 128, true,  'threshold'); // different invert

    expect(convertMock).toHaveBeenCalledTimes(3);
  });
});

describe('createBatchImageLoader — concurrency cap', () => {
  it('never runs more than `concurrency` conversions at once', async () => {
    let active = 0;
    let peak = 0;
    convertMock.mockImplementation(async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 15));
      active--;
      return makeResult('r');
    });

    const { createBatchImageLoader } = await import('./image-loader');
    const loader = createBatchImageLoader(3);

    // 20 distinct URLs so dedupe doesn't hide the test
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        loader.convert(`http://x/${i}.png`, 10, 10, 128, false, 'threshold'),
      ),
    );

    expect(convertMock).toHaveBeenCalledTimes(20);
    expect(peak).toBeLessThanOrEqual(3);
    expect(peak).toBeGreaterThan(0);
  });
});
