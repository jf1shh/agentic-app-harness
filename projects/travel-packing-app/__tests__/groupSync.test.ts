import { describe, it, expect, vi } from 'vitest';
import { createSyncChannel, broadcastChecklistUpdate, isChecklistSyncMessage } from '../src/services/groupSync';

describe('createSyncChannel', () => {
  it('Given BroadcastChannel is available, When a channel is created, Then it is a real BroadcastChannel instance', () => {
    const channel = createSyncChannel();
    expect(channel).toBeInstanceOf(BroadcastChannel);
    channel?.close();
  });

  it('Given BroadcastChannel is unavailable, When a channel is created, Then null is returned rather than throwing', () => {
    const original = globalThis.BroadcastChannel;
    // @ts-expect-error -- simulating an environment without BroadcastChannel
    delete globalThis.BroadcastChannel;
    expect(createSyncChannel()).toBeNull();
    globalThis.BroadcastChannel = original;
  });
});

describe('broadcastChecklistUpdate', () => {
  it('Given two tabs sharing the sync channel, When one broadcasts a checklist update, Then the other receives the same checked-items map', async () => {
    const senderChannel = createSyncChannel();
    const receiverChannel = createSyncChannel();
    expect(senderChannel).not.toBeNull();
    expect(receiverChannel).not.toBeNull();

    const received = await new Promise((resolve) => {
      receiverChannel!.onmessage = (event) => resolve(event.data);
      broadcastChecklistUpdate(senderChannel, { 'item-1': true, 'item-2': false });
    });

    expect(received).toEqual({ type: 'checklist-update', checkedItems: { 'item-1': true, 'item-2': false } });
    senderChannel?.close();
    receiverChannel?.close();
  });

  it('Given a null channel (BroadcastChannel unsupported), When a broadcast is attempted, Then it is a silent no-op rather than throwing', () => {
    expect(() => broadcastChecklistUpdate(null, { 'item-1': true })).not.toThrow();
  });

  it('Given a channel whose postMessage throws (e.g. already closed), When a broadcast is attempted, Then the failure is swallowed rather than crashing the caller', () => {
    const channel = createSyncChannel();
    channel!.postMessage = vi.fn(() => {
      throw new Error('channel closed');
    });
    expect(() => broadcastChecklistUpdate(channel, { 'item-1': true })).not.toThrow();
    channel?.close();
  });
});

describe('isChecklistSyncMessage', () => {
  it('Given a well-formed checklist sync message, When validated, Then it is recognized', () => {
    expect(isChecklistSyncMessage({ type: 'checklist-update', checkedItems: { a: true } })).toBe(true);
  });

  it('Given a message of the wrong type or shape, When validated, Then it is rejected rather than trusted', () => {
    expect(isChecklistSyncMessage({ type: 'something-else', checkedItems: {} })).toBe(false);
    expect(isChecklistSyncMessage({ type: 'checklist-update' })).toBe(false);
    expect(isChecklistSyncMessage({ type: 'checklist-update', checkedItems: 'not-an-object' })).toBe(false);
    expect(isChecklistSyncMessage(null)).toBe(false);
    expect(isChecklistSyncMessage('a string')).toBe(false);
    expect(isChecklistSyncMessage(42)).toBe(false);
  });
});
