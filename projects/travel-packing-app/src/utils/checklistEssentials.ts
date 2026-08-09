export interface EssentialSpec {
  id: string;
  key: string;
  params?: Record<string, string | number>;
}

/**
 * Structural spec for the packing checklist's per-trip essentials -- ids and
 * i18n translation keys/params, not translated strings, so the caller
 * supplies its own t() and this stays pure and testable without a
 * translation dictionary.
 */
export function buildEssentialSpecs(tripDays: number, adapterPlugType: string | null): EssentialSpec[] {
  return [
    { id: 'essential-underwear', key: 'checklist.underwear', params: { n: tripDays } },
    { id: 'essential-socks', key: 'checklist.socks', params: { n: tripDays } },
    { id: 'essential-toiletries', key: 'checklist.toiletryKit' },
    { id: 'essential-tech', key: 'checklist.techPouch' },
    adapterPlugType
      ? { id: 'essential-adapter', key: 'checklist.travelAdapterFor', params: { type: adapterPlugType } }
      : { id: 'essential-adapter', key: 'checklist.universalAdapter' },
  ];
}

export function computeProgressPercent(checkedCount: number, totalItems: number): number {
  if (totalItems <= 0) return 0;
  return Math.round((checkedCount / totalItems) * 100);
}
