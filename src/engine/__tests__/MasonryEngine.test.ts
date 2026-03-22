import { describe, expect, it } from 'vitest';
import { MasonryEngine } from '../MasonryEngine';
import type { MasonryInput } from '../../types';

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

describe('MasonryEngine', () => {
  it('matches circular unit counts near industry table for 36 in pit with 8 in modular units (~15/course)', () => {
    const engine = new MasonryEngine();
    const output = engine.calculateDesign(baseInput);

    expect(output.unitsPerCourseRaw).toBeGreaterThan(15);
    expect(output.unitsPerCourseRaw).toBeLessThan(16);
    expect(output.unitsPerCourseRounded).toBe(15);
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
    expect(naturalGas.ventSpec.placement).toBe('upper');
    expect(naturalGas.ventSpec.targetCourseIndexes[0]).toBe(
      naturalGas.courses.length - 1,
    );
  });

  it('warns when structures are closer than 10 ft', () => {
    const engine = new MasonryEngine();

    const output = engine.calculateDesign({
      ...baseInput,
      proximityToStructuresFt: 8,
    });

    expect(output.warnings).toHaveLength(1);
    expect(output.warnings[0].code).toBe('clearance-too-low');
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
});
