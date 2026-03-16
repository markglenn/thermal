/**
 * Convert an image to monochrome bitmap data suitable for ZPL ^GFA commands.
 */

export interface MonochromeResult {
  hex: string;
  bytesPerRow: number;
  width: number;
  height: number;
}

function getPixelData(
  base64: string,
  width: number,
  height: number
): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(ctx.getImageData(0, 0, width, height));
    };
    img.onerror = reject;
    img.src = base64;
  });
}

function grayscale(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function applyThreshold(
  imageData: ImageData,
  threshold: number,
  invert: boolean
): boolean[] {
  const { data, width, height } = imageData;
  const pixels = new Array<boolean>(width * height);

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const alpha = data[idx + 3];
    // Treat transparent pixels as white
    const gray =
      alpha < 128 ? 255 : grayscale(data[idx], data[idx + 1], data[idx + 2]);
    // true = black dot (printed), false = white (no print)
    let isBlack = gray < threshold;
    if (invert) isBlack = !isBlack;
    pixels[i] = isBlack;
  }

  return pixels;
}

function applyFloydSteinberg(
  imageData: ImageData,
  threshold: number,
  invert: boolean
): boolean[] {
  const { data, width, height } = imageData;
  const errors = new Float32Array(width * height);

  // Initialize with grayscale values
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const alpha = data[idx + 3];
    errors[i] =
      alpha < 128 ? 255 : grayscale(data[idx], data[idx + 1], data[idx + 2]);
  }

  const pixels = new Array<boolean>(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const oldVal = errors[i];
      const newVal = oldVal < threshold ? 0 : 255;
      let isBlack = newVal === 0;
      if (invert) isBlack = !isBlack;
      pixels[i] = isBlack;

      const err = oldVal - newVal;
      if (x + 1 < width) errors[i + 1] += err * (7 / 16);
      if (y + 1 < height) {
        if (x - 1 >= 0) errors[i + width - 1] += err * (3 / 16);
        errors[i + width] += err * (5 / 16);
        if (x + 1 < width) errors[i + width + 1] += err * (1 / 16);
      }
    }
  }

  return pixels;
}

function pixelsToHex(pixels: boolean[], width: number, height: number): { hex: string; bytesPerRow: number } {
  // ZPL requires rows to be byte-aligned
  const bytesPerRow = Math.ceil(width / 8);
  let hex = '';

  for (let y = 0; y < height; y++) {
    for (let byteIdx = 0; byteIdx < bytesPerRow; byteIdx++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const x = byteIdx * 8 + bit;
        // In ZPL ^GF, 1 = black (printed), 0 = white
        if (x < width && pixels[y * width + x]) {
          byte |= 0x80 >> bit;
        }
      }
      hex += byte.toString(16).toUpperCase().padStart(2, '0');
    }
  }

  return { hex, bytesPerRow };
}

export async function convertImageToMonochrome(
  base64: string,
  width: number,
  height: number,
  threshold: number,
  invert: boolean,
  method: 'threshold' | 'dither'
): Promise<MonochromeResult> {
  const imageData = await getPixelData(base64, width, height);

  const pixels =
    method === 'dither'
      ? applyFloydSteinberg(imageData, threshold, invert)
      : applyThreshold(imageData, threshold, invert);

  const { hex, bytesPerRow } = pixelsToHex(pixels, width, height);

  return { hex, bytesPerRow, width, height };
}

/**
 * Generate a monochrome preview as a data URI for display purposes.
 */
export async function generateMonochromePreview(
  base64: string,
  width: number,
  height: number,
  threshold: number,
  invert: boolean,
  method: 'threshold' | 'dither'
): Promise<string> {
  const imageData = await getPixelData(base64, width, height);

  const pixels =
    method === 'dither'
      ? applyFloydSteinberg(imageData, threshold, invert)
      : applyThreshold(imageData, threshold, invert);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const output = ctx.createImageData(width, height);

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    if (pixels[i]) {
      // Black pixel (printed)
      output.data[idx] = 0;
      output.data[idx + 1] = 0;
      output.data[idx + 2] = 0;
      output.data[idx + 3] = 255;
    } else {
      // White pixel = transparent (not printed)
      output.data[idx] = 0;
      output.data[idx + 1] = 0;
      output.data[idx + 2] = 0;
      output.data[idx + 3] = 0;
    }
  }

  ctx.putImageData(output, 0, 0);
  return canvas.toDataURL('image/png');
}
