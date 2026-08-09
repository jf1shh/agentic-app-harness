// Measurement utilities for the suitcase finder's credit-card-calibrated
// measurement flow. Uses a standard credit card (ISO/IEC 7810 ID-1: 85.60 x
// 53.98 mm) as the reference object for pixel-to-real-world scale
// calibration. Any ID-1 card works: credit card, driver's license, hotel
// key card, etc.
//
// This module is pure geometry/arithmetic with no DOM or camera dependency,
// so it is fully unit-testable on its own — a future camera/canvas UI can be
// built directly on top of it without further engine work.

export interface Point {
  x: number;
  y: number;
}

export interface MeasurementResult {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  scaleMmPerPx: number;
}

/** Physical dimensions of an ISO/IEC 7810 ID-1 card in millimetres. */
export const REFERENCE_CARD_MM = { width: 85.6, height: 53.98 };

/** Physical dimensions of an A4 sheet in millimetres (alternative reference). */
export const REFERENCE_A4_MM = { width: 210, height: 297 };

/** Euclidean distance between two points in pixel space. */
export function pixelDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate the scale factor from a reference object of known physical size.
 * @returns Millimetres per pixel
 */
export function calibrateScale(refPixelLength: number, refRealMm: number = REFERENCE_CARD_MM.width): number {
  if (refPixelLength <= 0) return 0;
  return refRealMm / refPixelLength;
}

/** Convert a pixel measurement to centimetres using a calibration scale. */
export function pixelsToCm(pixelLength: number, mmPerPixel: number): number {
  if (mmPerPixel <= 0 || pixelLength <= 0) return 0;
  return Math.round(((pixelLength * mmPerPixel) / 10) * 10) / 10;
}

/**
 * Estimate the height of a suitcase from its width, using common proportions.
 * Most carry-on suitcases have H ~= 0.60-0.70 x W.
 */
export function estimateHeight(widthCm: number): number {
  return Math.round(widthCm * 0.65 * 10) / 10;
}

/** Full measurement pipeline: from pixel taps to centimetre dimensions. */
export function measureFromTaps(
  cardP1: Point, cardP2: Point,
  suitcaseL1: Point, suitcaseL2: Point,
  suitcaseW1: Point, suitcaseW2: Point,
  refRealMm: number = REFERENCE_CARD_MM.width
): MeasurementResult {
  const cardPx = pixelDistance(cardP1, cardP2);
  const scale = calibrateScale(cardPx, refRealMm);

  const lengthCm = pixelsToCm(pixelDistance(suitcaseL1, suitcaseL2), scale);
  const widthCm = pixelsToCm(pixelDistance(suitcaseW1, suitcaseW2), scale);
  const heightCm = estimateHeight(widthCm);

  return { lengthCm, widthCm, heightCm, scaleMmPerPx: scale };
}

/**
 * Convert centimetre dimensions (from the measurement flow) back to the
 * string values the trip form uses internally.
 */
export function formatDimensions(dims: MeasurementResult): { length: string; width: string; height: string } {
  return {
    length: String(dims.lengthCm),
    width: String(dims.widthCm),
    height: String(dims.heightCm),
  };
}
