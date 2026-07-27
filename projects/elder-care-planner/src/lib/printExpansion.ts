/**
 * A collapsed `<details>` prints collapsed.
 *
 * That turns a layout preference into data loss: the Family Meeting Summary,
 * the split table and the facility shortlist are all printable content living
 * inside sections that are closed by default, so a family that pressed print
 * without opening anything would take a page of headings to the meeting. The
 * fix is behavioural rather than CSS — no stylesheet reliably reveals the
 * content of a closed `details` across browsers — so every printable section is
 * opened before the print and put back exactly as it was afterwards.
 *
 * The decision of *which* sections to put back is the part worth testing, so it
 * is expressed over a structural type rather than over the DOM: `openSections`
 * and `restoreSections` take anything with `open` and `dataset`, which a real
 * `HTMLDetailsElement` satisfies and a plain object in a unit test satisfies
 * too. The DOM lookup is the thin wrapper underneath, covered in E2E.
 */

/** The part of an `HTMLDetailsElement` this module touches. */
export interface PrintableSection {
  open: boolean;
  readonly dataset: { printReopened?: string };
}

const SELECTOR = 'details[data-print-open]';

/**
 * Open every closed section, marking the ones this opened.
 *
 * The marker is what makes the restore non-destructive: a section the reader
 * had already opened is left open afterwards, because printing must not
 * silently rearrange the page someone was reading.
 */
export function openSections(sections: Iterable<PrintableSection>): void {
  for (const section of sections) {
    if (!section.open) {
      section.dataset.printReopened = 'true';
      section.open = true;
    }
  }
}

/** Close only the sections `openSections` opened, and clear their markers. */
export function restoreSections(sections: Iterable<PrintableSection>): void {
  for (const section of sections) {
    if (section.dataset.printReopened === 'true') {
      delete section.dataset.printReopened;
      section.open = false;
    }
  }
}

export function openForPrint(root: Document = document): void {
  openSections(root.querySelectorAll<HTMLDetailsElement>(SELECTOR));
}

export function restoreAfterPrint(root: Document = document): void {
  restoreSections(root.querySelectorAll<HTMLDetailsElement>(SELECTOR));
}

/**
 * Wire the browser's own print lifecycle. Returns an unsubscribe function.
 *
 * `beforeprint` covers Ctrl+P and the browser menu. The in-app print button
 * calls `openForPrint` synchronously instead of relying on this, because
 * `window.print()` can begin painting before an event listener has run.
 */
export function listenForPrint(target: Window = window): () => void {
  const open = () => openForPrint(target.document);
  const restore = () => restoreAfterPrint(target.document);
  target.addEventListener('beforeprint', open);
  target.addEventListener('afterprint', restore);
  return () => {
    target.removeEventListener('beforeprint', open);
    target.removeEventListener('afterprint', restore);
  };
}
