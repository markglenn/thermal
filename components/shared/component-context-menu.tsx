import { Pencil, Copy, Trash2, Lock, Unlock } from 'lucide-react';
import { showContextMenu, type ContextMenuEntry } from '../ui/ContextMenu';
import type { LabelComponent } from '@/lib/types';
import type { EditorStoreApi } from '@/lib/store/editor-store';

export function showComponentContextMenu(
  e: React.MouseEvent,
  component: LabelComponent,
  storeApi: EditorStoreApi,
  onStartRename?: () => void,
) {
  e.preventDefault();
  const state = storeApi.getState();
  state.selectComponent(component.id);
  const readOnly = state.readOnly;

  const isLockedX = !!component.layout.lockX;
  const isLockedY = !!component.layout.lockY;
  const isLocked = isLockedX || isLockedY;

  const items: ContextMenuEntry[] = [];

  if (onStartRename) {
    items.push({
      label: 'Rename',
      icon: <Pencil size={12} />,
      onClick: () => onStartRename(),
      disabled: readOnly,
    });
  }

  items.push(
    {
      label: 'Duplicate',
      icon: <Copy size={12} />,
      onClick: () => storeApi.getState().duplicateComponent(component.id),
      disabled: readOnly,
    },
    {
      label: isLocked ? 'Unlock Position' : 'Lock Position',
      icon: isLocked ? <Unlock size={12} /> : <Lock size={12} />,
      onClick: () => {
        const store = storeApi.getState();
        if (isLockedX || !isLockedY) store.toggleLock(component.id, 'x');
        if (isLockedY || !isLockedX) store.toggleLock(component.id, 'y');
      },
      disabled: readOnly,
    },
    { separator: true },
    {
      label: 'Delete',
      icon: <Trash2 size={12} />,
      onClick: () => storeApi.getState().removeComponent(component.id),
      danger: true,
      disabled: readOnly,
    },
  );

  showContextMenu(e.clientX, e.clientY, items);
}
