import type {
  CapstoneSpec,
  CoursePlan,
  CutPlanSpec,
  FoundationSpec,
  LinerSpec,
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

interface CapstonePreset {
  unit: MasonryUnit;
  unitWeightLb: number;
}

interface PlanMetrics {
  planShape: MasonryInput['planShape'];
  innerWidthIn: number;
  innerDepthIn: number;
  centerlineWidthIn: number;
  centerlineDepthIn: number;
  outerWidthIn: number;
  outerDepthIn: number;
}

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
  closure: {
    name: 'Closure Brick',
    widthIn: 3.625,
    heightIn: 3.625,
    lengthIn: 7.625,
  },
  utility: {
    name: 'Utility Brick',
    widthIn: 3.625,
    heightIn: 3.625,
    lengthIn: 11.625,
  },
  paver: {
    name: 'Clay Paver (Edge/Ring)',
    widthIn: 3.75,
    heightIn: 2.25,
    lengthIn: 8.0,
  },
  fireBrickSplits: {
    name: 'Fire Brick Split',
    widthIn: 4.5,
    heightIn: 1.25,
    lengthIn: 9.0,
  },
  fireBrickFull: {
    name: 'Fire Brick Full',
    widthIn: 4.5,
    heightIn: 2.5,
    lengthIn: 9.0,
  },
  bullnose: {
    name: 'Bullnose Face Brick',
    widthIn: 3.625,
    heightIn: 2.25,
    lengthIn: 7.625,
  },
  radialFace: {
    name: 'Radial Face Brick (Avg)',
    widthIn: 3.625,
    heightIn: 2.25,
    lengthIn: 7.5,
  },
  radialFireBrick: {
    name: 'Radial Fire Brick (Avg)',
    widthIn: 4.5,
    heightIn: 2.5,
    lengthIn: 8.75,
  },
};

export const CAPSTONE_PRESETS: Record<string, CapstonePreset> = {
  matching: {
    unit: {
      name: 'Matching Brick',
      widthIn: 3.625,
      heightIn: 2.25,
      lengthIn: 7.625,
    },
    unitWeightLb: 4.5,
  },
  flatStone: {
    unit: { name: 'Flat Stone Cap', widthIn: 12, heightIn: 2, lengthIn: 16 },
    unitWeightLb: 22,
  },
  capBlock: {
    unit: { name: 'Cap Block', widthIn: 8, heightIn: 2, lengthIn: 12 },
    unitWeightLb: 16,
  },
  rowlock: {
    unit: {
      name: 'Rowlock Brick',
      widthIn: 7.625,
      heightIn: 2.25,
      lengthIn: 3.625,
    },
    unitWeightLb: 4.5,
  },
  bullnoseCap: {
    unit: { name: 'Bullnose Cap', widthIn: 10, heightIn: 2, lengthIn: 14 },
    unitWeightLb: 18,
  },
  radiusCap: {
    unit: { name: 'Radius Wall Cap', widthIn: 11, heightIn: 2, lengthIn: 14 },
    unitWeightLb: 19,
  },
  chamferCap: {
    unit: { name: 'Chamfered Cap', widthIn: 11.5, heightIn: 2, lengthIn: 14 },
    unitWeightLb: 20,
  },
  copingCap: {
    unit: {
      name: 'Concrete Coping Cap',
      widthIn: 12,
      heightIn: 2.5,
      lengthIn: 16,
    },
    unitWeightLb: 26,
  },
  halfRoundCoping: {
    unit: {
      name: 'Half-Round Coping',
      widthIn: 12,
      heightIn: 2.5,
      lengthIn: 16,
    },
    unitWeightLb: 25,
  },
};

export class MasonryEngine {
  constructor(private readonly defaultUnit: MasonryUnit = MODULAR_BRICK) {}

