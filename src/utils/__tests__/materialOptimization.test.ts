import { describe, expect, it } from 'vitest';
import { MasonryEngine } from '../../engine/MasonryEngine';
import type { MasonryInput } from '../../types';
import { buildMaterialOptimizationSuggestions } from '../materialOptimization';

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
  capstonePresetKey: 'matching',
};

describe('material optimization suggestions', () => {
  it('suggests no-cut diameter optimization when taper cuts are required', () => {
    const output = new MasonryEngine().calculateDesign(baseInput);
    const suggestions = buildMaterialOptimizationSuggestions(baseInput, output);

    expect(
      suggestions.some((suggestion) => suggestion.key === 'wall-no-cut-diameter'),
    ).toBe(true);
  });

  it('suggests liner/fuel cost alignment for gas pits with fire-brick liner', () => {
    const input = { ...baseInput, linerType: 'fire-brick' as const };
    const output = new MasonryEngine().calculateDesign(input);
    const suggestions = buildMaterialOptimizationSuggestions(input, output);

    expect(
      suggestions.some((suggestion) => suggestion.key === 'liner-fuel-match'),
    ).toBe(true);
  });
});
