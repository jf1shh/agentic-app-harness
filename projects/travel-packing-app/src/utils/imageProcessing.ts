// On-device image resizing for the Digital Closet. Garment photos run through
// the client-side background-removal model and are then stored base64 in
// IndexedDB (src/services/db.ts). Phone photos are multi-megapixel, so running
// the model and persisting the result at full resolution would burn CPU and
// IndexedDB quota for no visible gain — the thumbnails are rendered ~100px.
// Resizing the input to a bounded edge first keeps both the AI pass and the
// stored blob small, the same "downscale before storing" rule .agents/AGENTS.md
// §6 already applies to elder-care-planner's facility photos.

export const MAX_IMAGE_EDGE_PX = 1280;
const OUTPUT_MIME = 'image/jpeg';
const OUTPUT_QUALITY = 0.92;

/**
 * The target width/height that scales `width` x `height` so its longest edge
 * is at most `maxEdgePx`, preserving aspect ratio. Pure and unit-testable;
 * the canvas blit in `downscaleImageToBlob` is the only DOM-touching part.
 * Degenerate input returns `{ width: 0, height: 0 }` rather than NaN, so a
 * caller can never hand a negative or NaN dimension to a canvas.
 */
export function computeTargetDimensions(
  width: number,
  height: number,
  maxEdgePx: number = MAX_IMAGE_EDGE_PX,
): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { width: 0, height: 0 };
  }
  const longest = Math.max(width, height);
  if (longest <= maxEdgePx) return { width: Math.round(width), height: Math.round(height) };
  const scale = maxEdgePx / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Returns a resized JPEG blob for `file`, or the original blob unchanged when
 * it is already within `maxEdgePx` or when the resize path is unavailable
 * (older browser without createImageBitmap / canvas.toBlob) — a photo that
 * saves at full size is better than a photo that fails to save.
 */
export async function downscaleImageToBlob(file: Blob, maxEdgePx: number = MAX_IMAGE_EDGE_PX): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    try {
      const { width, height } = computeTargetDimensions(bitmap.width, bitmap.height, maxEdgePx);
      if (width === bitmap.width && height === bitmap.height) return file;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;

      ctx.drawImage(bitmap, 0, 0, width, height);
      const resized = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, OUTPUT_MIME, OUTPUT_QUALITY),
      );
      return resized ?? file;
    } finally {
      bitmap.close();
    }
  } catch {
    return file;
  }
}
