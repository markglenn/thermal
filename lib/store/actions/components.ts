import { current } from 'immer';
import type {
  LabelComponent,
  ComponentLayout,
  ComponentType,
  HorizontalAnchor,
  VerticalAnchor,
  VisibilityCondition,
} from '../../types';
import { DUPLICATE_OFFSET, labelWidthDots, labelHeightDots } from '../../constants';
import { createComponent, generateId } from '../editor-actions';
import { findComponent } from '@/lib/utils';
import { resolveLayout } from '@/lib/constraints/resolver';
import { recomputeContentSize } from '@/lib/components/recompute-size';
import { getDefinition } from '@/lib/components/registry';
import type { EditorStore } from '../editor-store';
import type { ImmerSet, StoreGet } from '../undo';

/** Offset a layout by `amount` in the visual "down-right" direction, respecting anchor. */
function offsetForAnchor(layout: ComponentLayout, amount: number) {
  layout.x += layout.horizontalAnchor === 'right' ? -amount : amount;
  layout.y += layout.verticalAnchor === 'bottom' ? -amount : amount;
}

export function createComponentActions(set: ImmerSet<EditorStore>, get: StoreGet<EditorStore>) {
  return {
    addComponent: (type: ComponentType, layoutOverrides?: Partial<ComponentLayout>): string => {
      const comp = createComponent(type, layoutOverrides);
      recomputeContentSize(comp);
      set((state) => {
        state.document.components.push(comp);
        state.selectedComponentIds = [comp.id];
      });
      return comp.id;
    },

    removeComponent: (id: string) => {
      set((state) => {
        const idx = state.document.components.findIndex((c) => c.id === id);
        if (idx !== -1) state.document.components.splice(idx, 1);
        state.selectedComponentIds = state.selectedComponentIds.filter((sid) => sid !== id);
      });
    },

    duplicateComponent: (id: string) => {
      set((state) => {
        const comps = state.document.components;
        const idx = comps.findIndex((c) => c.id === id);
        if (idx === -1) return;
        const original = comps[idx];
        const cloned = structuredClone(current(original)) as LabelComponent;
        cloned.id = generateId();
        cloned.name = cloned.name + ' Copy';
        delete cloned.layout.lockX;
        delete cloned.layout.lockY;
        offsetForAnchor(cloned.layout, DUPLICATE_OFFSET);
        comps.splice(idx + 1, 0, cloned);
        state.selectedComponentIds = [cloned.id];
      });
    },

    pasteComponents: (components: LabelComponent[]): string[] => {
      const clones = components.map((c) => {
        const cloned = structuredClone(c);
        cloned.id = generateId();
        delete cloned.layout.lockX;
        delete cloned.layout.lockY;
        offsetForAnchor(cloned.layout, DUPLICATE_OFFSET);
        return cloned;
      });
      set((state) => {
        state.document.components.push(...clones);
        state.selectedComponentIds = clones.map((c) => c.id);
      });
      return clones.map((c) => c.id);
    },

    updateLayout: (id: string, layout: Partial<ComponentLayout>) => {
      set((state) => {
        const comp = findComponent(state.document.components, id);
        if (!comp) return;
        const def = getDefinition(comp.typeData.type);
        if (def.constrainSize && (layout.width !== undefined || layout.height !== undefined)) {
          const sizeChange: Partial<Pick<ComponentLayout, 'width' | 'height'>> = {};
          if (layout.width !== undefined) sizeChange.width = layout.width;
          if (layout.height !== undefined) sizeChange.height = layout.height;
          const constrained = def.constrainSize(comp.typeData.props, comp.layout, sizeChange);
          Object.assign(layout, constrained);
        }
        Object.assign(comp.layout, layout);
        if (layout.height !== undefined && comp.typeData.type === 'text') {
          const textProps = comp.typeData.props as import('../../types').TextProperties;
          if (textProps.fieldBlock) {
            const lh = textProps.fontSize + textProps.fieldBlock.lineSpacing;
            textProps.fieldBlock.maxLines = Math.max(1, Math.round(layout.height / lh));
          }
        }
        if (layout.width !== undefined) {
          recomputeContentSize(comp);
        }
      });
    },

    updateMultipleLayouts: (updates: { id: string; layout: Partial<ComponentLayout> }[]) => {
      set((state) => {
        for (const { id, layout } of updates) {
          const comp = findComponent(state.document.components, id);
          if (!comp) continue;
          Object.assign(comp.layout, layout);
          if (layout.width !== undefined) {
            recomputeContentSize(comp);
          }
        }
      });
    },

    updateProperties: (id: string, props: Record<string, unknown>) => {
      set((state) => {
        const comp = findComponent(state.document.components, id);
        if (comp) {
          Object.assign(comp.typeData.props, props);
          recomputeContentSize(comp);
          if (comp.typeData.type === 'text') {
            const textProps = comp.typeData.props as import('../../types').TextProperties;
            // Recalculate height from maxLines, but only for width-only sizing (top-aligned).
            // Fixed-height boxes (verticalAlign center/bottom) keep their layout height.
            const va = textProps.fieldBlock?.verticalAlign;
            const isFixed = va === 'center' || va === 'bottom';
            if (textProps.fieldBlock && textProps.fieldBlock.maxLines > 0) {
              if (isFixed) {
                // Fixed-height: keep layout height, recalculate maxLines to fit
                const lh = textProps.fontSize + textProps.fieldBlock.lineSpacing;
                textProps.fieldBlock.maxLines = Math.max(1, Math.round(comp.layout.height / lh));
              } else {
                // Width-only: recalculate height from maxLines
                comp.layout.height = textProps.fieldBlock.maxLines * (textProps.fontSize + textProps.fieldBlock.lineSpacing);
              }
            }
          }
        }
      });
    },

    renameComponent: (id: string, name: string) => {
      set((state) => {
        const comp = findComponent(state.document.components, id);
        if (comp) comp.name = name;
      });
    },

    setAnchor: (id: string, horizontal?: HorizontalAnchor, vertical?: VerticalAnchor) => {
      const currentState = get();
      const currentComp = findComponent(currentState.document.components, id);
      if (!currentComp) return;

      const { label } = currentState.document;
      const lw = labelWidthDots(label, currentState.activeVariant);
      const lh = labelHeightDots(label, currentState.activeVariant);
      const bounds = resolveLayout(currentComp.layout, lw, lh);

      set((state) => {
        const comp = findComponent(state.document.components, id);
        if (!comp) return;

        if (horizontal !== undefined && horizontal !== comp.layout.horizontalAnchor) {
          comp.layout.horizontalAnchor = horizontal;
          if (horizontal === 'right') {
            comp.layout.x = Math.max(0, lw - bounds.x - bounds.width);
          } else if (horizontal === 'center') {
            comp.layout.x = 0;
          } else {
            comp.layout.x = bounds.x;
          }
        }

        if (vertical !== undefined && vertical !== comp.layout.verticalAnchor) {
          comp.layout.verticalAnchor = vertical;
          if (vertical === 'bottom') {
            comp.layout.y = Math.max(0, lh - bounds.y - bounds.height);
          } else if (vertical === 'center') {
            comp.layout.y = 0;
          } else {
            comp.layout.y = bounds.y;
          }
        }
      });
    },

    reorderComponents: (fromIndex: number, toIndex: number) => {
      set((state) => {
        const comps = state.document.components;
        if (fromIndex < 0 || fromIndex >= comps.length) return;
        if (toIndex < 0 || toIndex >= comps.length) return;
        if (fromIndex === toIndex) return;
        const [moved] = comps.splice(fromIndex, 1);
        comps.splice(toIndex, 0, moved);
      });
    },

    updateFieldBinding: (id: string, binding: string | undefined) => {
      set((state) => {
        const comp = findComponent(state.document.components, id);
        if (comp) {
          if (binding) {
            comp.fieldBinding = binding;
          } else {
            delete comp.fieldBinding;
          }
        }
      });
    },

    updateVisibilityCondition: (id: string, condition: VisibilityCondition | undefined) => {
      set((state) => {
        const comp = findComponent(state.document.components, id);
        if (comp) {
          if (condition) {
            comp.visibilityCondition = condition;
          } else {
            delete comp.visibilityCondition;
          }
        }
      });
    },

    toggleLock: (id: string, axis: 'x' | 'y') => {
      set((state) => {
        const comp = findComponent(state.document.components, id);
        if (!comp) return;
        const key = axis === 'x' ? 'lockX' : 'lockY';
        comp.layout[key] = !comp.layout[key];
      });
    },
  };
}