  public calculateDesign(
    input: MasonryInput,
    unit?: MasonryUnit,
  ): MasonryOutput {
    const resolvedUnit = unit ?? this.resolveRequestedWallUnit(input);
    const oriented = this.resolveUnit(input, resolvedUnit);
    const resolvedCap = this.resolveCapUnit(input, oriented);
    const planMetrics = this.resolvePlanMetrics(input, oriented.widthIn);
    const unitsPerCourseRaw = this.calculatePlanUnitCountRaw(
      planMetrics,
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
    const totalUnits = unitsPerCourseRounded * courseCount;
    const linerSpec = this.calculateLiner(input, planMetrics);
    const ventSpec = this.calculateVents(
      input,
      planMetrics,
      courseCount,
      unitsPerCourseRounded,
    );
    const cutPlan = this.calculateCutPlan(
      planMetrics,
      oriented.lengthIn,
      input.mortarJointIn,
      unitsPerCourseRounded,
    );
    const foundation = this.calculateFoundation(planMetrics);
    const capstone = this.calculateCapstone(
      planMetrics,
      oriented.widthIn,
      resolvedCap.unit.widthIn,
      resolvedCap.unit.lengthIn,
      input.mortarJointIn,
      input.capstoneOverhangIn,
      input.capPlacementMode,
    );
    const warnings = this.computeSafetyWarnings(input, ventSpec, cutPlan);

    return {
      planShape: planMetrics.planShape,
      innerSpanWidthIn: planMetrics.innerWidthIn,
      innerSpanDepthIn: planMetrics.innerDepthIn,
      outerSpanWidthIn: planMetrics.outerWidthIn,
      outerSpanDepthIn: planMetrics.outerDepthIn,
      effectiveOuterDiameterIn: Math.max(
        planMetrics.outerWidthIn,
        planMetrics.outerDepthIn,
      ),
      centerlineDiameterIn: Math.max(
        planMetrics.centerlineWidthIn,
        planMetrics.centerlineDepthIn,
      ),
      centerlineSpanWidthIn: planMetrics.centerlineWidthIn,
      centerlineSpanDepthIn: planMetrics.centerlineDepthIn,
      mortarJointIn: input.mortarJointIn,
      resolvedUnit: oriented,
      resolvedCapUnit: resolvedCap.unit,
      courses,
      unitsPerCourseRaw,
      unitsPerCourseRounded,
      totalUnits,
      ventSpec,
      cutPlan,
      linerSpec,
      foundation,
      capstone,
      logistics: this.calculateLogistics(
        totalUnits,
        capstone.capUnitsPerCourseRounded,
        resolvedCap.unitWeightLb,
        foundation,
      ),
      warnings,
    };
  }

  private sanitizeDim(value: number | undefined, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.max(0.5, value);
    }
    return fallback;
  }

  private calculateUnitWeightLb(unit: MasonryUnit): number {
    const densityLbPerIn3 = 0.07;
    return Math.max(
      1,
      unit.widthIn * unit.heightIn * unit.lengthIn * densityLbPerIn3,
    );
  }

