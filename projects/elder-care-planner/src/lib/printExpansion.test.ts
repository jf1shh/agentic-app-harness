import { describe, it, expect } from 'vitest';
import { openSections, restoreSections, type PrintableSection } from './printExpansion';

function section(open: boolean): PrintableSection {
  return { open, dataset: {} };
}

describe('preparing collapsed sections for print', () => {
  it('Given a closed section, When the page is printed, Then it is opened so its content reaches the paper', () => {
    const closed = section(false);

    openSections([closed]);

    expect(closed.open).toBe(true);
  });

  it('Given a closed section, When the print finishes, Then it is closed again', () => {
    const closed = section(false);

    openSections([closed]);
    restoreSections([closed]);

    expect(closed.open).toBe(false);
  });

  it('Given a section the reader had already opened, When the print finishes, Then it is left open', () => {
    // The whole point of the marker. Printing must not silently rearrange the
    // page someone was reading.
    const alreadyOpen = section(true);

    openSections([alreadyOpen]);
    restoreSections([alreadyOpen]);

    expect(alreadyOpen.open).toBe(true);
  });

  it('Given a mix of open and closed sections, When printed and restored, Then each returns to exactly its original state', () => {
    const before = [false, true, false, true, false];
    const sections = before.map(section);

    openSections(sections);
    const duringPrint = sections.map((s) => s.open);
    restoreSections(sections);

    expect(duringPrint).toEqual([true, true, true, true, true]);
    expect(sections.map((s) => s.open)).toEqual(before);
  });

  it('Given a restore that already ran, When it runs a second time, Then nothing is closed again', () => {
    // `beforeprint`/`afterprint` and the in-app print button can both fire, so
    // the restore has to be idempotent or a double `afterprint` would close a
    // section the reader opened between the two.
    const wasClosed = section(false);

    openSections([wasClosed]);
    restoreSections([wasClosed]);
    wasClosed.open = true; // the reader opens it while reading the printout
    restoreSections([wasClosed]);

    expect(wasClosed.open).toBe(true);
    expect(wasClosed.dataset.printReopened).toBeUndefined();
  });
});
