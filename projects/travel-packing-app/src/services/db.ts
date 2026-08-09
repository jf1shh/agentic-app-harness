import { get, set, del, clear } from 'idb-keyval';

const MIN_FREE_BYTES = 10 * 1024 * 1024; // warn if <10 MB free

export interface StorageQuota {
  quota: number;
  usage: number;
  lowSpace: boolean;
}

// Lets the Digital Closet UI warn before a photo save silently fails —
// see the §6 lesson on binary attachments needing their own quota check
// rather than discovering a QuotaExceededError after the fact.
export const checkStorageQuota = async (): Promise<StorageQuota> => {
  if (!navigator.storage || !navigator.storage.estimate) {
    return { quota: 0, usage: 0, lowSpace: false };
  }
  try {
    const { quota = 0, usage = 0 } = await navigator.storage.estimate();
    return { quota, usage, lowSpace: quota - usage < MIN_FREE_BYTES };
  } catch {
    return { quota: 0, usage: 0, lowSpace: false };
  }
};

export const saveItemImage = async (itemId: string, imageBase64: string): Promise<boolean> => {
  try {
    await set(`img_${itemId}`, imageBase64);
    return true;
  } catch (e) {
    console.error("Failed to save image to IndexedDB", e);
    return false;
  }
};

export const getItemImage = async (itemId: string): Promise<string | null> => {
  try {
    const val = await get(`img_${itemId}`);
    return val ? (val as string) : null;
  } catch (e) {
    console.error("Failed to retrieve image from IndexedDB", e);
    return null;
  }
};

export const deleteItemImage = async (itemId: string): Promise<void> => {
  try {
    await del(`img_${itemId}`);
  } catch (e) {
    console.error("Failed to delete image from IndexedDB", e);
  }
};

export const clearAllLocalData = async (): Promise<void> => {
  try {
    await clear();
  } catch (e) {
    console.error("Failed to clear IndexedDB", e);
  }
};
