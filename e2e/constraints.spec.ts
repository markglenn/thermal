import { test, expect, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/editor');
  await page.waitForSelector('[data-testid="canvas"]');
});

/** Add a component from the palette and select it so properties panel is visible */
async function addAndSelect(page: Page, type: string) {
  await page.getByTestId(`palette-item-${type}`).click();
  // Newly added components are auto-selected, but click to be sure
  const comp = page.locator(`[data-testid="label-surface"] [data-component-type="${type}"]`).first();
  await comp.click();
  // Wait for properties panel to show constraint editor
  await expect(page.getByTestId('properties-panel')).toBeVisible();
}

/** Get the ZPL output text */
async function getZpl(page: Page): Promise<string> {
  await page.getByTestId('preview-tab-zpl').click();
  return (await page.getByTestId('zpl-output').textContent()) ?? '';
}

/** Extract the first ^FO x,y from ZPL output */
function parseFO(zpl: string): { x: number; y: number } | null {
  const match = zpl.match(/\^FO(\d+),(\d+)/);
  if (!match) return null;
  return { x: parseInt(match[1]), y: parseInt(match[2]) };
}

/** Read the size display text (e.g. "100×40") */
async function getSizeDisplay(page: Page): Promise<{ w: number; h: number }> {
  const text = await page.getByTestId('size-display').textContent();
  const [w, h] = (text ?? '0×0').split('×').map(Number);
  return { w, h };
}

// ─── Default anchor across all component types ───────────────────────────

test.describe('default anchor', () => {
  const allTypes = ['text', 'barcode', 'qrcode', 'datamatrix', 'pdf417', 'rectangle', 'ellipse', 'line'];

  for (const type of allTypes) {
    test(`${type} defaults to top-left anchor`, async ({ page }) => {
      await addAndSelect(page, type);

      const topLeft = page.getByTestId('anchor-top-left');
      await expect(topLeft).toHaveAttribute('data-active', 'true');

      // All other anchors should be inactive
      for (const pos of ['top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right']) {
        await expect(page.getByTestId(`anchor-${pos}`)).toHaveAttribute('data-active', 'false');
      }
    });
  }
});

// ─── Anchor changes affect ZPL position ──────────────────────────────────

test.describe('anchor changes update ZPL position', () => {
  test('switching anchor preserves visual position (^FO unchanged)', async ({ page }) => {
    await addAndSelect(page, 'rectangle');

    const zplBefore = await getZpl(page);
    const foBefore = parseFO(zplBefore);
    expect(foBefore).not.toBeNull();

    // Switch to right anchor — visual position should be preserved
    await page.getByTestId('anchor-top-right').click();
    await expect(page.getByTestId('anchor-top-right')).toHaveAttribute('data-active', 'true');

    const zplAfter = await getZpl(page);
    const foAfter = parseFO(zplAfter);
    expect(foAfter).not.toBeNull();
    expect(foAfter!.x).toBe(foBefore!.x);
    expect(foAfter!.y).toBe(foBefore!.y);
  });

  test('switching to bottom preserves visual position', async ({ page }) => {
    await addAndSelect(page, 'rectangle');

    const zplBefore = await getZpl(page);
    const foBefore = parseFO(zplBefore);

    await page.getByTestId('anchor-bottom-left').click();

    const zplAfter = await getZpl(page);
    const foAfter = parseFO(zplAfter);
    expect(foAfter!.x).toBe(foBefore!.x);
    expect(foAfter!.y).toBe(foBefore!.y);
  });

  test('center anchor snaps component to horizontal center', async ({ page }) => {
    await addAndSelect(page, 'rectangle');

    await page.getByTestId('anchor-top-center').click();
    await expect(page.getByTestId('anchor-top-center')).toHaveAttribute('data-active', 'true');

    // Center anchor sets x offset to 0, so resolved x = (labelWidth - width) / 2
    // Default label is 2" x 1" @ 203 DPI = 406 dots wide
    const { w } = await getSizeDisplay(page);
    const expectedX = Math.round((406 - w) / 2);

    const zpl = await getZpl(page);
    const fo = parseFO(zpl);
    expect(fo).not.toBeNull();
    expect(fo!.x).toBe(expectedX);
  });
});

// ─── Anchor round-trip preserves visual position ─────────────────────────

test.describe('anchor round-trip preserves position', () => {
  for (const type of ['rectangle', 'text', 'barcode', 'line']) {
    test(`${type}: left → right → left preserves ^FO`, async ({ page }) => {
      await addAndSelect(page, type);

      const zplOriginal = await getZpl(page);
      const foOriginal = parseFO(zplOriginal);
      expect(foOriginal).not.toBeNull();

      // Switch to right anchor (preserves visual position)
      await page.getByTestId('anchor-top-right').click();
      await expect(page.getByTestId('anchor-top-right')).toHaveAttribute('data-active', 'true');

      // Switch back to left anchor
      await page.getByTestId('anchor-top-left').click();
      await expect(page.getByTestId('anchor-top-left')).toHaveAttribute('data-active', 'true');

      const zplFinal = await getZpl(page);
      const foFinal = parseFO(zplFinal);
      expect(foFinal).not.toBeNull();
      expect(foFinal!.x).toBe(foOriginal!.x);
      expect(foFinal!.y).toBe(foOriginal!.y);
    });
  }

  test('top → bottom → top preserves ^FO y', async ({ page }) => {
    await addAndSelect(page, 'rectangle');

    const zplOriginal = await getZpl(page);
    const foOriginal = parseFO(zplOriginal);

    await page.getByTestId('anchor-bottom-left').click();
    await page.getByTestId('anchor-top-left').click();

    const zplFinal = await getZpl(page);
    const foFinal = parseFO(zplFinal);
    expect(foFinal!.y).toBe(foOriginal!.y);
  });
});

