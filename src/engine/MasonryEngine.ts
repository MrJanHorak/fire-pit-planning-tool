import type {
  CornerInterlockGuidance,
  CapstoneSpec,
  CoursePlan,
  CourseStrategySummary,
  CutPlanSpec,
  FoundationSpec,
  GasHardwareTemplate,
  LinerSpec,
  LogisticsSpec,
  MasonryInput,
  MasonryOutput,
  MasonryUnit,
  PlanShape,
  SafetyWarning,
  SmokelessInsertPresetKey,
  SmokelessSpec,
  UnitOrientation,
  VentSpec,
  WallCourseStrategy,
} from '../types';
import { calculateSeatingMaterials } from '../utils/seatingMaterials';

const IN3_PER_FT3 = 1728;
const IN3_PER_YD3 = 46656;
const MODULAR_BRICK_WEIGHT_LB = 4.5;
const STONE_WEIGHT_LB_PER_FT3 = 100;
const BRICK_WASTE_FACTOR_PCT = 15;
const CAP_WASTE_FACTOR_PCT = 10;
const STONE_WASTE_FACTOR_PCT = 10;
const MORTAR_FT3_PER_BRICK = 0.0175;
const WALL_UNIT_DENSITY_BRICK_LB_PER_IN3 = 0.07;
const WALL_UNIT_DENSITY_STONE_LB_PER_IN3 = 0.09;

const ROCK_WALL_UNIT_PRESET_KEYS = new Set([
  'rockLedgestone',
  'rockFieldstone',
  'rockMosaic',
]);

/**
 * Approximate heat ratings (°F) for inner-face exposure per brick preset.
 * Inner firebox materials need ≥ 1,400°F; outer decorative shells need ≥ 400°F.
 */
const HEAT_RATINGS_F: Record<string, number> = {
  modular: 600,
  standard: 600,
  queen: 600,
  king: 600,
  norman: 600,
  jumboModular: 600,
  closure: 600,
  utility: 600,
  paver: 500,
  fireBrickSplits: 2000,
  fireBrickFull: 2000,
  radialFireBrick: 2000,
  bullnose: 600,
  radialFace: 600,
  rockLedgestone: 800,
  rockFieldstone: 800,
  rockMosaic: 800,
  custom: 600,
  'custom-radial': 600,
};

/** Minimum heat rating (°F) acceptable for the inner firebox wall. */
const INNER_WALL_MIN_HEAT_RATING_F = 1400;

/**
 * Default mortar type for a given material preset.
 * Inner firebox zone always needs refractory mortar.
 */
const DEFAULT_MORTAR_TYPE: Record<string, import('../types').MortarType> = {
  fireBrickSplits: 'refractory',
  fireBrickFull: 'refractory',
  radialFireBrick: 'refractory',
  rockLedgestone: 'type-n',
  rockFieldstone: 'type-n',
  rockMosaic: 'type-n',
};

function defaultMortarForPreset(presetKey: string): import('../types').MortarType {
  return DEFAULT_MORTAR_TYPE[presetKey] ?? 'type-n';
}

const WALL_UNIT_WEIGHT_OVERRIDES_LB: Record<string, number> = {
  modular: MODULAR_BRICK_WEIGHT_LB,
  rockLedgestone: 32,
  rockFieldstone: 45,
  rockMosaic: 28,
};

const GAS_HARDWARE_TEMPLATES: Record<
  GasHardwareTemplate,
  { label: string; recommendedAreaMinSqIn: number; recommendedAreaMaxSqIn: number }
> = {
  'generic-firepit': {
    label: 'Generic firepit cavity',
    recommendedAreaMinSqIn: 18,
    recommendedAreaMaxSqIn: 36,
  },
  'drop-in-pan': {
    label: 'Drop-in burner pan',
    recommendedAreaMinSqIn: 18,
    recommendedAreaMaxSqIn: 40,
  },
  'linear-burner': {
    label: 'Linear burner tray',
    recommendedAreaMinSqIn: 24,
    recommendedAreaMaxSqIn: 48,
  },
  'high-btu-bowl': {
    label: 'High-BTU bowl / ring',
    recommendedAreaMinSqIn: 36,
    recommendedAreaMaxSqIn: 60,
  },
};

/** Physical constants for the stack-effect draft pressure formula. */
const STACK_PATM_PA = 101325;   // atmospheric pressure (Pa)
const STACK_G_MS2 = 9.81;       // gravitational acceleration (m/s²)
const STACK_R_AIR = 287.05;     // specific gas constant for air (J/kg·K)
const STACK_T0_K = 293;         // ambient temperature (K) ≈ 20°C
const STACK_TI_K = 673;         // heated cavity air temperature (K) ≈ 400°C / 750°F

/** Optimal intake-to-outlet vent area ratio range for smokeless secondary combustion. */
const SMOKELESS_RATIO_MIN = 1.2;
const SMOKELESS_RATIO_MAX = 1.5;

interface SmokelessInsertPresetDef {
  label: string;
  baseOD: number;    // in
  flangeOD: number;  // in
  minDepth: number;  // in
  airGap: number;    // in
}

/**
 * Commercial smokeless insert dimensions.
 * Source: manufacturer specs + independent architectural analysis.
 */
export const SMOKELESS_INSERT_PRESETS: Record<
  import('../types').SmokelessInsertPresetKey,
  SmokelessInsertPresetDef
> = {
  'solo-stove-bonfire-2': {
    label: 'Solo Stove Bonfire 2.0',
    baseOD: 19.5,
    flangeOD: 21.5,
    minDepth: 14.5,
    airGap: 0.75,
  },
  'breeo-x19': {
    label: 'Breeo X19',
    baseOD: 19.0,
    flangeOD: 22.0,
    minDepth: 15.0,
    airGap: 1.5,
  },
  'breeo-x24': {
    label: 'Breeo X24',
    baseOD: 24.0,
    flangeOD: 27.5,
    minDepth: 15.0,
    airGap: 1.5,
  },
  'breeo-x30': {
    label: 'Breeo X30',
    baseOD: 30.0,
    flangeOD: 34.0,
    minDepth: 15.0,
    airGap: 2.0,
  },
  'tiki-patio': {
    label: 'Tiki Brand Patio Smokeless',
    baseOD: 24.75,
    flangeOD: 26.75,
    minDepth: 18.75,
    airGap: 1.0,
  },
  'custom-diy': {
    label: 'Custom / DIY Steel Liner',
    baseOD: 19.0,
    flangeOD: 21.0,
    minDepth: 14.0,
    airGap: 0.75,
  },
};

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

interface NaturalStoneEstimateMetrics {
  faceAreaSquareFeet: number;
  outerPerimeterFeet: number;
  tonsAt8InDepth: number;
  tonsAt4InDepth: number;
  tonsAt8InDepthWithWaste10Pct: number;
  tonsAt8InDepthWithWaste15Pct: number;
  tonsAt4InDepthWithWaste10Pct: number;
  tonsAt4InDepthWithWaste15Pct: number;
  typicalWallWeightLbMin: number;
  typicalWallWeightLbMax: number;
}

interface CourseSizing {
  unitCountRaw: number;
  unitCount: number;
  mainUnitCount: number;
  spacerCount: number;
}

