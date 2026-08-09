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

/** Type guard for an incoming BroadcastChannel message from another tab. */
export function isChecklistSyncMessage(data: unknown): data is ChecklistSyncMessage {
  if (!data || typeof data !== 'object') return false;
  const msg = data as Record<string, unknown>;
  return msg.type === 'checklist-update'
    && !!msg.checkedItems
    && typeof msg.checkedItems === 'object'
    && !Array.isArray(msg.checkedItems);
}