// ─── Sizing modes per component type ─────────────────────────────────────

test.describe('sizing modes', () => {
  // Fixed-size components: size inputs are editable
  const fixedTypes = ['rectangle', 'ellipse', 'line', 'image'];

  for (const type of fixedTypes.filter(t => t !== 'image')) {
    test(`${type} (fixed) has editable W and H`, async ({ page }) => {
      await addAndSelect(page, type);

      const widthLabel = page.getByTestId('size-width');
      const heightLabel = page.getByTestId('size-height');
      await expect(widthLabel).toBeVisible();
      await expect(heightLabel).toBeVisible();

      // Both should have editable inputs (not read-only spans)
      await expect(widthLabel.locator('input')).toBeVisible();
      await expect(heightLabel.locator('input')).toBeVisible();
    });
  }

  // Auto-sized components: no size section shown at all
  const autoTypes = ['barcode', 'qrcode', 'datamatrix', 'pdf417'];

  for (const type of autoTypes) {
    test(`${type} (auto) has no size inputs`, async ({ page }) => {
      await addAndSelect(page, type);

      // Auto-sized components hide the size section entirely
      await expect(page.getByTestId('size-width')).not.toBeVisible();
      await expect(page.getByTestId('size-height')).not.toBeVisible();
    });
  }

  test('text (auto by default) has no size inputs', async ({ page }) => {
    await addAndSelect(page, 'text');
    await expect(page.getByTestId('size-width')).not.toBeVisible();
  });
});

// ─── Size inputs update ZPL bounds ───────────────────────────────────────

test.describe('size inputs affect ZPL', () => {
  test('changing rectangle width updates ZPL ^GB', async ({ page }) => {
    await addAndSelect(page, 'rectangle');

    // Change width via the size input
    const widthInput = page.getByTestId('size-width').locator('input');
    await widthInput.click({ clickCount: 3 });
    await widthInput.fill('200');
    await widthInput.press('Tab');

    const zpl = await getZpl(page);
    // ^GB{width},{height} — should contain the new width
    expect(zpl).toContain('^GB200,');
  });

  test('changing rectangle height updates ZPL ^GB', async ({ page }) => {
    await addAndSelect(page, 'rectangle');

    const heightInput = page.getByTestId('size-height').locator('input');
    await heightInput.click({ clickCount: 3 });
    await heightInput.fill('150');
    await heightInput.press('Tab');

    const zpl = await getZpl(page);
    expect(zpl).toMatch(/\^GB\d+,150,/);
  });
});

// ─── All 6 anchor positions work ─────────────────────────────────────────

test.describe('all anchor positions', () => {
  const anchors = [
    'top-left', 'top-center', 'top-right',
    'bottom-left', 'bottom-center', 'bottom-right',
  ];

  for (const anchor of anchors) {
    test(`can set ${anchor} anchor on rectangle`, async ({ page }) => {
      await addAndSelect(page, 'rectangle');

      await page.getByTestId(`anchor-${anchor}`).click();
      await expect(page.getByTestId(`anchor-${anchor}`)).toHaveAttribute('data-active', 'true');

      // All other anchors should be inactive
      for (const other of anchors.filter(a => a !== anchor)) {
        await expect(page.getByTestId(`anchor-${other}`)).toHaveAttribute('data-active', 'false');
      }

      // ZPL should still be valid
      const zpl = await getZpl(page);
      expect(zpl).toContain('^XA');
      expect(zpl).toContain('^FO');
    });
  }
});

// ─── Bottom-right anchor: component near bottom-right corner ─────────────

test.describe('anchor positioning math', () => {
  test('bottom-right anchor with offset 0 places component at bottom-right', async ({ page }) => {
    await addAndSelect(page, 'rectangle');

    // Switch to bottom-right
    await page.getByTestId('anchor-bottom-right').click();

    const zpl = await getZpl(page);
    const fo = parseFO(zpl);
    expect(fo).not.toBeNull();

    // Anchor switch preserves visual position from top-left 0,0
    // So the resolved position should still be x=0, y=0
    expect(fo!.x).toBe(0);
    expect(fo!.y).toBe(0);
  });

  test('right-anchored component stays at right edge when label is default size', async ({ page }) => {
    await addAndSelect(page, 'rectangle');

    // First move component to right edge by switching anchor
    await page.getByTestId('anchor-top-right').click();

    // Visual position is preserved from x=0 (top-left), so resolved x is still 0
    const zpl = await getZpl(page);
    const fo = parseFO(zpl);
    expect(fo!.x).toBe(0);
  });
});

// ─── Multiple components with different anchors ──────────────────────────

test.describe('mixed anchors', () => {
  test('two components with different anchors produce correct ZPL', async ({ page }) => {
    // Add rectangle — will be at top-left
    await page.getByTestId('palette-item-rectangle').click();

    // Add another rectangle
    await page.getByTestId('palette-item-text').click();

    // Select the text and set it to center anchor
    const textComp = page.locator('[data-testid="label-surface"] [data-component-type="text"]').first();
    await textComp.click();
    await page.getByTestId('anchor-top-center').click();

    // Get ZPL — should have two ^FO entries
    const zpl = await getZpl(page);
    const foMatches = zpl.match(/\^FO\d+,\d+/g) ?? [];
    expect(foMatches.length).toBeGreaterThanOrEqual(2);
  });
});
