import { describe, it, expect } from 'vitest';
import { computeTextSize } from './compute-size';
import type { TextProperties } from '@/lib/types';

function makeTextProps(overrides: Partial<TextProperties> = {}): TextProperties {
  return {
    content: 'Hello',
    font: '0',
    fontSize: 30,
    fontWidth: 15,
    rotation: 0,
    ...overrides,
  };
}

describe('computeTextSize', () => {
  it('computes single-line text size', () => {
    const props = makeTextProps({ content: 'Hello', fontWidth: 15, fontSize: 30 });
    const size = computeTextSize(props);
    expect(size).toEqual({ width: 75, height: 30 }); // 5 chars * 15 = 75
  });

  it('returns zero width for empty content', () => {
    const props = makeTextProps({ content: '', fontSize: 30 });
    const size = computeTextSize(props);
    expect(size).toEqual({ width: 0, height: 30 });
  });

  it('computes multi-line text with fieldBlock (word wrap)', () => {
    // 10 chars per line, content = "Hello World" (11 chars)
    // "Hello" (5) fits on line 1, "World" (5) wraps to line 2
    const props = makeTextProps({
      content: 'Hello World',
      fontWidth: 10,
      fontSize: 20,
      fieldBlock: { maxLines: 0, lineSpacing: 0, justification: 'L' },
    });
    const size = computeTextSize(props, 100); // 100 / 10 = 10 chars per line
    expect(size).toEqual({ width: 100, height: 40 }); // 2 lines * (20 + 0) = 40
  });

  it('includes lineSpacing in multi-line height', () => {
    const props = makeTextProps({
      content: 'Hello World',
      fontWidth: 10,
      fontSize: 20,
      fieldBlock: { maxLines: 0, lineSpacing: 5, justification: 'L' },
    });
    const size = computeTextSize(props, 100);
    expect(size).toEqual({ width: 100, height: 50 }); // 2 lines * (20 + 5) = 50
  });

  it('swaps dimensions for rotation 90', () => {
    const props = makeTextProps({ content: 'Hi', fontWidth: 10, fontSize: 20, rotation: 90 });
    const size = computeTextSize(props);
    // Unrotated: width=20, height=20; rotated 90: swap
    expect(size).toEqual({ width: 20, height: 20 });
  });

  it('swaps dimensions for rotation 270', () => {
    const props = makeTextProps({ content: 'Hello', fontWidth: 10, fontSize: 20, rotation: 270 });
    const size = computeTextSize(props);
    // Unrotated: width=50, height=20; rotated 270: swap
    expect(size).toEqual({ width: 20, height: 50 });
  });

  it('does not swap dimensions for rotation 180', () => {
    const props = makeTextProps({ content: 'Hello', fontWidth: 10, fontSize: 20, rotation: 180 });
    const size = computeTextSize(props);
    expect(size).toEqual({ width: 50, height: 20 });
  });

  it('clamps lines to fieldBlock maxLines', () => {
    // Content that would wrap to 3 lines, but maxLines = 2
    const props = makeTextProps({
      content: 'one two three four five six',
      fontWidth: 10,
      fontSize: 20,
      fieldBlock: { maxLines: 2, lineSpacing: 0, justification: 'L' },
    });
    // 100 / 10 = 10 chars per line
    // "one two" (7) on line 1, "three four" (10) on line 2, "five six" would be line 3 → clamped
    const size = computeTextSize(props, 100);
    expect(size).toEqual({ width: 100, height: 40 }); // 2 * 20 = 40
  });

  it('handles explicit newlines in content', () => {
    const props = makeTextProps({
      content: 'Line1\nLine2\nLine3',
      fontWidth: 10,
      fontSize: 20,
      fieldBlock: { maxLines: 0, lineSpacing: 0, justification: 'L' },
    });
    const size = computeTextSize(props, 200);
    expect(size).toEqual({ width: 200, height: 60 }); // 3 lines * 20 = 60
  });
});
