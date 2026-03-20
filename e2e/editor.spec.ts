import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/editor');
  await page.waitForSelector('[data-testid="canvas"]');
});

test.describe('editor loads', () => {
  test('renders canvas, palette, and properties panel', async ({ page }) => {
    await expect(page.getByTestId('canvas')).toBeVisible();
    await expect(page.getByTestId('layer-hierarchy')).toBeVisible();
    await expect(page.getByTestId('properties-panel')).toBeVisible();
    await expect(page.getByTestId('toolbar')).toBeVisible();
    await expect(page.getByTestId('tab-bar')).toBeVisible();
  });

  test('starts with no components', async ({ page }) => {
    await expect(page.getByTestId('layers-empty')).toBeVisible();
    await expect(page.getByTestId('layers-empty')).toHaveText('No components');
  });

  test('shows zoom indicator', async ({ page }) => {
    await expect(page.getByTestId('zoom-indicator')).toBeVisible();
    await expect(page.getByTestId('zoom-indicator')).toContainText('%');
  });
});

test.describe('palette: add components', () => {
  const componentTypes = [
    'text', 'barcode', 'qrcode', 'datamatrix', 'pdf417',
    'rectangle', 'ellipse', 'line',
  ];

  for (const type of componentTypes) {
    test(`adds ${type} from palette`, async ({ page }) => {
      await page.getByTestId(`palette-item-${type}`).click();

      // Component appears on canvas
      await expect(page.locator(`[data-component-type="${type}"]`).first()).toBeVisible();

      // Layer appears in hierarchy
      await expect(page.getByTestId('layers-empty')).not.toBeVisible();
    });
  }

  test('adds multiple components', async ({ page }) => {
    await page.getByTestId('palette-item-text').click();
    await page.getByTestId('palette-item-rectangle').click();
    await page.getByTestId('palette-item-barcode').click();

    const layers = page.locator('[data-testid^="layer-item-"]');
    await expect(layers).toHaveCount(3);
  });
});

test.describe('selection', () => {
  test('clicking a component selects it', async ({ page }) => {
    await page.getByTestId('palette-item-rectangle').click();

    // Click the component on the canvas
    const comp = page.locator('[data-component-type="rectangle"]').first();
    await comp.click();

    // Selection overlay appears
    const overlay = page.locator('[data-testid^="selection-overlay-"]');
    await expect(overlay).toHaveCount(1);
  });

  test('selecting a component shows its properties', async ({ page }) => {
    await page.getByTestId('palette-item-text').click();

    const comp = page.locator('[data-component-type="text"]').first();
    await comp.click();

    // Properties panel should no longer show empty message
    await expect(page.getByTestId('properties-empty')).not.toBeVisible();
  });

  test('clicking canvas background deselects', async ({ page }) => {
    await page.getByTestId('palette-item-rectangle').click();

    // Click the canvas background (outside the label surface) to deselect
    await page.getByTestId('canvas').click({ position: { x: 5, y: 5 } });

    // Selection overlay should disappear
    await expect(page.locator('[data-testid^="selection-overlay-"]')).toHaveCount(0);
  });
});

test.describe('delete component', () => {
  test('delete key removes selected component', async ({ page }) => {
    await page.getByTestId('palette-item-rectangle').click();

    const comp = page.locator('[data-component-type="rectangle"]').first();
    await comp.click();

    await page.getByTestId('canvas').press('Delete');

    await expect(page.getByTestId('layers-empty')).toBeVisible();
    await expect(page.locator('[data-component-type="rectangle"]')).toHaveCount(0);
  });
});

test.describe('undo/redo', () => {
  test('undo reverses add, redo restores', async ({ page }) => {
    await page.getByTestId('palette-item-text').click();
    await expect(page.locator('[data-testid^="layer-item-"]')).toHaveCount(1);

    // Undo
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.getByTestId('canvas').press(`${modifier}+z`);
    await expect(page.getByTestId('layers-empty')).toBeVisible();

    // Redo
    await page.getByTestId('canvas').press(`${modifier}+Shift+z`);
    await expect(page.locator('[data-testid^="layer-item-"]')).toHaveCount(1);
  });
});

test.describe('ZPL output', () => {
  test('shows ZPL after adding a component', async ({ page }) => {
    await page.getByTestId('palette-item-text').click();

    // Switch to ZPL tab
    await page.getByTestId('preview-tab-zpl').click();

    const zplOutput = page.getByTestId('zpl-output');
    await expect(zplOutput).toBeVisible();
    await expect(zplOutput).toContainText('^XA');
    await expect(zplOutput).toContainText('^XZ');
    await expect(zplOutput).toContainText('^FO');
    await expect(zplOutput).toContainText('^FD');
  });

  test('empty document produces minimal ZPL', async ({ page }) => {
    await page.getByTestId('preview-tab-zpl').click();

    const zplOutput = page.getByTestId('zpl-output');
    await expect(zplOutput).toContainText('^XA');
    await expect(zplOutput).toContainText('^XZ');
    // No field data in empty document
    await expect(zplOutput).not.toContainText('^FD');
  });
});

test.describe('tabs', () => {
  test('starts with one tab', async ({ page }) => {
    const tabs = page.locator('[data-testid^="editor-tab-"]');
    await expect(tabs).toHaveCount(1);
  });

  test('new tab button creates a second tab', async ({ page }) => {
    await page.getByTestId('new-tab-button').click();

    const tabs = page.locator('[data-testid^="editor-tab-"]');
    await expect(tabs).toHaveCount(2);
  });

  test('tabs have independent state', async ({ page }) => {
    // Add a component in the first tab
    await page.getByTestId('palette-item-text').click();
    await expect(page.locator('[data-testid^="layer-item-"]')).toHaveCount(1);

    // Create a new tab
    await page.getByTestId('new-tab-button').click();

    // New tab should be empty
    await expect(page.getByTestId('layers-empty')).toBeVisible();

    // Switch back to first tab
    const tabs = page.locator('[data-testid^="editor-tab-"]');
    await tabs.first().click();

    // First tab still has its component
    await expect(page.getByTestId('layers-empty')).not.toBeVisible();
    await expect(page.locator('[data-testid^="layer-item-"]')).toHaveCount(1);
  });
});
