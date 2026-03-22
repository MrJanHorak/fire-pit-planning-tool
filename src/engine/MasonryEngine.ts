import type {
  CapstoneSpec,
  CoursePlan,
  FoundationSpec,
  LogisticsSpec,
  MasonryInput,
  MasonryOutput,
  MasonryUnit,
  SafetyWarning,
  VentSpec,
} from '../types';

const IN3_PER_FT3 = 1728;
const IN3_PER_YD3 = 46656;
const MODULAR_BRICK_WEIGHT_LB = 4.5;
const STONE_WEIGHT_LB_PER_FT3 = 100;
const BRICK_WASTE_FACTOR_PCT = 15;
const CAP_WASTE_FACTOR_PCT = 10;
const STONE_WASTE_FACTOR_PCT = 10;
const MORTAR_FT3_PER_BRICK = 0.0175;

export const MODULAR_BRICK: MasonryUnit = {
  name: 'Modular Brick',
  widthIn: 3.625,
  heightIn: 2.25,
  lengthIn: 7.625,
};

/** Common US masonry unit sizes (actual dimensions, not nominal). */
export const BRICK_PRESETS: Record<string, MasonryUnit> = {
  modular: { name: 'Modular', widthIn: 3.625, heightIn: 2.25, lengthIn: 7.625 },
  standard: { name: 'Standard', widthIn: 3.75, heightIn: 2.25, lengthIn: 8.0 },
  queen: { name: 'Queen', widthIn: 3.125, heightIn: 2.75, lengthIn: 9.625 },
  king: { name: 'King', widthIn: 3.625, heightIn: 2.75, lengthIn: 9.625 },
  norman: { name: 'Norman', widthIn: 3.625, heightIn: 2.25, lengthIn: 11.625 },
  jumboModular: {
    name: 'Jumbo Modular',
    widthIn: 3.625,
    heightIn: 2.75,
    lengthIn: 7.625,
  },
};

export class MasonryEngine {
  constructor(private readonly defaultUnit: MasonryUnit = MODULAR_BRICK) {}

  public calculateDesign(
    input: MasonryInput,
    unit?: MasonryUnit,
  ): MasonryOutput {
    const resolvedUnit =
      unit ??
      (input.brickPresetKey
        ? BRICK_PRESETS[input.brickPresetKey]
        : undefined) ??
      this.defaultUnit;
    const oriented = this.resolveUnit(input, resolvedUnit);
    const unitsPerCourseRaw = this.calculateCircularUnitCountRaw(
      input.innerDiameterIn,
      oriented.widthIn,
      oriented.lengthIn,
      input.mortarJointIn,
    );
    const unitsPerCourseRounded = Math.max(1, Math.floor(unitsPerCourseRaw));

    const courseCount = Math.max(
      1,
      Math.ceil(input.wallHeightIn / (oriented.heightIn + input.mortarJointIn)),
    );
    const courses = this.buildRunningBondCourses(
      courseCount,
      unitsPerCourseRounded,
      oriented.lengthIn,
      input.mortarJointIn,
    );
    const warnings = this.computeSafetyWarnings(input.proximityToStructuresFt);
    const totalUnits = unitsPerCourseRounded * courseCount;
    const foundation = this.calculateFoundation(
      input.innerDiameterIn + oriented.widthIn * 2,
    );
    const capstone = this.calculateCapstone(
      input.innerDiameterIn,
      oriented.widthIn,
      oriented.lengthIn,
      input.mortarJointIn,
      input.capstoneOverhangIn,
    );

    return {
      effectiveOuterDiameterIn: input.innerDiameterIn + oriented.widthIn * 2,
      centerlineDiameterIn: input.innerDiameterIn + oriented.widthIn,
      courses,
      unitsPerCourseRaw,
      unitsPerCourseRounded,
      totalUnits,
      ventSpec: this.calculateVents(input, courseCount),
      foundation,
      capstone,
      logistics: this.calculateLogistics(
        totalUnits,
        capstone.capUnitsPerCourseRounded,
        foundation,
      ),
      warnings,
    };
  }

  public calculateCircularUnitCountRaw(
    innerDiameterIn: number,
    wallWidthIn: number,
    unitLengthIn: number,
    jointIn: number,
  ): number {
    const outerDiameterIn = innerDiameterIn + 2 * wallWidthIn;
    return (
      (Math.PI * (outerDiameterIn - wallWidthIn)) / (unitLengthIn + jointIn)
    );
  }

  private resolveUnit(input: MasonryInput, unit: MasonryUnit): MasonryUnit {
    if (input.orientation === 'header') {
      return {
        ...unit,
        widthIn: unit.lengthIn,
        lengthIn: unit.widthIn,
      };
    }
    return unit;
  }

