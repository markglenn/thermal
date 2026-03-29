import type { LabelDocument } from '../types';
import { toast } from '../toast-store';

/** Download the document as a .json file. */
export function exportDocument(doc: LabelDocument, name: string): void {
  const json = JSON.stringify(doc, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = `${name}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Open a file picker and parse the selected JSON file as a LabelDocument. */
export function importDocument(
  validate: (value: unknown) => value is LabelDocument,
): Promise<{ name: string; document: LabelDocument } | null> {
  return new Promise((resolve) => {
    const input = window.document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string);
          if (!validate(parsed)) {
            toast('Invalid label document.', 'error');
            resolve(null);
            return;
          }
          const name = file.name.replace(/\.json$/i, '');
          resolve({ name, document: parsed });
        } catch {
          toast('Could not parse JSON file.', 'error');
          resolve(null);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}
