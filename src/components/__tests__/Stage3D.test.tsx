import { describe, expect, it } from 'vitest';
import { MasonryEngine } from '../../engine/MasonryEngine';
import type { MasonryInput } from '../../types';
import { computeStage3DGeometry } from '../Stage3D';

const baseInput: MasonryInput = {
  innerDiameterIn: 36,
  wallHeightIn: 18,
  proximityToStructuresFt: 12,
  fuelType: 'propane',
  mortarJointIn: 0.375,
  orientation: 'stretcher',
  bondPattern: 'running-bond',
  ventCount: 4,
  capstoneOverhangIn: 2,
};

describe('Stage3D geometry', () => {
  it('uses capstone centerline diameter for cap ring radius', () => {
    const engine = new MasonryEngine();
    const output = engine.calculateDesign(baseInput);

    const geometry = computeStage3DGeometry(output);
    const expectedCapRadiusFt =
      output.capstone.capCenterlineDiameterIn / 2 / 12;

    expect(geometry.capRadiusFt).toBeCloseTo(expectedCapRadiusFt);
    expect(geometry.capRadiusFt).toBeGreaterThan(geometry.wallRadiusFt);
  });

  it('shows larger cap radius when overhang increases', () => {
    const engine = new MasonryEngine();
    const compact = computeStage3DGeometry(
      engine.calculateDesign({ ...baseInput, capstoneOverhangIn: 0.5 }),
    );
    const wide = computeStage3DGeometry(
      engine.calculateDesign({ ...baseInput, capstoneOverhangIn: 3 }),
    );

    expect(wide.capRadiusFt).toBeGreaterThan(compact.capRadiusFt);
  });
});
