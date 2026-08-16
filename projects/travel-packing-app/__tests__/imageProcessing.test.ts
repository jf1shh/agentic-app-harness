import { describe, it, expect } from 'vitest';
import { computeTargetDimensions, MAX_IMAGE_EDGE_PX } from '../src/utils/imageProcessing';

describe('computeTargetDimensions', () => {
  it('Given an image already within the max edge, When target dimensions are computed, Then the original size is kept unchanged', () => {
    expect(computeTargetDimensions(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('Given a landscape image wider than the max edge, When target dimensions are computed, Then it scales down to the max edge preserving aspect ratio', () => {
    expect(computeTargetDimensions(3840, 2160)).toEqual({ width: MAX_IMAGE_EDGE_PX, height: 720 });
  });

  it('Given a portrait image taller than the max edge, When target dimensions are computed, Then it scales down to the max edge preserving aspect ratio', () => {
    expect(computeTargetDimensions(2160, 3840)).toEqual({ width: 720, height: MAX_IMAGE_EDGE_PX });
  });

  it('Given a square image larger than the max edge, When target dimensions are computed, Then both sides clamp to the max edge', () => {
    expect(computeTargetDimensions(4000, 4000)).toEqual({ width: MAX_IMAGE_EDGE_PX, height: MAX_IMAGE_EDGE_PX });
  });

  it('Given zero, negative or non-finite dimensions, When target dimensions are computed, Then zero dimensions are returned rather than NaN or a negative canvas size', () => {
    expect(computeTargetDimensions(0, 100)).toEqual({ width: 0, height: 0 });
    expect(computeTargetDimensions(-50, 100)).toEqual({ width: 0, height: 0 });
    expect(computeTargetDimensions(Number.NaN, 100)).toEqual({ width: 0, height: 0 });
    expect(computeTargetDimensions(100, Number.POSITIVE_INFINITY)).toEqual({ width: 0, height: 0 });
  });
});
