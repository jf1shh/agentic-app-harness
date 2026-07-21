import { get, set, del, clear } from 'idb-keyval';

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