  private resolveRequestedWallUnit(input: MasonryInput): MasonryUnit {
    if (input.brickPresetKey === 'custom') {
      return {
        name: 'Custom Brick',
        lengthIn: this.sanitizeDim(input.customBrickLengthIn, 7.625),
        widthIn: this.sanitizeDim(input.customBrickWidthIn, 3.625),
        heightIn: this.sanitizeDim(input.customBrickHeightIn, 2.25),
      };
    }

    if (input.brickPresetKey === 'custom-radial') {
      const innerLengthIn = this.sanitizeDim(
        input.customBrickInnerLengthIn,
        7.25,
      );
      const outerLengthIn = this.sanitizeDim(input.customBrickOuterLengthIn, 8);

      return {
        name: 'Custom Radial Brick (Avg)',
        lengthIn: (innerLengthIn + outerLengthIn) / 2,
        widthIn: this.sanitizeDim(input.customBrickWidthIn, 3.625),
        heightIn: this.sanitizeDim(input.customBrickHeightIn, 2.25),
      };
    }

    return input.brickPresetKey
      ? (BRICK_PRESETS[input.brickPresetKey] ?? this.defaultUnit)
      : this.defaultUnit;
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

  private resolvePlanMetrics(
    input: MasonryInput,
    wallWidthIn: number,
  ): PlanMetrics {
    const innerWidthIn =
      input.planShape === 'circular'
        ? input.innerDiameterIn
        : input.planShape === 'square'
          ? input.innerWidthIn
          : input.innerWidthIn;
    const innerDepthIn =
      input.planShape === 'rectangular' ? input.innerDepthIn : innerWidthIn;

    return {
      planShape: input.planShape,
      innerWidthIn,
      innerDepthIn,
      centerlineWidthIn: innerWidthIn + wallWidthIn,
      centerlineDepthIn: innerDepthIn + wallWidthIn,
      outerWidthIn: innerWidthIn + wallWidthIn * 2,
      outerDepthIn: innerDepthIn + wallWidthIn * 2,
    };
  }

  private calculatePlanUnitCountRaw(
    planMetrics: PlanMetrics,
    unitLengthIn: number,
    jointIn: number,
  ): number {
    if (planMetrics.planShape === 'circular') {
      return (
        (Math.PI * planMetrics.centerlineWidthIn) / (unitLengthIn + jointIn)
      );
    }

    return (
      this.calculateRectangularPerimeter(
        planMetrics.centerlineWidthIn,
        planMetrics.centerlineDepthIn,
      ) /
      (unitLengthIn + jointIn)
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

  private resolveCapUnit(
    input: MasonryInput,
    wallUnit: MasonryUnit,
  ): CapstonePreset {
    if (!input.capstonePresetKey || input.capstonePresetKey === 'matching') {
      return {
        unit: {
          name: 'Matching Brick',
          widthIn: wallUnit.widthIn,
          heightIn: wallUnit.heightIn,
          lengthIn: wallUnit.lengthIn,
        },
        unitWeightLb: this.calculateUnitWeightLb(wallUnit),
      };
    }

    if (input.capstonePresetKey === 'custom') {
      const unit: MasonryUnit = {
        name: 'Custom Cap Unit',
        lengthIn: this.sanitizeDim(input.customCapLengthIn, 14),
        widthIn: this.sanitizeDim(input.customCapWidthIn, 10),
        heightIn: this.sanitizeDim(input.customCapHeightIn, 2),
      };

      return {
        unit,
        unitWeightLb: this.calculateUnitWeightLb(unit),
      };
    }

    if (input.capstonePresetKey === 'custom-radial') {
      const innerLengthIn = this.sanitizeDim(
        input.customCapInnerLengthIn,
        13.5,
      );
      const outerLengthIn = this.sanitizeDim(
        input.customCapOuterLengthIn,
        14.5,
      );
      const unit: MasonryUnit = {
        name: 'Custom Radial Cap (Avg)',
        lengthIn: (innerLengthIn + outerLengthIn) / 2,
        widthIn: this.sanitizeDim(input.customCapWidthIn, 10),
        heightIn: this.sanitizeDim(input.customCapHeightIn, 2),
      };

      return {
        unit,
        unitWeightLb: this.calculateUnitWeightLb(unit),
      };
    }

    return (
      CAPSTONE_PRESETS[input.capstonePresetKey] ?? CAPSTONE_PRESETS.matching
    );
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
      offsetIn: index % 2 === 0 ? 0 : moduleIn / 2,
    }));
  }

  private calculateLiner(
    input: MasonryInput,
    planMetrics: PlanMetrics,
  ): LinerSpec {
    const thicknessIn = this.getLinerThickness(input.linerType);
    const enabled = input.linerType !== 'none';
    const linerOuterWidthIn = enabled
      ? Math.max(0, planMetrics.innerWidthIn - input.expansionGapIn * 2)
      : 0;
    const linerOuterDepthIn = enabled
      ? Math.max(0, planMetrics.innerDepthIn - input.expansionGapIn * 2)
      : 0;
    const linerInnerWidthIn = enabled
      ? Math.max(0, linerOuterWidthIn - thicknessIn * 2)
      : 0;
    const linerInnerDepthIn = enabled
      ? Math.max(0, linerOuterDepthIn - thicknessIn * 2)
      : 0;

    return {
      enabled,
      recommended: input.fuelType === 'wood',
      type: input.linerType,
      thicknessIn,
      expansionGapIn: enabled ? input.expansionGapIn : 0,
      outerShellInnerDiameterIn: Math.max(
        planMetrics.innerWidthIn,
        planMetrics.innerDepthIn,
      ),
      outerShellInnerWidthIn: planMetrics.innerWidthIn,
      outerShellInnerDepthIn: planMetrics.innerDepthIn,
      linerOuterDiameterIn: Math.max(linerOuterWidthIn, linerOuterDepthIn),
      linerOuterWidthIn,
      linerOuterDepthIn,
      linerInnerDiameterIn: Math.max(linerInnerWidthIn, linerInnerDepthIn),
      linerInnerWidthIn,
      linerInnerDepthIn,
      description: this.describeLiner(input.fuelType, input.linerType),
    };
  }