interface CourseRecipe {
  orientation: UnitOrientation;
  unitLengthIn: number;
  jointIn: number;
  specialCourse: CoursePlan['specialCourse'];
  spacerCount: number;
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
  rockLedgestone: {
    name: 'Natural Stone - Ledgestone (Avg)',
    widthIn: 8,
    heightIn: 4,
    lengthIn: 12,
  },
  rockFieldstone: {
    name: 'Natural Stone - Fieldstone (Avg)',
    widthIn: 10,
    heightIn: 5,
    lengthIn: 14,
  },
  rockMosaic: {
    name: 'Natural Stone - Mosaic (Avg)',
    widthIn: 6,
    heightIn: 4,
    lengthIn: 9,
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
  bridgeCopingWide: {
    unit: {
      name: 'Bridge Coping Cap (Wide)',
      widthIn: 18,
      heightIn: 2.5,
      lengthIn: 24,
    },
    unitWeightLb: 44,
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
    const strategy = this.resolveCourseStrategy(input);
    const courseCount = Math.max(
      1,
      Math.ceil(input.wallHeightIn / (oriented.heightIn + input.mortarJointIn)),
    );
    const courses = this.buildCoursePlans(
      input,
      planMetrics,
      oriented,
      courseCount,
      strategy,
    );
    const totalUnits = courses.reduce(
      (sum, course) => sum + course.unitCount,
      0,
    );
    const baselineCourse = courses[0];
    const unitsPerCourseRaw =
      baselineCourse?.unitCountRaw ??
      this.calculatePlanUnitCountRaw(
        planMetrics,
        oriented.lengthIn,
        input.mortarJointIn,
      );
    const unitsPerCourseRounded = baselineCourse?.unitCount
      ? Math.max(1, Math.floor(baselineCourse.unitCount))
      : Math.max(1, Math.floor(unitsPerCourseRaw));
    const ventReferenceUnitCount = Math.max(
      1,
      ...courses.map((course) => course.unitCount),
    );
    const strategySummary = this.buildCourseStrategySummary(
      courses,
      strategy,
      input,
    );
    const linerSpec = this.calculateLiner(input, planMetrics);
    let thermalAssembly = this.calculateThermalAssembly(
      input,
      planMetrics,
      oriented,
      linerSpec,
    );
    const ventSpec = this.calculateVents(
      input,
      planMetrics,
      courseCount,
      ventReferenceUnitCount,
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
    thermalAssembly = this.applyCapBridgePlanning(
      input,
      thermalAssembly,
      capstone,
      resolvedCap.unit,
    );
    const cornerGuidance = this.calculateCornerInterlockGuidance(
      planMetrics,
      oriented.lengthIn,
      input.mortarJointIn,
    );
    const smokelessSpec = this.calculateSmokelessSpec(
      input,
      oriented,
      input.wallHeightIn,
    );
    const warnings = this.computeSafetyWarnings(
      input,
      ventSpec,
      cutPlan,
      strategySummary,
      thermalAssembly,
      smokelessSpec,
    );

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
      courseStrategy: strategySummary,
      capstone,
      logistics: this.calculateLogistics(
        totalUnits,
        oriented,
        planMetrics,
        capstone.capUnitsPerCourseRounded,
        resolvedCap.unitWeightLb,
        foundation,
        input,
        thermalAssembly,
      ),
      warnings,
      cornerGuidance,
      thermalAssembly,
      smokelessSpec,
    };
  }

  private sanitizeDim(value: number | undefined, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.max(0.5, value);
    }
    return fallback;
  }

  private calculateUnitWeightLb(unit: MasonryUnit): number {
    const densityLbPerIn3 = WALL_UNIT_DENSITY_BRICK_LB_PER_IN3;
    return Math.max(
      1,
      unit.widthIn * unit.heightIn * unit.lengthIn * densityLbPerIn3,
    );
  }

  private isRockWallPreset(input: MasonryInput): boolean {
    const presetKey = input.brickPresetKey ?? '';
    return ROCK_WALL_UNIT_PRESET_KEYS.has(presetKey);
  }

  private calculateWallUnitWeightLb(
    input: MasonryInput,
    wallUnit: MasonryUnit,
  ): number {
    const presetKey = input.brickPresetKey;
    if (presetKey && presetKey in WALL_UNIT_WEIGHT_OVERRIDES_LB) {
      return WALL_UNIT_WEIGHT_OVERRIDES_LB[presetKey];
    }

    const densityLbPerIn3 = this.isRockWallPreset(input)
      ? WALL_UNIT_DENSITY_STONE_LB_PER_IN3
      : WALL_UNIT_DENSITY_BRICK_LB_PER_IN3;

    return Math.max(
      1,
      wallUnit.widthIn *
        wallUnit.heightIn *
        wallUnit.lengthIn *
        densityLbPerIn3,
    );
  }

