import type { SnapGuide } from './snap';

let guides: SnapGuide[] = [];

export function getSnapGuides(): SnapGuide[] {
  return guides;
}

export function setSnapGuides(next: SnapGuide[]) {
  guides = next;
}