  private calculateVents(
    input: MasonryInput,
    planMetrics: PlanMetrics,
    courseCount: number,
    unitCount: number,
  ): VentSpec {
    const ventCount =
      input.fuelType === 'wood'
        ? Math.max(4, input.ventCount)
        : Math.max(2, input.ventCount);
    const totalOpenAreaSqIn = ventCount * input.ventOpeningAreaSqIn;
    const ventAnchors = this.calculateVentAnchors(planMetrics, ventCount);
    const ventAnglesDeg = ventAnchors.map((anchor) => anchor.ratio * 360);
    const ventBrickIndexes = this.uniqueIndexes(
      ventAnchors.map((anchor) =>
        this.ratioToBrickIndex(anchor.ratio, unitCount),
      ),
    );
    const isGasFuel = input.fuelType !== 'wood';
    const normalizedGasLineAngle = isGasFuel
      ? this.normalizeAngle(input.gasLineEntryAngleDeg)
      : undefined;
    const desiredGasLineEntryBrickIndex =
      normalizedGasLineAngle === undefined
        ? undefined
        : this.angleToBrickIndex(normalizedGasLineAngle, unitCount);
    const { gasLineEntryBrickIndex, gasLineAutoAdjusted } =
      this.resolveGasLineEntry(
        desiredGasLineEntryBrickIndex,
        ventBrickIndexes,
        unitCount,
      );
    const resolvedGasLineAngle =
      gasLineEntryBrickIndex === undefined
        ? normalizedGasLineAngle
        : this.brickIndexToAngle(gasLineEntryBrickIndex, unitCount);
    const crossVentilationValid = !isGasFuel || ventCount % 2 === 0;
    const gasLineEntryClear =
      gasLineEntryBrickIndex === undefined ||
      !ventBrickIndexes.includes(gasLineEntryBrickIndex);
    const layout =
      isGasFuel && crossVentilationValid ? 'opposed-pairs' : 'evenly-spaced';

    if (input.fuelType === 'propane') {
      return {
        ventCount,
        placement: 'base',
        targetCourseIndexes: [0],
        totalOpenAreaSqIn,
        openingAreaSqIn: input.ventOpeningAreaSqIn,
        recommendedAreaMinSqIn: 18,
        recommendedAreaMaxSqIn: 36,
        layout,
        crossVentilationValid,
        ventAnglesDeg,
        ventBrickIndexes,
        gasLineEntryAngleDeg: resolvedGasLineAngle,
        gasLineEntryBrickIndex,
        gasLineEntryClear,
        gasLineAutoAdjusted,
      };
    }

    if (input.fuelType === 'natural-gas') {
      return {
        ventCount,
        placement: 'upper',
        targetCourseIndexes: [Math.max(0, courseCount - 1)],
        totalOpenAreaSqIn,
        openingAreaSqIn: input.ventOpeningAreaSqIn,
        recommendedAreaMinSqIn: 18,
        recommendedAreaMaxSqIn: 36,
        layout,
        crossVentilationValid,
        ventAnglesDeg,
        ventBrickIndexes,
        gasLineEntryAngleDeg: resolvedGasLineAngle,
        gasLineEntryBrickIndex,
        gasLineEntryClear,
        gasLineAutoAdjusted,
      };
    }

    return {
      ventCount,
      placement: 'base',
      targetCourseIndexes: [0, Math.min(1, Math.max(0, courseCount - 1))],
      totalOpenAreaSqIn,
      openingAreaSqIn: input.ventOpeningAreaSqIn,
      recommendedAreaMinSqIn: 18,
      layout: 'evenly-spaced',
      crossVentilationValid: true,
      ventAnglesDeg,
      ventBrickIndexes,
      gasLineEntryClear: true,
      gasLineAutoAdjusted: false,
    };
  }