  private buildRunningBondCourses(
    courseCount: number,
    unitCount: number,
    unitLengthIn: number,
    jointIn: number,
  ): CoursePlan[] {
    const moduleIn = unitLengthIn + jointIn;

    return Array.from({ length: courseCount }, (_, index) => ({
      courseIndex: index,
      unitCount,
      // Running bond: every other course shifts by half a module.
      offsetIn: index % 2 === 0 ? 0 : moduleIn / 2,
    }));
  }

  private calculateVents(input: MasonryInput, courseCount: number): VentSpec {
    const ventCount = Math.max(2, input.ventCount);
    const totalOpenAreaSqIn = Math.max(18, ventCount * 5);

    if (input.fuelType === 'propane') {
      return {
        ventCount,
        placement: 'base',
        targetCourseIndexes: [0],
        totalOpenAreaSqIn,
      };
    }

    if (input.fuelType === 'natural-gas') {
      return {
        ventCount,
        placement: 'upper',
        targetCourseIndexes: [Math.max(0, courseCount - 1)],
        totalOpenAreaSqIn,
      };
    }

    return {
      ventCount: Math.max(4, ventCount),
      placement: 'base',
      targetCourseIndexes: [0, Math.min(1, Math.max(0, courseCount - 1))],
      totalOpenAreaSqIn,
    };
  }

  private calculateFoundation(outerDiameterIn: number): FoundationSpec {
    const footprintDiameterIn = outerDiameterIn + 12;
    const stoneDepthIn = 8;
    const radiusIn = footprintDiameterIn / 2;
    const stoneVolumeIn3 = Math.PI * radiusIn * radiusIn * stoneDepthIn;

    return {
      footprintDiameterIn,
      stoneDepthIn,
      stoneVolumeCubicFeet: stoneVolumeIn3 / IN3_PER_FT3,
      stoneVolumeCubicYards: stoneVolumeIn3 / IN3_PER_YD3,
    };
  }

  private calculateCapstone(
    innerDiameterIn: number,
    wallWidthIn: number,
    unitLengthIn: number,
    jointIn: number,
    overhangIn: number,
  ): CapstoneSpec {
    const effectiveOuterDiameterIn = innerDiameterIn + wallWidthIn * 2;
    const capOuterDiameterIn = effectiveOuterDiameterIn + overhangIn * 2;
    const capUnitsPerCourseRaw =
      (Math.PI * (capOuterDiameterIn - wallWidthIn)) / (unitLengthIn + jointIn);

    return {
      overhangIn,
      capOuterDiameterIn,
      capCenterlineDiameterIn: capOuterDiameterIn - wallWidthIn,
      capUnitsPerCourseRaw,
      capUnitsPerCourseRounded: Math.max(1, Math.floor(capUnitsPerCourseRaw)),
    };
  }

  private calculateLogistics(
    totalUnits: number,
    capUnits: number,
    foundation: FoundationSpec,
  ): LogisticsSpec {
    const purchasedUnits = Math.ceil(
      totalUnits * (1 + BRICK_WASTE_FACTOR_PCT / 100),
    );
    const purchasedCapUnits = Math.ceil(
      capUnits * (1 + CAP_WASTE_FACTOR_PCT / 100),
    );
    const stoneWithWasteFt3 =
      foundation.stoneVolumeCubicFeet * (1 + STONE_WASTE_FACTOR_PCT / 100);

    return {
      wasteFactorPct: BRICK_WASTE_FACTOR_PCT,
      purchasedUnits,
      purchasedCapUnits,
      estimatedBrickWeightLb: purchasedUnits * MODULAR_BRICK_WEIGHT_LB,
      estimatedCapWeightLb: purchasedCapUnits * MODULAR_BRICK_WEIGHT_LB,
      estimatedStoneWeightLb: stoneWithWasteFt3 * STONE_WEIGHT_LB_PER_FT3,
      estimatedMortarVolumeCubicFeet: purchasedUnits * MORTAR_FT3_PER_BRICK,
    };
  }

  private computeSafetyWarnings(
    proximityToStructuresFt: number,
  ): SafetyWarning[] {
    const warnings: SafetyWarning[] = [];

    if (proximityToStructuresFt < 10) {
      warnings.push({
        code: 'clearance-too-low',
        message:
          'Minimum horizontal clearance is 10 ft from combustible structures.',
        actualValue: proximityToStructuresFt,
        requiredValue: 10,
      });
    }

    return warnings;
  }
}
