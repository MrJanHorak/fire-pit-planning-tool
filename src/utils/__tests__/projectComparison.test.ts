import { describe, expect, it } from 'vitest';
import { MasonryEngine } from '../../engine/MasonryEngine';
import type { MasonryInput } from '../../types';
import { buildProjectComparisonMetrics } from '../projectComparison';

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

describe('project comparison metrics', () => {
  it('builds side-by-side metrics with numeric deltas', () => {
    const engine = new MasonryEngine();
    const leftInput = baseInput;
    const rightInput = { ...baseInput, innerDiameterIn: 42, wallHeightIn: 20 };
    const leftOutput = engine.calculateDesign(leftInput);
    const rightOutput = engine.calculateDesign(rightInput);

    const metrics = buildProjectComparisonMetrics(
      leftInput,
      leftOutput,
      rightInput,
      rightOutput,
    );

    const unitsMetric = metrics.find((metric) => metric.key === 'total-units');
    const heightMetric = metrics.find((metric) => metric.key === 'wall-height');
    expect(metrics.length).toBeGreaterThan(5);
    expect(unitsMetric?.delta).toBeDefined();
    expect(heightMetric?.delta).toContain('in');
  });
});