  private calculateCutPlan(
    planMetrics: PlanMetrics,
    unitLengthIn: number,
    jointIn: number,
    unitCount: number,
  ): CutPlanSpec {
    if (planMetrics.planShape !== 'circular') {
      return {
        requiresCutting: false,
        innerJointIn: jointIn,
        centerlineModuleSpacingIn: unitLengthIn + jointIn,
        recommendedTaperPerBrickIn: 0,
        recommendedCutPerSideIn: 0,
        recommendedCutAngleDeg: 0,
        minimumRecommendedInnerDiameterIn: Math.min(
          planMetrics.innerWidthIn,
          planMetrics.innerDepthIn,
        ),
        notes: [
          'Rectangular and square plans avoid circular wedge compression, but corner units may still need trim cuts for preferred bond layout.',
        ],
      };
    }

    const innerCircumferenceIn = Math.PI * planMetrics.innerWidthIn;
    const centerlineCircumferenceIn = Math.PI * planMetrics.centerlineWidthIn;
    const innerModuleSpacingIn = innerCircumferenceIn / unitCount;
    const centerlineModuleSpacingIn = centerlineCircumferenceIn / unitCount;
    const innerJointIn = innerModuleSpacingIn - unitLengthIn;
    const recommendedTaperPerBrickIn = Math.max(0, -innerJointIn);
    const recommendedCutPerSideIn = recommendedTaperPerBrickIn / 2;
    const wallDepthIn = Math.max(
      0.001,
      planMetrics.outerWidthIn - planMetrics.centerlineWidthIn,
    );
    const recommendedCutAngleDeg =
      (Math.atan(recommendedCutPerSideIn / wallDepthIn) * 180) / Math.PI;
    const minimumRecommendedInnerDiameterIn =
      (unitCount * (unitLengthIn + 0.125)) / Math.PI;
    const requiresCutting = recommendedTaperPerBrickIn > 0;

    return {
      requiresCutting,
      innerJointIn,
      centerlineModuleSpacingIn,
      recommendedTaperPerBrickIn,
      recommendedCutPerSideIn,
      recommendedCutAngleDeg,
      minimumRecommendedInnerDiameterIn,
      notes: requiresCutting
        ? [
            'Inner-face overlap detected for full rectangular units on this radius.',
            `Cut each unit as a wedge with approximately ${recommendedCutPerSideIn.toFixed(3)} in removed per side at the inner face.`,
            `Set the saw fence to approximately ${recommendedCutAngleDeg.toFixed(2)} deg off square on each side cut.`,
            'Alternative: increase inner diameter or use shorter units.',
          ]
        : ['No circular wedge cutting required at the current diameter.'],
    };
  }

  private calculateFoundation(planMetrics: PlanMetrics): FoundationSpec {
    const footprintWidthIn = planMetrics.outerWidthIn + 12;
    const footprintDepthIn = planMetrics.outerDepthIn + 12;
    const footprintDiameterIn = Math.max(footprintWidthIn, footprintDepthIn);
    const stoneDepthIn = 8;
    const footprintAreaIn2 =
      planMetrics.planShape === 'circular'
        ? Math.PI * Math.pow(footprintWidthIn / 2, 2)
        : footprintWidthIn * footprintDepthIn;
    const stoneVolumeIn3 = footprintAreaIn2 * stoneDepthIn;

    return {
      footprintDiameterIn,
      footprintWidthIn,
      footprintDepthIn,
      stoneDepthIn,
      footprintAreaSquareFeet: footprintAreaIn2 / 144,
      stoneVolumeCubicFeet: stoneVolumeIn3 / IN3_PER_FT3,
      stoneVolumeCubicYards: stoneVolumeIn3 / IN3_PER_YD3,
    };
  }

