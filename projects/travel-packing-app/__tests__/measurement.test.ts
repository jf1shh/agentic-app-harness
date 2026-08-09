import { describe, it, expect } from 'vitest';
import {
  pixelDistance,
  calibrateScale,
  pixelsToCm,
  estimateHeight,
  measureFromTaps,
  formatDimensions,
  REFERENCE_CARD_MM,
} from '../src/utils/measurement';

describe('pixelDistance', () => {
  it('Given two points offset horizontally, When the distance is measured, Then it equals the horizontal delta', () => {
    expect(pixelDistance({ x: 0, y: 0 }, { x: 10, y: 0 })).toBe(10);
  });

  it('Given two points forming a 3-4-5 triangle, When the distance is measured, Then it is the hypotenuse', () => {
    expect(pixelDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('Given the same point twice, When the distance is measured, Then it is zero', () => {
    expect(pixelDistance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
  });
});

describe('calibrateScale', () => {
  it('Given a reference object measured in pixels, When the scale is calibrated, Then it returns mm-per-pixel', () => {
    // A credit card's 85.6mm long edge spanning 100px means 0.856mm/px.
    expect(calibrateScale(100, 85.6)).toBeCloseTo(0.856);
  });

  it('Given no explicit reference size, When the scale is calibrated, Then it defaults to the ID-1 card width', () => {
    expect(calibrateScale(100)).toBe(calibrateScale(100, REFERENCE_CARD_MM.width));
  });

  it('Given a zero or negative pixel length, When the scale is calibrated, Then zero is returned rather than dividing by zero', () => {
    expect(calibrateScale(0)).toBe(0);
    expect(calibrateScale(-5)).toBe(0);
  });
});

describe('pixelsToCm', () => {
  it('Given a pixel length and a calibrated scale, When converted, Then it returns centimetres rounded to 1 decimal', () => {
    // 100px * 0.856mm/px = 85.6mm = 8.56cm, rounds to 8.6cm.
    expect(pixelsToCm(100, 0.856)).toBe(8.6);
  });

  it('Given a zero scale, When converted, Then zero is returned rather than producing NaN or Infinity', () => {
    expect(pixelsToCm(100, 0)).toBe(0);
  });

  it('Given a zero pixel length, When converted, Then zero is returned', () => {
    expect(pixelsToCm(0, 0.856)).toBe(0);
  });
});

describe('estimateHeight', () => {
  it('Given a measured width, When height is estimated, Then it is 0.65x the width, rounded to 1 decimal', () => {
    expect(estimateHeight(40)).toBe(26);
    expect(estimateHeight(35)).toBe(22.8);
  });
});

describe('measureFromTaps', () => {
  it('Given calibration and measurement taps at a known scale, When the pipeline runs, Then it returns length, width and an estimated height', () => {
    // Card taps 100px apart = 85.6mm long edge => 0.856mm/px.
    // Suitcase length taps 700px apart => 70cm (rounded).
    // Suitcase width taps 400px apart => 40cm (rounded).
    const result = measureFromTaps(
      { x: 0, y: 0 }, { x: 100, y: 0 },
      { x: 0, y: 0 }, { x: 700, y: 0 },
      { x: 0, y: 0 }, { x: 400, y: 0 }
    );
    expect(result.lengthCm).toBeCloseTo(59.9, 1);
    expect(result.widthCm).toBeCloseTo(34.2, 1);
    expect(result.heightCm).toBe(estimateHeight(result.widthCm));
    expect(result.scaleMmPerPx).toBeCloseTo(0.856, 3);
  });
});

describe('formatDimensions', () => {
  it('Given a measurement result, When formatted, Then each dimension becomes a plain string for the trip form', () => {
    const formatted = formatDimensions({ lengthCm: 55.9, widthCm: 35.6, heightCm: 23.1, scaleMmPerPx: 0.5 });
    expect(formatted).toEqual({ length: '55.9', width: '35.6', height: '23.1' });
  });
});
