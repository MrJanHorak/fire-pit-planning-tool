import { describe, expect, it } from 'vitest';
import { MasonryEngine } from '../MasonryEngine';
import type { MasonryInput } from '../../types';

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

describe('MasonryEngine', () => {
  it('matches circular unit counts near industry table for 36 in pit with 8 in modular units (~15/course)', () => {
    const engine = new MasonryEngine();
    const output = engine.calculateDesign(baseInput);

    expect(output.unitsPerCourseRaw).toBeGreaterThan(15);
    expect(output.unitsPerCourseRaw).toBeLessThan(16);
    expect(output.unitsPerCourseRounded).toBe(15);
    expect(output.cutPlan.requiresCutting).toBe(true);
    expect(output.cutPlan.recommendedTaperPerBrickIn).toBeGreaterThan(0);
  });

  it('applies running bond 50% offset each alternate course', () => {
    const engine = new MasonryEngine();
    const output = engine.calculateDesign(baseInput);

    expect(output.courses[0].offsetIn).toBe(0);
    expect(output.courses[1].offsetIn).toBeCloseTo((7.625 + 0.375) / 2);
  });

  it('puts propane vents at base and natural gas vents near top', () => {
    const engine = new MasonryEngine();

    const propane = engine.calculateDesign({
      ...baseInput,
      fuelType: 'propane',
    });
    const naturalGas = engine.calculateDesign({
      ...baseInput,
      fuelType: 'natural-gas',
    });

    expect(propane.ventSpec.placement).toBe('base');
    expect(propane.ventSpec.targetCourseIndexes).toEqual([0]);
    expect(propane.ventSpec.layout).toBe('opposed-pairs');
    expect(naturalGas.ventSpec.placement).toBe('upper');
    expect(naturalGas.ventSpec.targetCourseIndexes[0]).toBe(
      naturalGas.courses.length - 1,
    );
  });

  it('builds a liner spec with expansion gap data', () => {
    const engine = new MasonryEngine();
    const output = engine.calculateDesign({
      ...baseInput,
      fuelType: 'wood',
      linerType: 'fire-brick',
      expansionGapIn: 0.75,
    });

    expect(output.linerSpec.enabled).toBe(true);
    expect(output.linerSpec.recommended).toBe(true);
    expect(output.linerSpec.type).toBe('fire-brick');
    expect(output.linerSpec.expansionGapIn).toBe(0.75);
    expect(output.linerSpec.linerOuterDiameterIn).toBeCloseTo(34.5);
  });

  it('warns when wood fuel is selected without a liner', () => {
    const engine = new MasonryEngine();
    const output = engine.calculateDesign({
      ...baseInput,
      fuelType: 'wood',
      linerType: 'none',
    });

    expect(
      output.warnings.some(
        (warning) => warning.code === 'wood-liner-recommended',
      ),
    ).toBe(true);
  });

  it('warns when gas vent area is outside the recommended range', () => {
    const engine = new MasonryEngine();
    const output = engine.calculateDesign({
      ...baseInput,
      ventCount: 2,
      ventOpeningAreaSqIn: 4,
    });

    expect(output.ventSpec.totalOpenAreaSqIn).toBe(8);
    expect(
      output.warnings.some(
        (warning) => warning.code === 'gas-vent-area-out-of-range',
      ),
    ).toBe(true);
  });

  it('auto-adjusts gas line entry when requested angle lands on a vent opening', () => {
    const engine = new MasonryEngine();
    const output = engine.calculateDesign({
      ...baseInput,
      gasLineEntryAngleDeg: 0,
    });

    expect(output.ventSpec.gasLineEntryClear).toBe(true);
    expect(output.ventSpec.gasLineAutoAdjusted).toBe(true);
    expect(
      output.warnings.some((warning) => warning.code === 'gas-line-near-vent'),
    ).toBe(false);
  });

  it('warns when structures are closer than 10 ft', () => {
    const engine = new MasonryEngine();

    const output = engine.calculateDesign({
      ...baseInput,
      proximityToStructuresFt: 8,
    });

    expect(
      output.warnings.some((warning) => warning.code === 'clearance-too-low'),
    ).toBe(true);
  });

  it('adds shim spacer units when shim spacer strategy is selected', () => {
    const engine = new MasonryEngine();
    const uniform = engine.calculateDesign(baseInput);
    const shimmed = engine.calculateDesign({
      ...baseInput,
      wallCourseStrategy: 'shim-spacer',
      shimUnitLengthIn: 1.25,
      shimFrequency: 1,
    });

    expect(shimmed.courseStrategy.strategy).toBe('shim-spacer');
    expect(shimmed.courseStrategy.shimUnitCount).toBeGreaterThan(0);
    expect(shimmed.totalUnits).toBeGreaterThan(uniform.totalUnits);
    expect(shimmed.courseStrategy.shimUnit).toBeDefined();
    expect(shimmed.courses[0].spacerIndexes?.length).toBe(
      shimmed.courses[0].spacerCount,
    );
  });

  it('applies vented accent recipe on configured cycle position', () => {
    const engine = new MasonryEngine();
    const output = engine.calculateDesign({
      ...baseInput,
      wallCourseStrategy: 'vented-accent',
      accentCycleLength: 3,
      accentCoursePosition: 2,
      accentCourseOrientation: 'header',
      accentJointMultiplier: 1.8,
    });

    expect(output.courseStrategy.strategy).toBe('vented-accent');
    expect(output.courseStrategy.accentCourseIndexes).toContain(1);
    expect(output.courses[1].specialCourse).toBe('vented-accent');
    expect(output.courses[1].orientation).toBe('header');
    expect(output.courses[1].jointIn).toBeCloseTo(
      baseInput.mortarJointIn * 1.8,
    );
  });

  it('calculates purchased units and logistics with waste factor', () => {
    const engine = new MasonryEngine();
    const output = engine.calculateDesign(baseInput);

    expect(output.logistics.wasteFactorPct).toBe(15);
    expect(output.logistics.purchasedUnits).toBe(
      Math.ceil(output.totalUnits * 1.15),
    );
    expect(output.logistics.estimatedBrickWeightLb).toBeGreaterThan(
      output.totalUnits * 4,
    );
    expect(output.logistics.purchasedCapUnits).toBeGreaterThan(0);
    expect(output.logistics.estimatedCapWeightLb).toBeGreaterThan(0);
    expect(output.logistics.estimatedStoneWeightLb).toBeGreaterThan(
      output.foundation.stoneVolumeCubicFeet * 100,
    );
    expect(output.logistics.estimatedMortarVolumeCubicFeet).toBeGreaterThan(0);
  });

  it('increases cap course count when capstone overhang increases', () => {
    const engine = new MasonryEngine();
    const compactCap = engine.calculateDesign({
      ...baseInput,
      capstoneOverhangIn: 0.5,
    });
    const wideCap = engine.calculateDesign({
      ...baseInput,
      capstoneOverhangIn: 2.5,
    });

    expect(wideCap.capstone.capOuterDiameterIn).toBeGreaterThan(
      compactCap.capstone.capOuterDiameterIn,
    );
    expect(wideCap.capstone.capUnitsPerCourseRounded).toBeGreaterThan(
      compactCap.capstone.capUnitsPerCourseRounded,
    );
  });

  it('applies capstone overhang outward without shifting centerline by double overhang', () => {
    const engine = new MasonryEngine();
    const noOverhang = engine.calculateDesign({
      ...baseInput,
      capstoneOverhangIn: 0,
    });
    const wideCap = engine.calculateDesign({
      ...baseInput,
      capstoneOverhangIn: 2,
    });

    expect(wideCap.capstone.capCourseWidthIn).toBeCloseTo(
      wideCap.resolvedUnit.widthIn + 2,
    );
    expect(
      wideCap.capstone.capCenterlineDiameterIn -
        noOverhang.capstone.capCenterlineDiameterIn,
    ).toBeCloseTo(2);
  });

  it('supports symmetric cap placement that extends inward and outward equally', () => {
    const engine = new MasonryEngine();
    const output = engine.calculateDesign({
      ...baseInput,
      capPlacementMode: 'symmetric',
      capstoneOverhangIn: 2,
    });

    expect(output.capstone.innerExtensionIn).toBeCloseTo(1);
    expect(output.capstone.outerExtensionIn).toBeCloseTo(1);
    expect(output.capstone.capInnerDiameterIn).toBeLessThan(
      output.innerSpanWidthIn,
    );
  });

  it('computes circular cap joint widths from the resolved cap ring perimeter', () => {
    const engine = new MasonryEngine();
    const output = engine.calculateDesign(baseInput);
    const capCircumferenceIn =
      Math.PI * output.capstone.capCenterlineDiameterIn;
    const rebuiltCircumferenceIn =
      output.capstone.capUnitsPerCourseRounded *
      (output.resolvedCapUnit.lengthIn + output.capstone.joint.actualJointIn);

    expect(output.capstone.joint.actualModuleSpacingIn).toBeCloseTo(
      capCircumferenceIn / output.capstone.capUnitsPerCourseRounded,
    );
    expect(rebuiltCircumferenceIn).toBeCloseTo(capCircumferenceIn, 6);
    expect(output.capstone.joint.actualJointIn).toBeGreaterThan(0);
    expect(output.capstone.joint.outerJointIn).toBeGreaterThan(
      output.capstone.joint.innerJointIn,
    );
  });

  it('uses selected capstone preset dimensions and weight estimate', () => {
    const engine = new MasonryEngine();
    const output = engine.calculateDesign({
      ...baseInput,
      capstonePresetKey: 'flatStone',
    });

    expect(output.resolvedCapUnit.name).toContain('Flat Stone');
    expect(output.resolvedCapUnit.lengthIn).toBeCloseTo(16);
    expect(output.logistics.estimatedCapWeightLb).toBeGreaterThan(
      output.logistics.purchasedCapUnits * 10,
    );
  });

  it('supports independent capstone orientation selection', () => {
    const engine = new MasonryEngine();
    const matchWall = engine.calculateDesign({
      ...baseInput,
      orientation: 'stretcher',
      capOrientation: 'match-wall',
      capstonePresetKey: 'matching',
    });
    const capHeader = engine.calculateDesign({
      ...baseInput,
      orientation: 'stretcher',
      capOrientation: 'header',
      capstonePresetKey: 'matching',
    });

    expect(matchWall.resolvedCapUnit.lengthIn).toBeCloseTo(
      matchWall.resolvedUnit.lengthIn,
    );
    expect(capHeader.resolvedCapUnit.lengthIn).toBeCloseTo(
      matchWall.resolvedUnit.widthIn,
    );
    expect(capHeader.capstone.capUnitsPerCourseRounded).toBeGreaterThan(
      matchWall.capstone.capUnitsPerCourseRounded,
    );
    expect(capHeader.courses[1].offsetIn).toBeCloseTo(
      (matchWall.resolvedUnit.lengthIn + baseInput.mortarJointIn) / 2,
    );
  });

  it('supports rectangular plans with shape-aware spans and quantities', () => {
    const engine = new MasonryEngine();
    const output = engine.calculateDesign({
      ...baseInput,
      planShape: 'rectangular',
      innerWidthIn: 42,
      innerDepthIn: 30,
    });

    expect(output.planShape).toBe('rectangular');
    expect(output.innerSpanWidthIn).toBe(42);
    expect(output.innerSpanDepthIn).toBe(30);
    expect(output.outerSpanWidthIn).toBeGreaterThan(output.innerSpanWidthIn);
    expect(output.foundation.footprintWidthIn).toBeGreaterThan(
      output.outerSpanWidthIn,
    );
    expect(output.unitsPerCourseRounded).toBeGreaterThan(0);
    expect(output.cutPlan.requiresCutting).toBe(false);
  });

  it('anchors rectangular vents at side midpoints instead of corners', () => {
    const engine = new MasonryEngine();
    const output = engine.calculateDesign({
      ...baseInput,
      planShape: 'rectangular',
      fuelType: 'natural-gas',
      innerWidthIn: 48,
      innerDepthIn: 30,
      ventCount: 4,
    });

    const perimeter =
      2 * (output.centerlineSpanWidthIn + output.centerlineSpanDepthIn);
    const cornerDistances = [
      0,
      output.centerlineSpanWidthIn,
      output.centerlineSpanWidthIn + output.centerlineSpanDepthIn,
      output.centerlineSpanWidthIn * 2 + output.centerlineSpanDepthIn,
    ];
    const cornerIndexes = cornerDistances.map(
      (distance) =>
        Math.round((distance / perimeter) * output.unitsPerCourseRounded) %
        output.unitsPerCourseRounded,
    );

    expect(output.ventSpec.ventBrickIndexes).toHaveLength(4);
    expect(
      output.ventSpec.ventBrickIndexes.every(
        (index) => !cornerIndexes.includes(index),
      ),
    ).toBe(true);
  });
});
