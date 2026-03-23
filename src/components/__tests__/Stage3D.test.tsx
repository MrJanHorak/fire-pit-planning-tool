import { describe, expect, it } from 'vitest';
import { MasonryEngine } from '../../engine/MasonryEngine';
import type { MasonryInput } from '../../types';
import {
  buildCircularCapBrickQuad,
  buildCircularCapJointQuad,
  computeStage3DGeometry,
  isHalfRoundCapUnit,
} from '../Stage3D';

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
  bondPattern: 'running-bond',
  ventCount: 4,
  ventOpeningAreaSqIn: 5,
  gasLineEntryAngleDeg: 225,
  capstoneOverhangIn: 2,
  capPlacementMode: 'outward-only',
  capstonePresetKey: 'matching',
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

  it('builds circular cap mortar wedges that widen toward the outside face', () => {
    const engine = new MasonryEngine();
    const output = engine.calculateDesign(baseInput);
    const geometry = computeStage3DGeometry(output);
    const jointQuad = buildCircularCapJointQuad({
      centerlineRadiusFt: geometry.capRadiusFt,
      innerRadiusFt: output.capstone.capInnerDiameterIn / 2 / 12,
      outerRadiusFt: output.capstone.capOuterDiameterIn / 2 / 12,
      actualJointIn: output.capstone.joint.actualJointIn,
    });
    const innerSpanFt = Math.hypot(
      jointQuad.rightInner.x - jointQuad.leftInner.x,
      jointQuad.rightInner.z - jointQuad.leftInner.z,
    );
    const outerSpanFt = Math.hypot(
      jointQuad.rightOuter.x - jointQuad.leftOuter.x,
      jointQuad.rightOuter.z - jointQuad.leftOuter.z,
    );

    expect(jointQuad.polygonPoints).toHaveLength(4);
    expect(outerSpanFt).toBeGreaterThan(innerSpanFt);
    expect(jointQuad.leftOuter.z).toBeGreaterThan(jointQuad.leftInner.z);
  });

  it('builds circular cap units as wedges with longer outer face', () => {
    const engine = new MasonryEngine();
    const output = engine.calculateDesign(baseInput);
    const geometry = computeStage3DGeometry(output);
    const brickQuad = buildCircularCapBrickQuad({
      centerlineRadiusFt: geometry.capRadiusFt,
      innerRadiusFt: output.capstone.capInnerDiameterIn / 2 / 12,
      outerRadiusFt: output.capstone.capOuterDiameterIn / 2 / 12,
      brickLengthIn: output.resolvedCapUnit.lengthIn,
    });
    const innerSpanFt = Math.hypot(
      brickQuad.rightInner.x - brickQuad.leftInner.x,
      brickQuad.rightInner.z - brickQuad.leftInner.z,
    );
    const outerSpanFt = Math.hypot(
      brickQuad.rightOuter.x - brickQuad.leftOuter.x,
      brickQuad.rightOuter.z - brickQuad.leftOuter.z,
    );

    expect(brickQuad.polygonPoints).toHaveLength(4);
    expect(outerSpanFt).toBeGreaterThan(innerSpanFt);
    expect(brickQuad.leftOuter.z).toBeGreaterThan(brickQuad.leftInner.z);
  });

  it('uses resolved unit height and liner dimensions in stage geometry', () => {
    const engine = new MasonryEngine();
    const output = engine.calculateDesign({
      ...baseInput,
      brickPresetKey: 'queen',
      linerType: 'fire-brick',
      expansionGapIn: 0.75,
    });

    const geometry = computeStage3DGeometry(output);

    expect(geometry.courseRiseFt).toBeCloseTo((2.75 + 0.375) / 12);
    expect(geometry.linerOuterRadiusFt).toBeCloseTo(34.5 / 2 / 12);
    expect(geometry.linerInnerRadiusFt).toBeGreaterThan(0);
  });

  it('returns span geometry for rectangular plans', () => {
    const engine = new MasonryEngine();
    const output = engine.calculateDesign({
      ...baseInput,
      planShape: 'rectangular',
      innerWidthIn: 48,
      innerDepthIn: 30,
    });

    const geometry = computeStage3DGeometry(output);

    expect(geometry.planShape).toBe('rectangular');
    expect(geometry.wallSpanWidthFt).toBeCloseTo(
      output.centerlineSpanWidthIn / 12,
    );
    expect(geometry.wallSpanDepthFt).toBeCloseTo(
      output.centerlineSpanDepthIn / 12,
    );
  });

  it('detects half-round coping cap units by name', () => {
    expect(isHalfRoundCapUnit('Half-Round Coping')).toBe(true);
    expect(isHalfRoundCapUnit('Cap Block')).toBe(false);
  });
});