  private calculateCapstone(
    planMetrics: PlanMetrics,
    wallWidthIn: number,
    capUnitWidthIn: number,
    unitLengthIn: number,
    jointIn: number,
    overhangIn: number,
    placementMode: MasonryInput['capPlacementMode'],
  ): CapstoneSpec {
    const requestedInnerExtensionIn =
      placementMode === 'symmetric' ? overhangIn / 2 : 0;
    const requestedOuterExtensionIn =
      placementMode === 'symmetric' ? overhangIn / 2 : overhangIn;
    const requiredCapCourseWidthIn =
      wallWidthIn + requestedInnerExtensionIn + requestedOuterExtensionIn;
    const capCourseWidthIn = Math.max(requiredCapCourseWidthIn, capUnitWidthIn);
    const extraCourseWidthIn = Math.max(
      0,
      capCourseWidthIn - requiredCapCourseWidthIn,
    );
    const innerExtensionIn =
      placementMode === 'outward-only'
        ? requestedInnerExtensionIn + extraCourseWidthIn
        : requestedInnerExtensionIn + extraCourseWidthIn / 2;
    const outerExtensionIn =
      placementMode === 'outward-only'
        ? requestedOuterExtensionIn
        : requestedOuterExtensionIn + extraCourseWidthIn / 2;

    const capOuterWidthIn = planMetrics.outerWidthIn + outerExtensionIn * 2;
    const capOuterDepthIn = planMetrics.outerDepthIn + outerExtensionIn * 2;
    const capInnerWidthIn = Math.max(
      0,
      planMetrics.innerWidthIn - innerExtensionIn * 2,
    );
    const capInnerDepthIn = Math.max(
      0,
      planMetrics.innerDepthIn - innerExtensionIn * 2,
    );
    const capCenterlineWidthIn = (capOuterWidthIn + capInnerWidthIn) / 2;
    const capCenterlineDepthIn = (capOuterDepthIn + capInnerDepthIn) / 2;
    const capPerimeterIn =
      planMetrics.planShape === 'circular'
        ? Math.PI * capCenterlineWidthIn
        : this.calculateRectangularPerimeter(
            capCenterlineWidthIn,
            capCenterlineDepthIn,
          );
    const capUnitsPerCourseRaw = capPerimeterIn / (unitLengthIn + jointIn);
    const capUnitsPerCourseRounded = Math.max(
      1,
      Math.floor(capUnitsPerCourseRaw),
    );
    const actualModuleSpacingIn = capPerimeterIn / capUnitsPerCourseRounded;
    const actualJointIn = Math.max(0, actualModuleSpacingIn - unitLengthIn);
    const innerPerimeterIn =
      planMetrics.planShape === 'circular'
        ? Math.PI * capInnerWidthIn
        : this.calculateRectangularPerimeter(capInnerWidthIn, capInnerDepthIn);
    const outerPerimeterIn =
      planMetrics.planShape === 'circular'
        ? Math.PI * capOuterWidthIn
        : this.calculateRectangularPerimeter(capOuterWidthIn, capOuterDepthIn);
    const innerModuleSpacingIn = innerPerimeterIn / capUnitsPerCourseRounded;
    const outerModuleSpacingIn = outerPerimeterIn / capUnitsPerCourseRounded;
    const innerJointIn = innerModuleSpacingIn - unitLengthIn;
    const outerJointIn = outerModuleSpacingIn - unitLengthIn;
    const capInnerRadiusIn = Math.max(0.001, capInnerWidthIn / 2);
    const innerChordIn =
      planMetrics.planShape === 'circular'
        ? 2 *
          capInnerRadiusIn *
          Math.sin(actualModuleSpacingIn / (2 * capInnerRadiusIn))
        : unitLengthIn;
    const overlapSafetyIn = Math.max(0.036, jointIn * 0.1);
    const requiresTaperCutting =
      planMetrics.planShape === 'circular' &&
      (innerJointIn < 0 || unitLengthIn > innerChordIn - overlapSafetyIn);

    return {
      overhangIn,
      capCourseWidthIn,
      innerExtensionIn,
      outerExtensionIn,
      requiresTaperCutting,
      capOuterDiameterIn: Math.max(capOuterWidthIn, capOuterDepthIn),
      capOuterWidthIn,
      capOuterDepthIn,
      capInnerDiameterIn: Math.max(capInnerWidthIn, capInnerDepthIn),
      capInnerWidthIn,
      capInnerDepthIn,
      capCenterlineDiameterIn: Math.max(
        capCenterlineWidthIn,
        capCenterlineDepthIn,
      ),
      capCenterlineWidthIn,
      capCenterlineDepthIn,
      capUnitsPerCourseRaw,
      capUnitsPerCourseRounded,
      joint: {
        actualJointIn,
        innerJointIn,
        outerJointIn,
        actualModuleSpacingIn,
      },
    };
  }

