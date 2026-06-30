import { describe, expect, it } from 'vitest';
import { MasonryEngine } from '../../engine/MasonryEngine';
import type { MasonryInput } from '../../types';
import { buildRegionalCodeReview } from '../regionalCodeReview';

const baseInput: MasonryInput = {
  planShape: 'circular',
  innerDiameterIn: 36,
  innerWidthIn: 36,
  innerDepthIn: 30,
  wallHeightIn: 18,
  proximityToStructuresFt: 12,
  fuelType: 'propane',
  linerType: 'steel-ring',
  expansionGapIn: 0.5,
  mortarJointIn: 0.375,
  orientation: 'stretcher',
  capOrientation: 'match-wall',
  bondPattern: 'running-bond',
  ventCount: 4,
  ventOpeningAreaSqIn: 5,
  gasLineEntryAngleDeg: 225,
  capstoneOverhangIn: 2,
  capPlacementMode: 'outward-only',
  soilType: 'dense-granular',
  drainageCondition: 'well-drained',
  frostClimate: false,
  frostLineDepthIn: 0,
  regionalCodeProfile: 'ibc-general',
  hoaConstraintLevel: 'unknown',
  capstonePresetKey: 'matching',
};

describe('regional code review', () => {
  it('fails when structure setback is below 10 ft', () => {
    const input = { ...baseInput, proximityToStructuresFt: 8 };
    const output = new MasonryEngine().calculateDesign(input);
    const review = buildRegionalCodeReview(input, output);

    expect(review.overallStatus).toBe('fail');
    expect(review.checks.some((check) => check.status === 'fail')).toBe(true);
  });

  it('adds HOA review for strict HOA mode', () => {
    const input = { ...baseInput, hoaConstraintLevel: 'strict' as const };
    const output = new MasonryEngine().calculateDesign(input);
    const review = buildRegionalCodeReview(input, output);

    const hoaCheck = review.checks.find((check) => check.key === 'hoa-rules');
    expect(hoaCheck?.status).toBe('review');
  });

  it('flags frost-line review when local depth exceeds baseline', () => {
    const input = { ...baseInput, frostClimate: true, frostLineDepthIn: 24 };
    const output = new MasonryEngine().calculateDesign(input);
    const review = buildRegionalCodeReview(input, output);

    const frostCheck = review.checks.find((check) => check.key === 'frost-line');
    expect(frostCheck?.status).toBe('review');
    expect(frostCheck?.detail).toContain('exceeds modeled stone depth');
  });
});