  private calculateNaturalStoneEstimate(
    input: MasonryInput,
    planMetrics: PlanMetrics,
  ): NaturalStoneEstimateMetrics {
    const outerPerimeterIn =
      planMetrics.planShape === 'circular'
        ? Math.PI * planMetrics.outerWidthIn
        : this.calculateRectangularPerimeter(
            planMetrics.outerWidthIn,
            planMetrics.outerDepthIn,
          );
    const outerPerimeterFeet = outerPerimeterIn / 12;
    const faceAreaSquareFeet = outerPerimeterFeet * (input.wallHeightIn / 12);
    const tonsAt8InDepth = faceAreaSquareFeet / 20;
    const tonsAt4InDepth = faceAreaSquareFeet / 40;

    return {
      faceAreaSquareFeet,
      outerPerimeterFeet,
      tonsAt8InDepth,
      tonsAt4InDepth,
      tonsAt8InDepthWithWaste10Pct: tonsAt8InDepth * 1.1,
      tonsAt8InDepthWithWaste15Pct: tonsAt8InDepth * 1.15,
      tonsAt4InDepthWithWaste10Pct: tonsAt4InDepth * 1.1,
      tonsAt4InDepthWithWaste15Pct: tonsAt4InDepth * 1.15,
      typicalWallWeightLbMin: faceAreaSquareFeet * 35,
      typicalWallWeightLbMax: faceAreaSquareFeet * 50,
    };
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

  /**
   * Resolves the outer wall unit for double-wall mode.
   * Uses outerWallBrickPresetKey if set; falls back to the inner wall unit.
   */
  private resolveOuterWallUnit(input: MasonryInput): MasonryUnit {
    const outerKey = input.outerWallBrickPresetKey;
    if (!outerKey) {
      return this.resolveRequestedWallUnit(input);
    }
    if (outerKey === 'custom') {
      return {
        name: 'Custom Brick (Outer)',
        lengthIn: this.sanitizeDim(input.customBrickLengthIn, 7.625),
        widthIn: this.sanitizeDim(input.customBrickWidthIn, 3.625),
        heightIn: this.sanitizeDim(input.customBrickHeightIn, 2.25),
      };
    }
    return BRICK_PRESETS[outerKey] ?? this.resolveRequestedWallUnit(input);
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
      input.planShape === 'circular' || input.planShape === 'hexagonal' || input.planShape === 'octagonal'
        ? input.innerDiameterIn
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

    const n = this.polygonSides(planMetrics.planShape as PlanShape);
    if (n > 0) {
      return this.polygonPerimeter(n, planMetrics.centerlineWidthIn) / (unitLengthIn + jointIn);
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
    return this.resolveOrientedUnit(unit, input.orientation);
  }

  private resolveOrientedUnit(
    unit: MasonryUnit,
    orientation: MasonryInput['orientation'],
  ): MasonryUnit {
    if (orientation === 'header') {
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
    const requestedCapOrientation = input.capOrientation ?? 'match-wall';
    const capOrientation =
      requestedCapOrientation === 'match-wall'
        ? input.orientation
        : requestedCapOrientation;

    if (!input.capstonePresetKey || input.capstonePresetKey === 'matching') {
      const capUnit = this.resolveOrientedUnit(
        {
          name: 'Matching Brick',
          widthIn: wallUnit.widthIn,
          heightIn: wallUnit.heightIn,
          lengthIn: wallUnit.lengthIn,
        },
        capOrientation,
      );

      return {
        unit: capUnit,
        unitWeightLb: this.calculateUnitWeightLb(capUnit),
      };
    }

    if (input.capstonePresetKey === 'custom') {
      const baseUnit: MasonryUnit = {
        name: 'Custom Cap Unit',
        lengthIn: this.sanitizeDim(input.customCapLengthIn, 14),
        widthIn: this.sanitizeDim(input.customCapWidthIn, 10),
        heightIn: this.sanitizeDim(input.customCapHeightIn, 2),
      };
      const unit = this.resolveOrientedUnit(baseUnit, capOrientation);

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
      const baseUnit: MasonryUnit = {
        name: 'Custom Radial Cap (Avg)',
        lengthIn: (innerLengthIn + outerLengthIn) / 2,
        widthIn: this.sanitizeDim(input.customCapWidthIn, 10),
        heightIn: this.sanitizeDim(input.customCapHeightIn, 2),
      };
      const unit = this.resolveOrientedUnit(baseUnit, capOrientation);

      return {
        unit,
        unitWeightLb: this.calculateUnitWeightLb(unit),
      };
    }

    const preset =
      CAPSTONE_PRESETS[input.capstonePresetKey] ?? CAPSTONE_PRESETS.matching;
    const unit = this.resolveOrientedUnit(preset.unit, capOrientation);

    return {
      unit,
      unitWeightLb: this.calculateUnitWeightLb(unit),
    };
  }

  private resolveCourseStrategy(input: MasonryInput): WallCourseStrategy {
    return input.wallCourseStrategy ?? 'uniform';
  }

  private resolveShimFrequency(input: MasonryInput): number {
    return Math.max(2, Math.floor(input.shimFrequency ?? 2));
  }

  private resolveShimMaxShare(input: MasonryInput): number {
    const pct = input.shimMaxSharePct ?? 25;
    return Math.min(0.33, Math.max(0.1, pct / 100));
  }

  private resolveAccentJointMultiplier(input: MasonryInput): number {
    const value = input.accentJointMultiplier ?? 1.75;
    return Math.max(1, value);
  }

  private resolveAccentCycleLength(input: MasonryInput): number {
    return Math.max(2, Math.floor(input.accentCycleLength ?? 3));
  }

  private resolveAccentCoursePosition(input: MasonryInput): number {
    return Math.max(1, Math.floor(input.accentCoursePosition ?? 2));
  }

  private isAccentCourse(input: MasonryInput, courseIndex: number): boolean {
    const cycleLength = this.resolveAccentCycleLength(input);
    const coursePosition = this.resolveAccentCoursePosition(input);
    const clampedPosition = Math.min(cycleLength, coursePosition);

    return (courseIndex % cycleLength) + 1 === clampedPosition;
  }

  private calculatePerimeterIn(planMetrics: PlanMetrics): number {
    if (planMetrics.planShape === 'circular') {
      return Math.PI * planMetrics.centerlineWidthIn;
    }

    const n = this.polygonSides(planMetrics.planShape as PlanShape);
    if (n > 0) {
      return this.polygonPerimeter(n, planMetrics.centerlineWidthIn);
    }

    return this.calculateRectangularPerimeter(
      planMetrics.centerlineWidthIn,
      planMetrics.centerlineDepthIn,
    );
  }

  private resolveCourseSizing(
    input: MasonryInput,
    planMetrics: PlanMetrics,
    recipe: CourseRecipe,
  ): CourseSizing {
    if (this.resolveCourseStrategy(input) !== 'shim-spacer') {
      const unitCountRaw = this.calculatePlanUnitCountRaw(
        planMetrics,
        recipe.unitLengthIn,
        recipe.jointIn,
      );

      return {
        unitCountRaw,
        unitCount: Math.max(1, Math.floor(unitCountRaw)),
        mainUnitCount: Math.max(1, Math.floor(unitCountRaw)),
        spacerCount: 0,
      };
    }

    const shimLengthIn = this.sanitizeDim(input.shimUnitLengthIn, 1.25);
    const perimeterIn = this.calculatePerimeterIn(planMetrics);
    const mainModuleIn = recipe.unitLengthIn + recipe.jointIn;
    const shimModuleIn = shimLengthIn + recipe.jointIn;
    const maxShimShare = this.resolveShimMaxShare(input);
    const estimatedMainCount = Math.max(
      4,
      Math.round(perimeterIn / mainModuleIn),
    );
    const minMainCount = Math.max(4, estimatedMainCount - 8);
    const maxMainCount = estimatedMainCount + 8;

    let best:
      | {
          mainUnitCount: number;
          spacerCount: number;
          lengthErrorIn: number;
        }
      | undefined;

    for (
      let mainUnitCount = minMainCount;
      mainUnitCount <= maxMainCount;
      mainUnitCount += 1
    ) {
      const maxSpacerByShare = Math.floor(
        (maxShimShare * mainUnitCount) / (1 - maxShimShare),
      );
      const maxSpacerCount = Math.max(
        0,
        Math.min(mainUnitCount, maxSpacerByShare),
      );

      for (
        let spacerCount = 1;
        spacerCount <= maxSpacerCount;
        spacerCount += 1
      ) {
        const runLengthIn =
          mainUnitCount * mainModuleIn + spacerCount * shimModuleIn;
        const lengthErrorIn = Math.abs(perimeterIn - runLengthIn);

        if (
          !best ||
          lengthErrorIn < best.lengthErrorIn - 0.0001 ||
          (Math.abs(lengthErrorIn - best.lengthErrorIn) < 0.0001 &&
            spacerCount < best.spacerCount)
        ) {
          best = {
            mainUnitCount,
            spacerCount,
            lengthErrorIn,
          };
        }
      }
    }

    if (!best) {
      const shimFrequency = this.resolveShimFrequency(input);
      const effectiveMainModuleIn = mainModuleIn + shimModuleIn / shimFrequency;
      const mainUnitsRaw = perimeterIn / Math.max(0.001, effectiveMainModuleIn);
      const mainUnitCount = Math.max(1, Math.floor(mainUnitsRaw));
      const spacerCount = Math.max(
        1,
        Math.floor(mainUnitCount / shimFrequency),
      );

      return {
        unitCountRaw: mainUnitsRaw + mainUnitsRaw / shimFrequency,
        unitCount: mainUnitCount + spacerCount,
        mainUnitCount,
        spacerCount,
      };
    }

    return {
      unitCountRaw: best.mainUnitCount + best.spacerCount,
      unitCount: best.mainUnitCount + best.spacerCount,
      mainUnitCount: best.mainUnitCount,
      spacerCount: best.spacerCount,
    };
  }

  private buildCourseRecipe(
    input: MasonryInput,
    orientedUnit: MasonryUnit,
    courseIndex: number,
    strategy: WallCourseStrategy,
  ): CourseRecipe {
    if (
      strategy === 'vented-accent' &&
      this.isAccentCourse(input, courseIndex)
    ) {
      const accentOrientation = input.accentCourseOrientation ?? 'header';
      const accentUnit = this.resolveOrientedUnit(
        orientedUnit,
        accentOrientation,
      );

      return {
        orientation: accentOrientation,
        unitLengthIn: accentUnit.lengthIn,
        jointIn: input.mortarJointIn * this.resolveAccentJointMultiplier(input),
        specialCourse: 'vented-accent',
        spacerCount: 0,
      };
    }

    return {
      orientation: input.orientation,
      unitLengthIn: orientedUnit.lengthIn,
      jointIn: input.mortarJointIn,
      specialCourse: strategy === 'shim-spacer' ? 'shim-spacer' : 'standard',
      spacerCount: 0,
    };
  }

  private buildCoursePlans(
    input: MasonryInput,
    planMetrics: PlanMetrics,
    orientedUnit: MasonryUnit,
    courseCount: number,
    strategy: WallCourseStrategy,
  ): CoursePlan[] {
    return Array.from({ length: courseCount }, (_, courseIndex) => {
      const recipe = this.buildCourseRecipe(
        input,
        orientedUnit,
        courseIndex,
        strategy,
      );
      const sizing = this.resolveCourseSizing(input, planMetrics, recipe);
      const moduleIn = recipe.unitLengthIn + recipe.jointIn;
      const spacerIndexes =
        strategy === 'shim-spacer'
          ? this.buildShimSpacerIndexes(
              sizing.mainUnitCount,
              sizing.spacerCount,
            )
          : [];

      return {
        courseIndex,
        unitCount: sizing.unitCount,
        offsetIn: courseIndex % 2 === 0 ? 0 : moduleIn / 2,
        unitCountRaw: sizing.unitCountRaw,
        orientation: recipe.orientation,
        jointIn: recipe.jointIn,
        specialCourse: recipe.specialCourse,
        spacerCount: sizing.spacerCount,
        spacerIndexes,
      };
    });
  }

  private buildShimSpacerIndexes(
    mainCount: number,
    spacerCount: number,
  ): number[] {
    if (spacerCount <= 0 || mainCount <= 0) {
      return [];
    }

    const totalUnits = mainCount + spacerCount;
    const indexes: number[] = [];
    const idealGap = mainCount / spacerCount;
    let nextSpacerAtMain = idealGap;
    let sequenceIndex = 0;
    let mainPlaced = 0;
    let spacersPlaced = 0;

    while (mainPlaced < mainCount) {
      mainPlaced += 1;
      sequenceIndex += 1;

      if (
        spacersPlaced < spacerCount &&
        mainPlaced >= nextSpacerAtMain - 0.001
      ) {
        indexes.push(sequenceIndex);
        spacersPlaced += 1;
        sequenceIndex += 1;
        nextSpacerAtMain += idealGap;
      }
    }

    while (spacersPlaced < spacerCount) {
      indexes.push(Math.min(sequenceIndex, totalUnits - 1));
      spacersPlaced += 1;
      sequenceIndex = Math.min(sequenceIndex + 1, totalUnits - 1);
    }

    return this.uniqueIndexes(indexes.map((index) => Math.max(0, index)));
  }

  private buildCourseStrategySummary(
    courses: CoursePlan[],
    strategy: WallCourseStrategy,
    input?: MasonryInput,
  ): CourseStrategySummary {
    return {
      strategy,
      shimUnitCount: courses.reduce(
        (sum, course) => sum + (course.spacerCount ?? 0),
        0,
      ),
      accentCourseIndexes: courses
        .filter((course) => course.specialCourse === 'vented-accent')
        .map((course) => course.courseIndex),
      shimFrequency:
        strategy === 'shim-spacer' && input
          ? Math.max(
              2,
              Math.round(
                courses.reduce(
                  (sum, course) =>
                    sum +
                    Math.max(0, course.unitCount - (course.spacerCount ?? 0)),
                  0,
                ) /
                  Math.max(
                    1,
                    courses.reduce(
                      (sum, course) => sum + (course.spacerCount ?? 0),
                      0,
                    ),
                  ),
              ),
            )
          : undefined,
      shimDensityPct:
        strategy === 'shim-spacer'
          ? (courses.reduce(
              (sum, course) => sum + (course.spacerCount ?? 0),
              0,
            ) /
              Math.max(
                1,
                courses.reduce((sum, course) => sum + course.unitCount, 0),
              )) *
            100
          : undefined,
      shimUnit:
        strategy === 'shim-spacer' && input
          ? {
              name: 'Shim Spacer Unit',
              lengthIn: this.sanitizeDim(input.shimUnitLengthIn, 1.25),
              widthIn: this.sanitizeDim(input.shimUnitWidthIn, 1.125),
              heightIn: this.sanitizeDim(input.shimUnitHeightIn, 2.25),
            }
          : undefined,
    };
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

  private calculateThermalAssembly(
    input: MasonryInput,
    planMetrics: PlanMetrics,
    wallUnit: MasonryUnit,
    linerSpec: LinerSpec,
  ): import('../types').ThermalAssemblySpec {
    const mode = input.thermalAssemblyMode ?? 'single-wall';
    const cavityFill = input.thermalCavityFill ?? 'air-gap';
    const cavityVentMode = input.thermalCavityVentMode ?? 'vented';
    const cavityWidthIn = this.sanitizeDim(input.thermalCavityWidthIn, 1.5);
    const tieSpacingIn = this.sanitizeDim(input.thermalTieSpacingIn, 16);

    // In double-wall mode the inner shell uses wallUnit (brickPresetKey)
    // and the outer shell uses the resolved outer wall unit.
    const outerWallUnit = mode === 'double-wall'
      ? this.resolveOrientedUnit(this.resolveOuterWallUnit(input), input.orientation)
      : wallUnit;

    const innerShellThicknessIn = Math.max(
      wallUnit.widthIn,
      linerSpec.enabled ? linerSpec.thicknessIn : wallUnit.widthIn,
    );
    const outerShellThicknessIn = mode === 'double-wall' ? outerWallUnit.widthIn : 0;
    const totalWallDepthIn =
      mode === 'double-wall'
        ? innerShellThicknessIn + cavityWidthIn + outerShellThicknessIn
        : innerShellThicknessIn;

    const perimeterIn =
      planMetrics.planShape === 'circular'
        ? Math.PI * Math.max(planMetrics.outerWidthIn, planMetrics.outerDepthIn)
        : this.calculateRectangularPerimeter(
            planMetrics.outerWidthIn,
            planMetrics.outerDepthIn,
          );
    const estimatedTieCount =
      mode === 'double-wall' ? Math.max(4, Math.ceil(perimeterIn / tieSpacingIn)) : 0;
    const outerShellWeightLb =
      mode === 'double-wall'
        ? estimatedTieCount * 2.25 + perimeterIn * 0.95
        : 0;

    const riskLevel =
      mode === 'double-wall'
        ? cavityWidthIn < 1.25
          ? 'high'
          : cavityFill === 'sand-fill'
            ? 'moderate'
            : input.fuelType === 'wood' && linerSpec.type === 'none'
              ? 'high'
              : cavityVentMode === 'sealed'
                ? 'moderate'
                : 'low'
        : 'low';

    // Resolve material metadata for double-wall mode.
    const innerKey = input.brickPresetKey ?? 'modular';
    const outerKey = (mode === 'double-wall' && input.outerWallBrickPresetKey)
      ? input.outerWallBrickPresetKey
      : innerKey;
    const innerHeatRatingF = HEAT_RATINGS_F[innerKey] ?? 600;
    const outerHeatRatingF = HEAT_RATINGS_F[outerKey] ?? 600;
    const innerMortarType: import('../types').MortarType =
      input.innerWallMortarType ?? (innerHeatRatingF >= INNER_WALL_MIN_HEAT_RATING_F ? 'refractory' : 'refractory');
    const outerMortarType: import('../types').MortarType =
      input.outerWallMortarType ?? defaultMortarForPreset(outerKey);

    const innerMaterialName = BRICK_PRESETS[innerKey]?.name ?? wallUnit.name;
    const outerMaterialName = mode === 'double-wall'
      ? (BRICK_PRESETS[outerKey]?.name ?? outerWallUnit.name)
      : undefined;

    const notes =
      mode === 'double-wall'
        ? [
            `Double-wall assembly active with a ${cavityWidthIn.toFixed(2)} in cavity.`,
            `Inner shell: ${innerMaterialName} (rated to ~${innerHeatRatingF.toLocaleString()}°F) — use ${innerMortarType === 'refractory' ? 'refractory (fireclay) mortar' : innerMortarType + ' mortar'}.`,
            `Outer shell: ${outerMaterialName} (rated to ~${outerHeatRatingF.toLocaleString()}°F) — use ${outerMortarType === 'type-n' ? 'Type N masonry mortar' : outerMortarType === 'type-s' ? 'Type S masonry mortar' : outerMortarType + ' mortar'}.`,
            cavityVentMode === 'vented'
              ? 'Vented cavity improves heat release and reduces trapped moisture.'
              : 'Sealed cavity reduces airflow and should be reviewed for moisture/expansion risk.',
            cavityFill === 'air-gap'
              ? 'Air-gap fill gives the strongest thermal break in this first-pass model.'
              : cavityFill === 'sand-fill'
                ? 'Sand fill increases mass and slows heat transfer, but can also hold heat longer.'
                : 'Insulated cavity board improves thermal resistance but should be verified against manufacturer ratings.',
          ]
        : [
            'Single-wall assembly active. Thermal liner handles the primary hot-face protection.',
          ];

    if (input.ashCleanoutType && input.ashCleanoutType !== 'none') {
      const cleanoutNotes: Record<string, string> = {
        'hinged-door': 'Ash cleanout door: frame one course-opening (≈8×8 in) in base course; use lintel brick or angle iron header; seal cast-iron frame with refractory mortar.',
        'removable-pan': 'Removable ash pan: leave base course open on one side (≈12 in wide) with steel channel guides; pan sits on ledge stone at hearth level.',
        'drain-holes': 'Drainage holes: omit mortar from 3–4 base-course head joints, or drill 1-in holes after cure; install stainless mesh screen over each hole to retain embers.',
      };
      notes.push(cleanoutNotes[input.ashCleanoutType] ?? 'Ash cleanout: see building plans.');
    }

    return {
      mode,
      cavityFill,
      cavityVentMode,
      cavityWidthIn: mode === 'double-wall' ? cavityWidthIn : 0,
      innerShellThicknessIn,
      outerShellThicknessIn,
      totalWallDepthIn,
      capBridgeRequiredWidthIn: 0,
      capBridgeRows: 1,
      capBridgeAdditionalUnits: 0,
      capBridgeCourseUnitCounts: [],
      estimatedTieCount,
      outerShellWeightLb,
      riskLevel,
      description:
        mode === 'double-wall'
          ? `Double-wall: ${innerMaterialName} inner / ${outerMaterialName ?? innerMaterialName} outer · ${cavityFill.replace('-', ' ')} cavity · ${cavityVentMode}.`
          : 'Single-wall assembly with thermal liner protection.',
      notes,
      innerMaterialName,
      outerMaterialName,
      innerHeatRatingF,
      outerHeatRatingF: mode === 'double-wall' ? outerHeatRatingF : undefined,
      innerMortarType,
      outerMortarType: mode === 'double-wall' ? outerMortarType : undefined,
    };
  }

  private applyCapBridgePlanning(
    input: MasonryInput,
    thermalAssembly: import('../types').ThermalAssemblySpec,
    capstone: CapstoneSpec,
    capUnit: MasonryUnit,
  ): import('../types').ThermalAssemblySpec {
    if (thermalAssembly.mode !== 'double-wall') {
      return thermalAssembly;
    }

    const requiredCapWidthIn =
      thermalAssembly.totalWallDepthIn + Math.max(0, input.capstoneOverhangIn);
    const capRowModuleWidthIn =
      Math.max(0.001, capUnit.widthIn + Math.max(0, input.mortarJointIn));
    const capBridgeRows = Math.max(
      1,
      Math.ceil(
        (requiredCapWidthIn + Math.max(0, input.mortarJointIn)) /
          capRowModuleWidthIn,
      ),
    );
    const capBridgeCourseUnitCounts = Array.from(
      { length: capBridgeRows },
      (_, rowIdx) => {
        if (rowIdx === 0) {
          return capstone.capUnitsPerCourseRounded;
        }
        const rowOffsetIn = rowIdx * capRowModuleWidthIn;
        const rowCenterlineWidthIn =
          capstone.capCenterlineWidthIn + rowOffsetIn * 2;
        const rowCenterlineDepthIn =
          capstone.capCenterlineDepthIn + rowOffsetIn * 2;
        const nBridge = this.polygonSides(input.planShape as PlanShape);
        const rowPerimeterIn =
          input.planShape === 'circular'
            ? Math.PI * Math.max(rowCenterlineWidthIn, rowCenterlineDepthIn)
            : nBridge > 0
              ? this.polygonPerimeter(nBridge, rowCenterlineWidthIn)
              : this.calculateRectangularPerimeter(
                  rowCenterlineWidthIn,
                  rowCenterlineDepthIn,
                );
        const rowUnitsRaw =
          rowPerimeterIn / (capUnit.lengthIn + capstone.joint.actualJointIn);
        return nBridge > 0
          ? Math.max(nBridge, Math.ceil(rowUnitsRaw / nBridge) * nBridge)
          : Math.max(1, Math.floor(rowUnitsRaw));
      },
    );
    const capBridgeAdditionalUnits = capBridgeCourseUnitCounts
      .slice(1)
      .reduce((sum, units) => sum + units, 0);
    const capBridgeRowsSummary = capBridgeCourseUnitCounts
      .map((units, idx) => `R${idx + 1}: ${units}`)
      .join(', ');

    const capBridgeNote =
      capBridgeRows > 1
        ? `Cap bridge planning: ${capBridgeRows} cap rows are required to span approximately ${requiredCapWidthIn.toFixed(2)} in over the double-wall assembly. Add ${capBridgeAdditionalUnits} closure units (before waste) beyond the primary cap ring.`
        : `Cap bridge planning: one cap row spans approximately ${requiredCapWidthIn.toFixed(2)} in over the double-wall assembly.`;
    const capBridgeBreakdownNote =
      capBridgeRows > 1
        ? `Cap bridge row counts (inside to outside): ${capBridgeRowsSummary}.`
        : `Cap bridge row count: ${capBridgeRowsSummary}.`;

    return {
      ...thermalAssembly,
      capBridgeRequiredWidthIn: requiredCapWidthIn,
      capBridgeRows,
      capBridgeAdditionalUnits,
      capBridgeCourseUnitCounts,
      notes: [...thermalAssembly.notes, capBridgeNote, capBridgeBreakdownNote],
    };
  }

  private calculateVents(
    input: MasonryInput,
    planMetrics: PlanMetrics,
    courseCount: number,
    unitCount: number,
  ): VentSpec {
    const gasTemplate = this.resolveGasHardwareTemplate(input);
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
        recommendedAreaMinSqIn: gasTemplate.recommendedAreaMinSqIn,
        recommendedAreaMaxSqIn: gasTemplate.recommendedAreaMaxSqIn,
        layout,
        crossVentilationValid,
        ventAnglesDeg,
        ventBrickIndexes,
        gasLineEntryAngleDeg: resolvedGasLineAngle,
        gasLineEntryBrickIndex,
        gasLineEntryClear,
        gasLineAutoAdjusted,
        gasHardwareTemplate: gasTemplate.key,
        gasHardwareTemplateLabel: gasTemplate.label,
      };
    }

    if (input.fuelType === 'natural-gas') {
      return {
        ventCount,
        placement: 'upper',
        targetCourseIndexes: [Math.max(0, courseCount - 1)],
        totalOpenAreaSqIn,
        openingAreaSqIn: input.ventOpeningAreaSqIn,
        recommendedAreaMinSqIn: gasTemplate.recommendedAreaMinSqIn,
        recommendedAreaMaxSqIn: gasTemplate.recommendedAreaMaxSqIn,
        layout,
        crossVentilationValid,
        ventAnglesDeg,
        ventBrickIndexes,
        gasLineEntryAngleDeg: resolvedGasLineAngle,
        gasLineEntryBrickIndex,
        gasLineEntryClear,
        gasLineAutoAdjusted,
        gasHardwareTemplate: gasTemplate.key,
        gasHardwareTemplateLabel: gasTemplate.label,
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
      gasHardwareTemplate: gasTemplate.key,
      gasHardwareTemplateLabel: gasTemplate.label,
    };
  }

  private resolveGasHardwareTemplate(input: MasonryInput): {
    key: GasHardwareTemplate;
    label: string;
    recommendedAreaMinSqIn: number;
    recommendedAreaMaxSqIn: number;
  } {
    const key = input.gasHardwareTemplate ?? 'generic-firepit';
    const template = GAS_HARDWARE_TEMPLATES[key];
    if (!template) {
      return {
        key: 'generic-firepit',
        label: GAS_HARDWARE_TEMPLATES['generic-firepit'].label,
        recommendedAreaMinSqIn:
          GAS_HARDWARE_TEMPLATES['generic-firepit'].recommendedAreaMinSqIn,
        recommendedAreaMaxSqIn:
          GAS_HARDWARE_TEMPLATES['generic-firepit'].recommendedAreaMaxSqIn,
      };
    }

    return {
      key,
      label: template.label,
      recommendedAreaMinSqIn: template.recommendedAreaMinSqIn,
      recommendedAreaMaxSqIn: template.recommendedAreaMaxSqIn,
    };
  }

  private calculateCornerInterlockGuidance(
    planMetrics: PlanMetrics,
    unitLengthIn: number,
    jointIn: number,
  ): CornerInterlockGuidance {
    if (planMetrics.planShape === 'circular') {
      return {
        required: false,
        recommendedOverlapIn: 0,
        cornerCutPerSideIn: 0,
        notes: ['Circular layouts do not use corner interlock details.'],
      };
    }

    const n = this.polygonSides(planMetrics.planShape as PlanShape);
    if (n > 0) {
      const effectiveModuleIn = unitLengthIn + jointIn;
      const recommendedOverlapIn = effectiveModuleIn / 2;
      const cornerAngleDeg = (180 - 360 / n) / 2;
      return {
        required: true,
        recommendedOverlapIn,
        cornerCutPerSideIn: 0,
        notes: [
          `${n}-sided polygon has ${n} corners, each with an interior angle of ${(180 - 360 / n).toFixed(1)}°.`,
          `Corner units require mitre cuts at ${cornerAngleDeg.toFixed(1)}° from face to maintain a tight polygon corner.`,
          `Alternate running bond offsets by ${recommendedOverlapIn.toFixed(2)} in on successive courses at each corner.`,
          'Use half-bats or cut starters at polygon corners to stagger vertical joints.',
        ],
      };
    }

    const effectiveModuleIn = unitLengthIn + jointIn;
    const recommendedOverlapIn = effectiveModuleIn / 2;
    const remainderWidth = planMetrics.centerlineWidthIn % effectiveModuleIn;
    const remainderDepth = planMetrics.centerlineDepthIn % effectiveModuleIn;
    const cornerTrimIn =
      Math.max(0, Math.min(remainderWidth, remainderDepth, effectiveModuleIn)) /
      2;

    return {
      required: true,
      recommendedOverlapIn,
      cornerCutPerSideIn: cornerTrimIn,
      notes: [
        `Alternate corner starters by approximately ${recommendedOverlapIn.toFixed(2)} in every other course to maintain running-bond interlock.`,
        cornerTrimIn > 0
          ? `Rectangular corner closure units may need up to ${cornerTrimIn.toFixed(2)} in trim per side for clean bond closure.`
          : 'Corner closure trims are minimal at this module spacing.',
        'Avoid stacking vertical corner joints on successive courses.',
      ],
    };
  }

  private calculateCutPlan(
    planMetrics: PlanMetrics,
    unitLengthIn: number,
    jointIn: number,
    unitCount: number,
  ): CutPlanSpec {
    if (planMetrics.planShape !== 'circular') {
      const n = this.polygonSides(planMetrics.planShape as PlanShape);
      const cornerAngleDeg = n > 0 ? (180 - 360 / n) / 2 : 45;
      const notes =
        n > 0
          ? [
              `${n}-sided polygon plan: no circular wedge cutting required.`,
              `Corner units at each of the ${n} corners need a mitre cut of ${cornerAngleDeg.toFixed(1)}° on each side face (interior corner angle ${(180 - 360 / n).toFixed(1)}°).`,
              `Alternate the running bond at each corner to maintain interlock across courses.`,
            ]
          : [
              'Rectangular and square plans avoid circular wedge compression, but corner units may still need trim cuts for preferred bond layout.',
            ];
      return {
        requiresCutting: n > 0,
        innerJointIn: jointIn,
        centerlineModuleSpacingIn: unitLengthIn + jointIn,
        recommendedTaperPerBrickIn: 0,
        recommendedCutPerSideIn: 0,
        recommendedCutAngleDeg: cornerAngleDeg,
        minimumRecommendedInnerDiameterIn: Math.min(
          planMetrics.innerWidthIn,
          planMetrics.innerDepthIn,
        ),
        notes,
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

    const halfBatNote =
      planMetrics.innerWidthIn < 24
        ? 'Inner diameter is below 24 in — half-bat (approx. 4 in) bricks or radial/wedge units are strongly recommended to avoid excessively wide pie-slice outer joints.'
        : null;

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
            ...(halfBatNote
              ? [halfBatNote]
              : ['Alternative: increase inner diameter or use shorter units.']),
          ]
        : [
            'No circular wedge cutting required at the current diameter.',
            ...(halfBatNote ? [halfBatNote] : []),
          ],
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
        : (() => {
            const n = this.polygonSides(planMetrics.planShape as PlanShape);
            if (n > 0) {
              // Polygon area = n × a² × tan(π/n), where a = apothem = footprintWidth/2
              const a = footprintWidthIn / 2;
              return n * a * a * Math.tan(Math.PI / n);
            }
            return footprintWidthIn * footprintDepthIn;
          })();
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
    const n = this.polygonSides(planMetrics.planShape as PlanShape);
    const capPerimeterIn =
      planMetrics.planShape === 'circular'
        ? Math.PI * capCenterlineWidthIn
        : n > 0
          ? this.polygonPerimeter(n, capCenterlineWidthIn)
          : this.calculateRectangularPerimeter(
              capCenterlineWidthIn,
              capCenterlineDepthIn,
            );
    const capUnitsPerCourseRaw = capPerimeterIn / (unitLengthIn + jointIn);
    // For polygon plans, ceil to a multiple of n so each face gets a whole
    // number of bricks and module spacing stays at or below one brick+joint
    // (rounding down to 1 brick/face would leave half-face-width gaps).
    // Rectangular/square and circular plans use floor for the ring count.
    const capUnitsPerCourseRounded =
      n > 0
        ? Math.max(n, Math.ceil(capUnitsPerCourseRaw / n) * n)
        : Math.max(1, Math.floor(capUnitsPerCourseRaw));
    const actualModuleSpacingIn = capPerimeterIn / capUnitsPerCourseRounded;
    const actualJointIn = Math.max(0, actualModuleSpacingIn - unitLengthIn);
    const innerPerimeterIn =
      planMetrics.planShape === 'circular'
        ? Math.PI * capInnerWidthIn
        : n > 0
          ? this.polygonPerimeter(n, capInnerWidthIn)
          : this.calculateRectangularPerimeter(capInnerWidthIn, capInnerDepthIn);
    const outerPerimeterIn =
      planMetrics.planShape === 'circular'
        ? Math.PI * capOuterWidthIn
        : n > 0
          ? this.polygonPerimeter(n, capOuterWidthIn)
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
    wallUnit: MasonryUnit,
    planMetrics: PlanMetrics,
    capUnits: number,
    capUnitWeightLb: number,
    foundation: FoundationSpec,
    input: MasonryInput,
    thermalAssembly: import('../types').ThermalAssemblySpec,
  ): LogisticsSpec {
    const purchasedUnits = Math.ceil(
      totalUnits * (1 + BRICK_WASTE_FACTOR_PCT / 100),
    );
    const purchasedCapUnits = Math.ceil(
      capUnits * (1 + CAP_WASTE_FACTOR_PCT / 100),
    );
    const thermalCapBridgeAdditionalUnits =
      thermalAssembly.mode === 'double-wall'
        ? thermalAssembly.capBridgeAdditionalUnits
        : 0;
    const thermalCapBridgePurchasedUnits =
      thermalAssembly.mode === 'double-wall'
        ? Math.ceil(
            thermalCapBridgeAdditionalUnits *
              (1 + CAP_WASTE_FACTOR_PCT / 100),
          )
        : 0;
    const thermalCapBridgeWeightLb =
      thermalCapBridgePurchasedUnits * capUnitWeightLb;
    const stoneWithWasteFt3 =
      foundation.stoneVolumeCubicFeet * (1 + STONE_WASTE_FACTOR_PCT / 100);
    const wallUnitWeightLb = this.calculateWallUnitWeightLb(input, wallUnit);

    // For double-wall, compute outer shell weight using the outer material's density.
    let outerShellUnitWeightLb = wallUnitWeightLb;
    if (thermalAssembly.mode === 'double-wall' && input.outerWallBrickPresetKey) {
      const outerUnit = this.resolveOuterWallUnit(input);
      const tempInputOuter = { ...input, brickPresetKey: input.outerWallBrickPresetKey };
      outerShellUnitWeightLb = this.calculateWallUnitWeightLb(tempInputOuter, outerUnit);
    }
    const outerShellTotalWeightLb =
      thermalAssembly.mode === 'double-wall'
        ? totalUnits * outerShellUnitWeightLb * 1.05
        : 0;

    const logistics: LogisticsSpec = {
      wasteFactorPct: BRICK_WASTE_FACTOR_PCT,
      purchasedUnits,
      purchasedCapUnits,
      estimatedBrickWeightLb: purchasedUnits * wallUnitWeightLb,
      estimatedCapWeightLb:
        purchasedCapUnits * capUnitWeightLb + thermalCapBridgeWeightLb,
      estimatedStoneWeightLb: stoneWithWasteFt3 * STONE_WEIGHT_LB_PER_FT3,
      estimatedMortarVolumeCubicFeet: purchasedUnits * MORTAR_FT3_PER_BRICK,
      thermalAssemblyWeightLb: outerShellTotalWeightLb,
      thermalAssemblyAdditionalUnits:
        thermalAssembly.mode === 'double-wall' ? totalUnits : 0,
      thermalCapBridgeAdditionalUnits,
      thermalCapBridgePurchasedUnits,
      thermalCapBridgeWeightLb,
      thermalAssemblyNotes: thermalAssembly.notes,
    };

    if (this.isRockWallPreset(input)) {
      logistics.naturalStoneEstimate = this.calculateNaturalStoneEstimate(
        input,
        planMetrics,
      );
    }

    // Add seating area materials if configured
    if (
      input.seatingGroundType &&
      input.seatingAreaRadiusFt &&
      input.seatingAreaRadiusFt > 0
    ) {
      logistics.seatingAreaMaterials = calculateSeatingMaterials(
        input.seatingGroundType,
        input.seatingAreaShape ?? 'circular',
        input.seatingFurnitureStyle ?? 'adirondack',
        input.seatingDensity ?? 'standard',
        input.seatingAreaRadiusFt,
      );
    }

    return logistics;
  }

  private calculateSmokelessSpec(
    input: MasonryInput,
    wallUnit: MasonryUnit,
    wallHeightIn: number,
  ): SmokelessSpec | undefined {
    if (!input.smokelessMode || input.fuelType !== 'wood') {
      return undefined;
    }

    // --- Resolve insert preset ---
    const presetKey: SmokelessInsertPresetKey = input.smokelessInsertPreset ?? 'custom-diy';
    const presetDef = SMOKELESS_INSERT_PRESETS[presetKey];
    const isCustom = presetKey === 'custom-diy';

    const insertBaseOD = isCustom && input.smokelessInsertBaseOD != null
      ? input.smokelessInsertBaseOD
      : presetDef.baseOD;
    const insertFlangeOD = isCustom && input.smokelessInsertFlangeOD != null
      ? input.smokelessInsertFlangeOD
      : presetDef.flangeOD;
    const insertMinDepthIn = isCustom && input.smokelessInsertMinDepthIn != null
      ? input.smokelessInsertMinDepthIn
      : presetDef.minDepth;

    // Allow air gap override for any preset.
    const airGapIn = input.smokelessInsertAirGapIn != null
      ? Math.max(0.25, input.smokelessInsertAirGapIn)
      : presetDef.airGap;

    // D_masonry = D_base + 2 × G_air
    const requiredMasonryID = insertBaseOD + 2 * airGapIn;

    // --- Vent sizing ---
    const primaryVentCount = Math.max(3, input.smokelessPrimaryVentCount ?? 20);
    const primaryVentDiameterIn = Math.max(0.25, input.smokelessPrimaryVentDiameterIn ?? 0.75);
    const secondaryVentCount = Math.max(3, input.smokelessSecondaryVentCount ?? 20);
    const secondaryVentDiameterIn = Math.max(0.25, input.smokelessSecondaryVentDiameterIn ?? 0.5);

    const ventCircleAreaSqIn = (d: number) => Math.PI * Math.pow(d / 2, 2);
    const primaryVentTotalAreaSqIn = primaryVentCount * ventCircleAreaSqIn(primaryVentDiameterIn);
    const secondaryVentTotalAreaSqIn = secondaryVentCount * ventCircleAreaSqIn(secondaryVentDiameterIn);

    // --- Intake/outlet ratio check (optimal: 1.2 – 1.5) ---
    const intakeOutletRatio = secondaryVentTotalAreaSqIn > 0
      ? primaryVentTotalAreaSqIn / secondaryVentTotalAreaSqIn
      : 0;
    const intakeOutletRatioStatus: SmokelessSpec['intakeOutletRatioStatus'] =
      intakeOutletRatio < SMOKELESS_RATIO_MIN
        ? 'starved'
        : intakeOutletRatio > SMOKELESS_RATIO_MAX
          ? 'overcooled'
          : 'optimal';

    // --- Stack effect draft pressure (Pa) ---
    // ΔP = Patm × (g × H / R) × (1/T0 − 1/Ti), H in meters
    const cavityHeightM = wallHeightIn * 0.0254;
    const draftPressurePa =
      STACK_PATM_PA *
      (STACK_G_MS2 * cavityHeightM / STACK_R_AIR) *
      (1 / STACK_T0_K - 1 / STACK_TI_K);

    // --- Base-course block omissions for intake vents ---
    // One omitted block opening ≈ wallUnit.lengthIn × wallUnit.heightIn (sq in)
    const singleBlockOpeningAreaSqIn = Math.max(1, wallUnit.lengthIn * wallUnit.heightIn);
    const baseVentBlockOmissions = Math.max(3, Math.ceil(primaryVentTotalAreaSqIn / singleBlockOpeningAreaSqIn));

    // --- Flange overlap safety (D_flange ≥ D_masonry + 1.0 in is secure) ---
    const blockInnerRadius = requiredMasonryID / 2;
    const flangeRadius = insertFlangeOD / 2;
    const flangeOverlap = flangeRadius - blockInnerRadius;
    const flangeOverlapStatus: SmokelessSpec['flangeOverlapStatus'] =
      flangeOverlap <= 0.25 ? 'unsafe' : flangeOverlap < 1.0 ? 'marginal' : 'secure';

    // --- Notes ---
    const notes: string[] = [
      `Smokeless secondary-combustion mode active — insert: ${presetDef.label}.`,
      `Required masonry inner diameter: ${requiredMasonryID.toFixed(2)} in (insert base ${insertBaseOD} in + 2 × ${airGapIn} in air gap).`,
      `Flange overlap: ${flangeOverlap.toFixed(2)} in — status: ${flangeOverlapStatus}. Insert flange (${insertFlangeOD} in OD) must rest securely on capstones.`,
      `Primary intake vents: ${primaryVentCount}× ${primaryVentDiameterIn}" dia. holes = ${primaryVentTotalAreaSqIn.toFixed(2)} sq in total.`,
      `Secondary combustion jets: ${secondaryVentCount}× ${secondaryVentDiameterIn}" dia. holes = ${secondaryVentTotalAreaSqIn.toFixed(2)} sq in total.`,
      `Intake/outlet ratio: ${intakeOutletRatio.toFixed(2)} — ${intakeOutletRatioStatus === 'optimal' ? '✓ optimal (1.2–1.5)' : intakeOutletRatioStatus === 'starved' ? '⚠ below 1.2 — add more or larger intake holes' : '⚠ above 1.5 — reduce intake area or increase jet count'}.`,
      `Stack-effect draft pressure: ~${draftPressurePa.toFixed(1)} Pa at current wall height.`,
      `First course: omit ${baseVentBlockOmissions} blocks evenly spaced to create primary air intake openings.`,
      `Minimum pit depth required: ${insertMinDepthIn} in — current wall height: ${wallHeightIn} in.`,
    ];

    return {
      enabled: true,
      insertPreset: presetKey,
      insertLabel: presetDef.label,
      insertBaseOD,
      insertFlangeOD,
      insertMinDepthIn,
      requiredMasonryID,
      airGapIn,
      primaryVentCount,
      primaryVentDiameterIn,
      primaryVentTotalAreaSqIn,
      secondaryVentCount,
      secondaryVentDiameterIn,
      secondaryVentTotalAreaSqIn,
      intakeOutletRatio,
      intakeOutletRatioStatus,
      draftPressurePa,
      baseVentBlockOmissions,
      flangeOverlapStatus,
      notes,
    };
  }

  private computeSafetyWarnings(
    input: MasonryInput,
    ventSpec: VentSpec,
    cutPlan: CutPlanSpec,
    strategySummary: CourseStrategySummary,
    thermalAssembly: import('../types').ThermalAssemblySpec,
    smokelessSpec: SmokelessSpec | undefined,
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

    const overheadClearanceFt = input.overheadClearanceFt ?? 20;
    const recommendedOverheadClearanceFt = input.fuelType === 'wood' ? 21 : 15;
    if (overheadClearanceFt < recommendedOverheadClearanceFt) {
      warnings.push({
        code: 'vertical-clearance-low',
        message:
          `Overhead clearance is below the recommended ${recommendedOverheadClearanceFt} ft baseline for ${input.fuelType === 'wood' ? 'wood-burning' : 'gas'} builds near branches, soffits, and other overhead combustibles.`,
        actualValue: overheadClearanceFt,
        requiredValue: recommendedOverheadClearanceFt,
      });
    }

    if (input.fuelType === 'wood' && input.linerType === 'none') {
      warnings.push({
        code: 'wood-liner-recommended',
        message:
          'Wood-burning configurations should include a refractory liner or steel fire ring.',
      });
    }

    if (thermalAssembly.mode === 'double-wall') {
      if (thermalAssembly.cavityWidthIn < 1.25) {
        warnings.push({
          code: 'double-wall-cavity-tight',
          message:
            'Double-wall cavity width is below the recommended 1.25 in minimum for a practical thermal break.',
          actualValue: thermalAssembly.cavityWidthIn,
          requiredValue: 1.25,
        });
      }

      if (
        thermalAssembly.riskLevel === 'high' ||
        thermalAssembly.cavityVentMode === 'sealed'
      ) {
        warnings.push({
          code: 'double-wall-thermal-review',
          message:
            'Double-wall thermal assembly needs a closer review for heat transfer, moisture, and expansion behavior.',
        });
      }

      // Warn if the inner wall material is not rated for firebox temperatures.
      const innerRating = thermalAssembly.innerHeatRatingF ?? 0;
      if (innerRating < INNER_WALL_MIN_HEAT_RATING_F) {
        warnings.push({
          code: 'outer-wall-heat-risk',
          message: `Inner wall material "${thermalAssembly.innerMaterialName ?? 'selected'}" is rated to only ~${innerRating.toLocaleString()}°F. The firebox inner shell should use firebrick or refractory material rated to at least ${INNER_WALL_MIN_HEAT_RATING_F.toLocaleString()}°F.`,
          actualValue: innerRating,
          requiredValue: INNER_WALL_MIN_HEAT_RATING_F,
        });
      }

      // Warn if inner mortar is not refractory.
      if (thermalAssembly.innerMortarType && thermalAssembly.innerMortarType !== 'refractory') {
        warnings.push({
          code: 'mortar-zone-mismatch',
          message: `Inner firebox wall uses "${thermalAssembly.innerMortarType}" mortar. Refractory (fireclay) mortar is required for the inner firebox zone — standard Portland-based mortars fail above ~572°F.`,
        });
      }
    }

    // --- Smokeless secondary-combustion checks ---
    if (smokelessSpec?.enabled) {
      if (smokelessSpec.intakeOutletRatioStatus === 'starved') {
        warnings.push({
          code: 'smokeless-vent-ratio-low',
          message: `Smokeless vent ratio ${smokelessSpec.intakeOutletRatio.toFixed(2)} is below the minimum 1.2. Add more or larger primary intake holes to prevent an air-starved burn that stalls secondary combustion.`,
          actualValue: smokelessSpec.intakeOutletRatio,
          requiredValue: SMOKELESS_RATIO_MIN,
        });
      } else if (smokelessSpec.intakeOutletRatioStatus === 'overcooled') {
        warnings.push({
          code: 'smokeless-vent-ratio-high',
          message: `Smokeless vent ratio ${smokelessSpec.intakeOutletRatio.toFixed(2)} exceeds the maximum 1.5. Reduce intake area or increase secondary jets — excess cold air cools the cavity below the ~600°F re-ignition threshold.`,
          actualValue: smokelessSpec.intakeOutletRatio,
          requiredValue: SMOKELESS_RATIO_MAX,
        });
      }
      if (smokelessSpec.flangeOverlapStatus === 'unsafe') {
        warnings.push({
          code: 'smokeless-flange-unsafe',
          message: `Insert flange overlap is only ${(smokelessSpec.insertFlangeOD / 2 - smokelessSpec.requiredMasonryID / 2).toFixed(2)} in — the insert may fall into the pit. Flange OD (${smokelessSpec.insertFlangeOD} in) must overlap the masonry inner edge by at least 1 in on each side.`,
        });
      } else if (smokelessSpec.flangeOverlapStatus === 'marginal') {
        warnings.push({
          code: 'smokeless-flange-unsafe',
          message: `Insert flange overlap is marginal. Verify the insert seats securely on the capstones before finalizing wall dimensions.`,
        });
      }
      if (input.wallHeightIn < smokelessSpec.insertMinDepthIn) {
        warnings.push({
          code: 'smokeless-depth-insufficient',
          message: `Wall height (${input.wallHeightIn} in) is less than the minimum pit depth required for this insert (${smokelessSpec.insertMinDepthIn} in). Increase wall height or choose a shallower insert.`,
          actualValue: input.wallHeightIn,
          requiredValue: smokelessSpec.insertMinDepthIn,
        });
      }
    }

    if (this.isRockWallPreset(input)) {
      warnings.push({
        code: 'natural-stone-geology-check-required',
        message:
          'Natural stone selected: verify geology before build. Use dense, non-porous stones (granite, basalt, marble) and avoid river rocks or porous sedimentary stones in direct-heat zones.',
      });

      if (
        input.naturalStoneType === 'river-rock' ||
        input.naturalStoneType === 'sandstone' ||
        input.naturalStoneType === 'limestone' ||
        input.naturalStoneType === 'shale'
      ) {
        warnings.push({
          code: 'natural-stone-unsafe-type',
          message:
            'Selected natural stone type is high risk in direct heat. Avoid river rock and porous sedimentary stones for the fire-facing shell or inner zone.',
        });
      }

      if (
        input.stoneBuildMethod === 'mortared' &&
        (input.drainageCondition === 'slow-draining' ||
          input.drainageCondition === 'poor-drainage' ||
          input.frostClimate)
      ) {
        warnings.push({
          code: 'natural-stone-mortared-drainage-review',
          message:
            'Mortared natural stone in wet or freeze-thaw conditions needs rigid footing and drainage detailing to reduce joint cracking risk.',
        });
      }

      if (input.fuelType === 'wood' && input.linerType !== 'fire-brick') {
        warnings.push({
          code: 'natural-stone-heat-shield-recommended',
          message:
            'Natural stone shell with wood fuel should include a dedicated heat shield. Prefer a fire-brick liner or steel ring to reduce cracking and heat-spall risk.',
        });
      }
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

    if (input.planShape === 'circular' && input.innerDiameterIn < 24) {
      warnings.push({
        code: 'tight-radius-half-bat-recommended',
        message:
          'Inner diameter is below 24 in. Standard-length bricks produce excessively wide pie-slice mortar joints on the outer face. Use half-bat (approx. 4 in) bricks or purpose-made radial/wedge units.',
        actualValue: input.innerDiameterIn,
        requiredValue: 24,
      });
    }

    if (input.mortarJointIn > 0) {
      warnings.push({
        code: 'mortar-curing-required',
        message:
          'Mortared masonry requires a minimum 28-day curing period before applying sustained heat. Do not light the first fire until the mortar has reached full strength.',
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

    if (
      strategySummary.strategy === 'vented-accent' &&
      this.resolveAccentJointMultiplier(input) > 2
    ) {
      warnings.push({
        code: 'course-bearing-risk',
        message:
          'Accent-course joint multiplier exceeds 2.0 and may reduce bearing continuity between courses.',
        actualValue: this.resolveAccentJointMultiplier(input),
        requiredValue: 2,
      });
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

  private polygonSides(shape: PlanShape): number {
    if (shape === 'hexagonal') return 6;
    if (shape === 'octagonal') return 8;
    return 0; // not a polygon
  }

  private polygonPerimeter(n: number, spanIn: number): number {
    // Regular polygon perimeter: n sides × side-length, where side = apothem × 2tan(π/n)
    return n * spanIn * Math.tan(Math.PI / n);
  }
}
