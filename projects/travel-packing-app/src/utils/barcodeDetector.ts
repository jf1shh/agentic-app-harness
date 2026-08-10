// Barcode detection via the native Shape Detection `BarcodeDetector` API.
//
// This API only exists in Chromium browsers (desktop Chrome/Edge, and the
// Chromium-based Android WebView that Capacitor uses on Android) — it is
// NOT available in iOS Safari or Firefox. Rather than bundle a wasm-based
// ponyfill for those, `getBarcodeDetector()` feature-detects and resolves
// to `null` when unsupported so the caller can fall back to the always-
// available text-based brand/barcode search on `SuitcaseFinder`.

// Formats that appear on luggage hang tags and retail box labels.
const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code'];

export interface DetectedBarcode {
  rawValue: string;
  format: string;
  boundingBox: { x: number; y: number; width: number; height: number };
}

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats: string[] }): BarcodeDetectorLike;
  getSupportedFormats(): Promise<string[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

let detectorPromise: Promise<BarcodeDetectorLike | null> | null = null;

async function createDetector(): Promise<BarcodeDetectorLike | null> {
  if (typeof window === 'undefined' || !window.BarcodeDetector) return null;
  try {
    const supported = await window.BarcodeDetector.getSupportedFormats();
    if (!supported || supported.length === 0) return null;
    const formats = FORMATS.filter((f) => supported.includes(f));
    return new window.BarcodeDetector({ formats: formats.length ? formats : supported });
  } catch {
    return null;
  }
}

/**
 * Get a BarcodeDetector-compatible instance (native only). Cached after the
 * first call. Resolves to `null` when the native API is unsupported or
 * reports no usable formats — callers should treat that as "barcode
 * scanning unavailable on this device" and fall back to text search.
 */
export function getBarcodeDetector(): Promise<BarcodeDetectorLike | null> {
  if (!detectorPromise) {
    detectorPromise = createDetector().catch(() => {
      detectorPromise = null; // allow a retry on the next open
      return null;
    });
  }
  return detectorPromise;
}