  private calculateLogistics(
    totalUnits: number,
    capUnits: number,
    capUnitWeightLb: number,
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
      estimatedCapWeightLb: purchasedCapUnits * capUnitWeightLb,
      estimatedStoneWeightLb: stoneWithWasteFt3 * STONE_WEIGHT_LB_PER_FT3,
      estimatedMortarVolumeCubicFeet: purchasedUnits * MORTAR_FT3_PER_BRICK,
    };
  }

  private computeSafetyWarnings(
    input: MasonryInput,
    ventSpec: VentSpec,
    cutPlan: CutPlanSpec,
  ): SafetyWarning[] {
    const warnings: SafetyWarning[] = [];

    if (input.proximityToStructuresFt < 10) {
      warnings.push({
        code: 'clearance-too-low',
        message:
          'Minimum horizontal clearance is 10 ft from combustible structures.',
        actualValue: input.proximityToStructuresFt,
        requiredValue: 10,
      });
    }

    if (input.fuelType === 'wood' && input.linerType === 'none') {
      warnings.push({
        code: 'wood-liner-recommended',
        message:
          'Wood-burning configurations should include a refractory liner or steel fire ring.',
      });
    }

    if (cutPlan.requiresCutting) {
      warnings.push({
        code: 'tight-radius-cut-required',
        message:
          'Current circular radius causes inner-face brick overlap. Use tapered cuts or increase diameter.',
        actualValue: input.innerDiameterIn,
        requiredValue: cutPlan.minimumRecommendedInnerDiameterIn,
      });
    }

    if (input.fuelType !== 'wood') {
      if (ventSpec.totalOpenAreaSqIn < ventSpec.recommendedAreaMinSqIn) {
        warnings.push({
          code: 'gas-vent-area-out-of-range',
          message: 'Gas vent area is below the recommended 18-36 sq in range.',
          actualValue: ventSpec.totalOpenAreaSqIn,
          requiredValue: ventSpec.recommendedAreaMinSqIn,
        });
      } else if (
        ventSpec.recommendedAreaMaxSqIn !== undefined &&
        ventSpec.totalOpenAreaSqIn > ventSpec.recommendedAreaMaxSqIn
      ) {
        warnings.push({
          code: 'gas-vent-area-out-of-range',
          message: 'Gas vent area is above the recommended 18-36 sq in range.',
          actualValue: ventSpec.totalOpenAreaSqIn,
          requiredValue: ventSpec.recommendedAreaMaxSqIn,
        });
      }

      if (!ventSpec.crossVentilationValid) {
        warnings.push({
          code: 'gas-vent-layout-invalid',
          message:
            'Gas vent layouts should use an even number of openings for opposed cross-venting.',
          actualValue: ventSpec.ventCount,
          requiredValue: ventSpec.ventCount + 1,
        });
      }

      if (
        !ventSpec.gasLineEntryClear &&
        ventSpec.gasLineEntryAngleDeg !== undefined
      ) {
        warnings.push({
          code: 'gas-line-near-vent',
          message:
            'Gas line entry is landing on a planned vent opening. Rotate the line entry angle.',
          actualValue: ventSpec.gasLineEntryAngleDeg,
          requiredValue: 15,
        });
      }
    }

    return warnings;
  }

  private getLinerThickness(linerType: MasonryInput['linerType']): number {
    if (linerType === 'fire-brick') {
      return 2.5;
    }

    if (linerType === 'steel-ring') {
      return 0.25;
    }

    return 0;
  }

  private describeLiner(
    fuelType: MasonryInput['fuelType'],
    linerType: MasonryInput['linerType'],
  ): string {
    if (linerType === 'fire-brick') {
      return fuelType === 'wood'
        ? 'Fire-brick liner with expansion gap for wood-burning thermal protection.'
        : 'Fire-brick liner installed for additional thermal durability.';
    }

    if (linerType === 'steel-ring') {
      return fuelType === 'wood'
        ? 'Steel fire ring used as the inner heat shield.'
        : 'Steel ring lining used around the interior burn chamber.';
    }

    return fuelType === 'wood'
      ? 'No thermal liner selected. Research guidance recommends a refractory liner or steel ring for wood-burning pits.'
      : 'No dedicated thermal liner selected.';
  }

  private angleToBrickIndex(angleDeg: number, unitCount: number): number {
    if (unitCount <= 1) {
      return 0;
    }

    return (
      Math.round((this.normalizeAngle(angleDeg) / 360) * unitCount) % unitCount
    );
  }

  private brickIndexToAngle(brickIndex: number, unitCount: number): number {
    if (unitCount <= 1) {
      return 0;
    }

    return this.normalizeAngle((brickIndex / unitCount) * 360);
  }

  private ratioToBrickIndex(ratio: number, unitCount: number): number {
    if (unitCount <= 1) {
      return 0;
    }

    return Math.round(ratio * unitCount) % unitCount;
  }

  private normalizeAngle(angleDeg: number): number {
    return ((angleDeg % 360) + 360) % 360;
  }

  private uniqueIndexes(indexes: number[]): number[] {
    return Array.from(new Set(indexes)).sort((left, right) => left - right);
  }

  private resolveGasLineEntry(
    desiredIndex: number | undefined,
    ventIndexes: number[],
    unitCount: number,
  ): {
    gasLineEntryBrickIndex: number | undefined;
    gasLineAutoAdjusted: boolean;
  } {
    if (desiredIndex === undefined) {
      return { gasLineEntryBrickIndex: undefined, gasLineAutoAdjusted: false };
    }

    if (!ventIndexes.includes(desiredIndex)) {
      return {
        gasLineEntryBrickIndex: desiredIndex,
        gasLineAutoAdjusted: false,
      };
    }

    for (let delta = 1; delta <= unitCount; delta += 1) {
      const plusIndex = (desiredIndex + delta) % unitCount;
      if (!ventIndexes.includes(plusIndex)) {
        return { gasLineEntryBrickIndex: plusIndex, gasLineAutoAdjusted: true };
      }

      const minusIndex = (desiredIndex - delta + unitCount) % unitCount;
      if (!ventIndexes.includes(minusIndex)) {
        return {
          gasLineEntryBrickIndex: minusIndex,
          gasLineAutoAdjusted: true,
        };
      }
    }

    return { gasLineEntryBrickIndex: desiredIndex, gasLineAutoAdjusted: false };
  }

  private calculateVentAnchors(
    planMetrics: PlanMetrics,
    ventCount: number,
  ): Array<{ ratio: number }> {
    if (planMetrics.planShape === 'circular') {
      return Array.from({ length: ventCount }, (_, index) => ({
        ratio: index / ventCount,
      }));
    }

    const perimeter = this.calculateRectangularPerimeter(
      planMetrics.centerlineWidthIn,
      planMetrics.centerlineDepthIn,
    );
    const sideMidpoints = [
      planMetrics.centerlineWidthIn / 2,
      planMetrics.centerlineWidthIn + planMetrics.centerlineDepthIn / 2,
      planMetrics.centerlineWidthIn +
        planMetrics.centerlineDepthIn +
        planMetrics.centerlineWidthIn / 2,
      planMetrics.centerlineWidthIn * 2 +
        planMetrics.centerlineDepthIn +
        planMetrics.centerlineDepthIn / 2,
    ];

    if (ventCount <= 4) {
      if (ventCount === 2) {
        return [sideMidpoints[0], sideMidpoints[2]].map((distance) => ({
          ratio: distance / perimeter,
        }));
      }

      return sideMidpoints.slice(0, ventCount).map((distance) => ({
        ratio: distance / perimeter,
      }));
    }

    const start = sideMidpoints[0];
    return Array.from({ length: ventCount }, (_, index) => ({
      ratio:
        ((start + (perimeter / ventCount) * index) % perimeter) / perimeter,
    }));
  }

  private calculateRectangularPerimeter(
    widthIn: number,
    depthIn: number,
  ): number {
    return 2 * (widthIn + depthIn);
  }
}
