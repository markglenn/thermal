import type { TextProperties } from '@/lib/types';

/**
 * Compute the size of a text component purely from its properties.
 * No DOM measurement — deterministic from props alone.
 */
export function computeTextSize(
  props: TextProperties,
  constraintWidth?: number,
): { width: number; height: number } {
  const { content, fontWidth, fontSize, rotation, fieldBlock } = props;

  let width: number;
  let height: number;

  if (fieldBlock && constraintWidth !== undefined) {
    // Multi-line text with field block: word-wrap simulation
    width = constraintWidth;
    const charsPerLine = Math.max(1, Math.floor(constraintWidth / fontWidth));
    const lineCount = computeLineCount(content, charsPerLine, fieldBlock.maxLines);
    height = lineCount * (fontSize + fieldBlock.lineSpacing);
  } else {
    // Single-line text
    if (content.length === 0) {
      return { width: 0, height: fontSize };
    }
    width = content.length * fontWidth;
    height = fontSize;
  }

  // Rotation 90/270 swaps dimensions
  if (rotation === 90 || rotation === 270) {
    return { width: height, height: width };
  }

  return { width, height };
}

/**
 * Simulate ZPL word wrap to count lines.
 * Splits on explicit newlines (\n), then wraps each paragraph by words.
 * Words longer than a full line are broken across lines.
 */
function computeLineCount(
  content: string,
  charsPerLine: number,
  maxLines: number,
): number {
  if (content.length === 0) {
    return 1;
  }

  const paragraphs = content.split('\n');
  let totalLines = 0;

  for (const paragraph of paragraphs) {
    if (paragraph.length === 0) {
      totalLines += 1;
      continue;
    }

    const words = paragraph.split(' ');
    let currentLineLength = 0;
    let linesInParagraph = 1;

    for (const word of words) {
      if (word.length === 0) {
        // Consecutive spaces: just add a space to current line
        if (currentLineLength > 0) {
          currentLineLength += 1;
        }
        continue;
      }

      if (currentLineLength === 0) {
        // Start of a new line — place the word (breaking if needed)
        if (word.length <= charsPerLine) {
          currentLineLength = word.length;
        } else {
          // Break long word across multiple lines
          const extraLines = Math.ceil(word.length / charsPerLine) - 1;
          linesInParagraph += extraLines;
          currentLineLength = word.length % charsPerLine || charsPerLine;
        }
      } else if (currentLineLength + 1 + word.length <= charsPerLine) {
        // Word fits on current line (with space separator)
        currentLineLength += 1 + word.length;
      } else {
        // Word doesn't fit — wrap to next line
        linesInParagraph += 1;
        if (word.length <= charsPerLine) {
          currentLineLength = word.length;
        } else {
          const extraLines = Math.ceil(word.length / charsPerLine) - 1;
          linesInParagraph += extraLines;
          currentLineLength = word.length % charsPerLine || charsPerLine;
        }
      }
    }

    totalLines += linesInParagraph;
  }

  // Clamp to maxLines if set
  if (maxLines > 0 && totalLines > maxLines) {
    return maxLines;
  }

  return totalLines;
}
