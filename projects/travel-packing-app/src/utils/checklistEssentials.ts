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
 *
 * `adapterPlugTypes` carries one entry per trip leg (a single-destination
 * trip passes a one-element array): a resolved plug type produces a
 * named-adapter essential, `null` means that leg's country couldn't be
 * resolved and folds into one universal-adapter fallback shared by every
 * unresolved leg. The very first adapter essential always keeps the id
 * `essential-adapter` (matching this function's pre-multi-destination
 * shape exactly) so a single-destination trip's persisted checklist
 * check-marks, keyed by this id in localStorage, survive the upgrade.
 */
export function buildEssentialSpecs(tripDays: number, adapterPlugTypes: (string | null)[]): EssentialSpec[] {
  const uniqueTypes = Array.from(new Set(adapterPlugTypes.filter((t): t is string => Boolean(t))));
  const needsUniversal = adapterPlugTypes.length === 0 || adapterPlugTypes.some((t) => !t);

  const adapterSpecs: EssentialSpec[] = uniqueTypes.map((type, i) => ({
    id: i === 0 ? 'essential-adapter' : `essential-adapter-${type}`,
    key: 'checklist.travelAdapterFor',
    params: { type },
  }));
  if (needsUniversal) {
    adapterSpecs.push({
      id: adapterSpecs.length === 0 ? 'essential-adapter' : 'essential-adapter-universal',
      key: 'checklist.universalAdapter',
    });
  }

  return [
    { id: 'essential-underwear', key: 'checklist.underwear', params: { n: tripDays } },
    { id: 'essential-socks', key: 'checklist.socks', params: { n: tripDays } },
    { id: 'essential-toiletries', key: 'checklist.toiletryKit' },
    { id: 'essential-tech', key: 'checklist.techPouch' },
    ...adapterSpecs,
  ];
}

export function computeProgressPercent(checkedCount: number, totalItems: number): number {
  if (totalItems <= 0) return 0;
  return Math.round((checkedCount / totalItems) * 100);
}
