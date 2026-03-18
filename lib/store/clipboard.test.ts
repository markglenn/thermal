import { describe, it, expect } from 'vitest';
import { copyToClipboard, readClipboard, hasClipboardContent } from './clipboard';
import type { LabelComponent } from '../types';

function makeComponent(id: string): LabelComponent {
  return {
    id,
    name: id,
    layout: { x: 10, y: 20, width: 100, height: 40, horizontalAnchor: 'left', verticalAnchor: 'top' },
    typeData: { type: 'text', props: { content: 'Hello', font: '0', fontSize: 30, fontWidth: 30, rotation: 0 } },
  };
}

describe('clipboard', () => {
  it('starts empty', () => {
    expect(hasClipboardContent()).toBe(false);
    expect(readClipboard()).toEqual([]);
  });

  it('stores and retrieves components', () => {
    const comps = [makeComponent('a'), makeComponent('b')];
    copyToClipboard(comps);
    expect(hasClipboardContent()).toBe(true);
    expect(readClipboard()).toHaveLength(2);
    expect(readClipboard()[0].id).toBe('a');
  });

  it('deep clones — mutations to source do not affect clipboard', () => {
    const comp = makeComponent('a');
    copyToClipboard([comp]);
    comp.name = 'mutated';
    expect(readClipboard()[0].name).toBe('a');
  });

  it('overwrites previous clipboard content', () => {
    copyToClipboard([makeComponent('first')]);
    copyToClipboard([makeComponent('second')]);
    expect(readClipboard()).toHaveLength(1);
    expect(readClipboard()[0].id).toBe('second');
  });
});
