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

  it('adds overhead clearance review when overhead spacing is tight', () => {
    const input = { ...baseInput, overheadClearanceFt: 10 };
    const output = new MasonryEngine().calculateDesign(input);
    const review = buildRegionalCodeReview(input, output);

    const overheadCheck = review.checks.find(
      (check) => check.key === 'vertical-clearance',
    );
    expect(overheadCheck?.status).toBe('review');
  });

  it('applies fuel-specific overhead clearance baseline in regional review', () => {
    const gasInput = { ...baseInput, fuelType: 'propane' as const, overheadClearanceFt: 18 };
    const woodInput = { ...baseInput, fuelType: 'wood' as const, overheadClearanceFt: 18 };

    const gasReview = buildRegionalCodeReview(
      gasInput,
      new MasonryEngine().calculateDesign(gasInput),
    );
    const woodReview = buildRegionalCodeReview(
      woodInput,
      new MasonryEngine().calculateDesign(woodInput),
    );

    const gasOverhead = gasReview.checks.find(
      (check) => check.key === 'vertical-clearance',
    );
    const woodOverhead = woodReview.checks.find(
      (check) => check.key === 'vertical-clearance',
    );

    expect(gasOverhead?.status).toBe('pass');
    expect(woodOverhead?.status).toBe('review');
  });
});
