// Live collaborative packing check-off across browser tabs on the same
// origin, via BroadcastChannel. This is deliberately tab-to-tab only (not
// cross-device) -- BroadcastChannel has no server component, matching the
// app's 100%-local, no-accounts design.

const CHANNEL_NAME = 'travel-packer-sync';

export interface ChecklistSyncMessage {
  type: 'checklist-update';
  checkedItems: Record<string, boolean>;
}

/** Open the shared sync channel, or null where BroadcastChannel isn't supported. */
export function createSyncChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  try {
    return new BroadcastChannel(CHANNEL_NAME);
  } catch {
    return null;
  }
}

/** Broadcast the current checked-items map to every other tab on the channel. */
export function broadcastChecklistUpdate(
  channel: BroadcastChannel | null,
  checkedItems: Record<string, boolean>
): void {
  if (!channel) return;
  try {
    const message: ChecklistSyncMessage = { type: 'checklist-update', checkedItems };
    channel.postMessage(message);
  } catch {
    // A closed or otherwise failed channel must not crash the caller --
    // the checklist still works locally without live sync.
  }
}

/**
 * Type guard for a checked-items map.
 *
 * Both untrusted sources of this shape — a message from another tab and the
 * value restored from localStorage — validate through this one definition, so
 * the two paths cannot drift into disagreeing about what a valid map is.
 */
export function isCheckedItemsMap(value: unknown): value is Record<string, boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every((v) => typeof v === 'boolean');
}

/** Type guard for an incoming BroadcastChannel message from another tab. */
export function isChecklistSyncMessage(data: unknown): data is ChecklistSyncMessage {
  if (!data || typeof data !== 'object') return false;
  const msg = data as Record<string, unknown>;
  return msg.type === 'checklist-update' && isCheckedItemsMap(msg.checkedItems);
}

/**
 * Restore the checked-items map from its persisted JSON, falling back to an
 * empty map for anything that is not a valid map.
 *
 * The case worth naming: `JSON.parse('null')` does not throw — it succeeds and
 * returns `null`. A `try`/`catch` around the parse therefore lets `null`
 * through as if it were restored state, and the first `Object.values(...)` on
 * it throws during render, blanking the checklist. Validating the *result*,
 * not just guarding the parse, is what closes that gap.
 */
export function parseStoredCheckedItems(raw: string | null): Record<string, boolean> {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  return isCheckedItemsMap(parsed) ? parsed : {};
}
