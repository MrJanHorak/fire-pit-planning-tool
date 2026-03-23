import { describe, expect, it } from 'vitest';
import { MasonryEngine } from '../../engine/MasonryEngine';
import type { MasonryInput } from '../../types';
import { buildFoundationAdvisory } from '../foundationAdvisory';

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
  capstonePresetKey: 'matching',
};

describe('foundation advisory', () => {
  it('returns low risk for dense granular well-drained sites', () => {
    const output = new MasonryEngine().calculateDesign(baseInput);
    const advisory = buildFoundationAdvisory(baseInput, output);

    expect(advisory.risk).toBe('low');
    expect(advisory.heading).toContain('Baseline');
  });

  it('returns moderate risk for unknown site conditions', () => {
    const input = {
      ...baseInput,
      soilType: 'unknown' as const,
      drainageCondition: 'unknown' as const,
    };
    const output = new MasonryEngine().calculateDesign(input);
    const advisory = buildFoundationAdvisory(input, output);

    expect(advisory.risk).toBe('moderate');
    expect(advisory.heading).toContain('Moderate');
  });

  it('returns high risk for expansive clay in freeze-thaw climate', () => {
    const input = {
      ...baseInput,
      soilType: 'clay-expansive' as const,
      drainageCondition: 'slow-draining' as const,
      frostClimate: true,
    };
    const output = new MasonryEngine().calculateDesign(input);
    const advisory = buildFoundationAdvisory(input, output);

    expect(advisory.risk).toBe('high');
    expect(advisory.heading).toContain('High');
  });

  it('returns high risk for very large footprints even on otherwise stable sites', () => {
    const input = {
      ...baseInput,
      innerDiameterIn: 84,
    };
    const output = new MasonryEngine().calculateDesign(input);
    const advisory = buildFoundationAdvisory(input, output);

    expect(output.foundation.footprintDiameterIn).toBeGreaterThanOrEqual(96);
    expect(advisory.risk).toBe('high');
  });
});
