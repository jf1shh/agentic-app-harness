import { describe, it, expect, afterEach, vi } from 'vitest';

// Each test constructs a fresh module instance so the internal
// `detectorPromise` cache from a previous test's `window.BarcodeDetector`
// stub never leaks into the next one.
async function freshGetBarcodeDetector() {
  vi.resetModules();
  const mod = await import('../src/utils/barcodeDetector');
  return mod.getBarcodeDetector;
}

describe('getBarcodeDetector', () => {
  afterEach(() => {
    delete window.BarcodeDetector;
  });

  it('Given a browser with no BarcodeDetector global, When a detector is requested, Then it resolves to null', async () => {
    const get = await freshGetBarcodeDetector();
    await expect(get()).resolves.toBeNull();
  });

  it('Given BarcodeDetector reports zero supported formats, When a detector is requested, Then it resolves to null', async () => {
    // @ts-expect-error minimal stub of the browser-only constructor
    window.BarcodeDetector = {
      getSupportedFormats: () => Promise.resolve([]),
    };
    const get = await freshGetBarcodeDetector();
    await expect(get()).resolves.toBeNull();
  });

  it('Given BarcodeDetector supports luggage-tag formats, When a detector is requested, Then it is constructed with only the intersecting formats', async () => {
    const constructed: Array<{ formats: string[] }> = [];
    class FakeBarcodeDetector {
      static getSupportedFormats() {
        return Promise.resolve(['ean_13', 'code_128', 'aztec']);
      }
      constructor(options: { formats: string[] }) {
        constructed.push(options);
      }
    }
    // @ts-expect-error assigning a browser-only global for the test
    window.BarcodeDetector = FakeBarcodeDetector;

    const get = await freshGetBarcodeDetector();
    const detector = await get();

    expect(detector).not.toBeNull();
    expect(constructed).toHaveLength(1);
    expect(constructed[0].formats.sort()).toEqual(['code_128', 'ean_13']);
  });

  it('Given the same detector is requested twice, When both calls resolve, Then the constructor only runs once (cached)', async () => {
    let constructCount = 0;
    class FakeBarcodeDetector {
      static getSupportedFormats() {
        return Promise.resolve(['ean_13']);
      }
      constructor() {
        constructCount++;
      }
    }
    // @ts-expect-error assigning a browser-only global for the test
    window.BarcodeDetector = FakeBarcodeDetector;

    const get = await freshGetBarcodeDetector();
    await get();
    await get();

    expect(constructCount).toBe(1);
  });

  it('Given constructing the detector throws, When a detector is requested, Then it resolves to null instead of rejecting', async () => {
    class ThrowingBarcodeDetector {
      static getSupportedFormats() {
        return Promise.resolve(['ean_13']);
      }
      constructor() {
        throw new Error('device refused to open the barcode scanner');
      }
    }
    // @ts-expect-error assigning a browser-only global for the test
    window.BarcodeDetector = ThrowingBarcodeDetector;

    const get = await freshGetBarcodeDetector();
    await expect(get()).resolves.toBeNull();
  });
});
