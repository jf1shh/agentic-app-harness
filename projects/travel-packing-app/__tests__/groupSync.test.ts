import { describe, it, expect, vi } from 'vitest';
import {
  createSyncChannel,
  broadcastChecklistUpdate,
  isChecklistSyncMessage,
  isCheckedItemsMap,
  parseStoredCheckedItems,
} from '../src/services/groupSync';

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

describe('isCheckedItemsMap', () => {
  it('Given a plain object of booleans, When it is validated, Then it is accepted', () => {
    expect(isCheckedItemsMap({ 'shirt-1': true, 'sock-2': false })).toBe(true);
  });

  it('Given an empty object, When it is validated, Then it is accepted', () => {
    expect(isCheckedItemsMap({})).toBe(true);
  });

  it('Given null, an array, or a bare number, When each is validated, Then each is rejected', () => {
    expect(isCheckedItemsMap(null)).toBe(false);
    expect(isCheckedItemsMap([1, 2])).toBe(false);
    expect(isCheckedItemsMap(42)).toBe(false);
  });

  it('Given an object holding a non-boolean value, When it is validated, Then it is rejected', () => {
    expect(isCheckedItemsMap({ 'shirt-1': 'yes' })).toBe(false);
  });
});

describe('parseStoredCheckedItems', () => {
  it('Given a stored map of checked items, When it is parsed, Then the map is returned', () => {
    expect(parseStoredCheckedItems('{"shirt-1":true}')).toEqual({ 'shirt-1': true });
  });

  it('Given no stored value, When it is parsed, Then an empty map is returned', () => {
    expect(parseStoredCheckedItems(null)).toEqual({});
  });

  it('Given a stored literal "null", When it is parsed, Then an empty map is returned rather than null', () => {
    // JSON.parse('null') *succeeds* and yields null, so a try/catch around the
    // parse does not catch this. The component then calls Object.values(null),
    // which throws during render and takes the checklist down.
    const result = parseStoredCheckedItems('null');
    expect(result).toEqual({});
    expect(() => Object.values(result).filter(Boolean).length).not.toThrow();
  });

  it('Given a stored array or bare number, When each is parsed, Then an empty map is returned', () => {
    expect(parseStoredCheckedItems('[true,false]')).toEqual({});
    expect(parseStoredCheckedItems('42')).toEqual({});
  });

  it('Given malformed JSON, When it is parsed, Then an empty map is returned', () => {
    expect(parseStoredCheckedItems('{oops')).toEqual({});
  });

  it('Given an object holding non-boolean values, When it is parsed, Then an empty map is returned', () => {
    expect(parseStoredCheckedItems('{"shirt-1":"yes"}')).toEqual({});
  });
});
