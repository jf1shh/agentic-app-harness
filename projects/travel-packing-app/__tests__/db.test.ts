import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get, set, del, clear } from 'idb-keyval';
import {
  saveItemImage,
  getItemImage,
  deleteItemImage,
  clearAllLocalData,
} from '../src/services/db';

// idb-keyval is stubbed rather than exercised: this suite is about the app's
// own contract with the store — key namespacing, the null/false fallbacks, and
// the promise that a storage failure never propagates — not about whether
// IndexedDB works. (The sensor does not credit a `vi.mock()`ed module as
// covered, so mocking the dependency here does not launder coverage onto it.)
vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  clear: vi.fn(),
}));

// Backfilled coverage (.agents/AGENTS.md §5): no Red step; every case was proved
// by mutation — see the PR body.
//
// Why this module matters: it is the separate store from the §6 lesson "A Binary
// Attachment Must Not Share a Storage Budget With the Record It Annotates".
// Images live in IndexedDB precisely so a photo cannot blow the localStorage
// quota and take the wardrobe with it, and `clearAllLocalData` is the separate
// erase that lesson says a separate store obliges you to provide.

const mockGet = vi.mocked(get);
const mockSet = vi.mocked(set);
const mockDel = vi.mocked(del);
const mockClear = vi.mocked(clear);

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('saveItemImage', () => {
  it('Given an item id and image data, When it is saved, Then it is written under the img_ namespace', () => {
    // The prefix is what keeps images from colliding with the logger's own key
    // in the same store; writing the bare id would let one clobber the other.
    mockSet.mockResolvedValue(undefined);
    return saveItemImage('garment-1', 'data:image/jpeg;base64,AAA').then((ok) => {
      expect(mockSet).toHaveBeenCalledWith('img_garment-1', 'data:image/jpeg;base64,AAA');
      expect(ok).toBe(true);
    });
  });

  it('Given a store that rejects the write, When an image is saved, Then it reports failure rather than throwing', async () => {
    // A QuotaExceededError here must surface as a handled false, not an unhandled
    // rejection that takes down the component mid-upload.
    mockSet.mockRejectedValue(new Error('QuotaExceededError'));
    await expect(saveItemImage('garment-1', 'data')).resolves.toBe(false);
  });
});

describe('getItemImage', () => {
  it('Given a stored image, When it is read back, Then the same data is returned from the namespaced key', async () => {
    mockGet.mockResolvedValue('data:image/jpeg;base64,AAA');
    await expect(getItemImage('garment-1')).resolves.toBe('data:image/jpeg;base64,AAA');
    expect(mockGet).toHaveBeenCalledWith('img_garment-1');
  });

  it('Given no image for that id, When it is read, Then null is returned rather than undefined', async () => {
    // Callers branch on null; undefined would slip through a `=== null` check.
    mockGet.mockResolvedValue(undefined);
    await expect(getItemImage('missing')).resolves.toBeNull();
  });

  it('Given a store that rejects the read, When an image is requested, Then null is returned rather than throwing', async () => {
    mockGet.mockRejectedValue(new Error('InvalidStateError'));
    await expect(getItemImage('garment-1')).resolves.toBeNull();
  });
});

describe('deleteItemImage', () => {
  it('Given an item id, When its image is deleted, Then the namespaced key is removed', async () => {
    mockDel.mockResolvedValue(undefined);
    await deleteItemImage('garment-1');
    expect(mockDel).toHaveBeenCalledWith('img_garment-1');
  });

  it('Given a store that rejects the delete, When an image is deleted, Then the failure is swallowed rather than thrown', async () => {
    mockDel.mockRejectedValue(new Error('InvalidStateError'));
    await expect(deleteItemImage('garment-1')).resolves.toBeUndefined();
  });
});

describe('clearAllLocalData', () => {
  it('Given stored data, When everything is erased, Then the whole store is cleared', async () => {
    // "Forget everything on this device" has to reach the image store too — the
    // §6 lesson is that a separate store needs its own separate erase, and a
    // clear that quietly missed it would leave photos on a shared computer.
    mockClear.mockResolvedValue(undefined);
    await clearAllLocalData();
    expect(mockClear).toHaveBeenCalledTimes(1);
  });

  it('Given a store that rejects the clear, When erasing, Then the failure is swallowed rather than thrown', async () => {
    mockClear.mockRejectedValue(new Error('InvalidStateError'));
    await expect(clearAllLocalData()).resolves.toBeUndefined();
  });
});
