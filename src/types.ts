export type FuelType = 'wood' | 'propane' | 'natural-gas';
export type BondPattern = 'running-bond';
export type UnitOrientation = 'stretcher' | 'header';
export type LinerType = 'none' | 'fire-brick' | 'steel-ring';
export type PlanShape = 'circular' | 'square' | 'rectangular';
export type CapPlacementMode = 'outward-only' | 'symmetric';

export interface MasonryUnit {
  name: string;
  widthIn: number;
  heightIn: number;
  lengthIn: number;
}

export interface MasonryInput {
  planShape: PlanShape;
  innerDiameterIn: number;
  innerWidthIn: number;
  innerDepthIn: number;
  wallHeightIn: number;
  proximityToStructuresFt: number;
  fuelType: FuelType;
  linerType: LinerType;
  expansionGapIn: number;
  mortarJointIn: number;
  orientation: UnitOrientation;
  bondPattern: BondPattern;
  ventCount: number;
  ventOpeningAreaSqIn: number;
  gasLineEntryAngleDeg: number;
  capstoneOverhangIn: number;
  capPlacementMode: CapPlacementMode;
  capstonePresetKey?: string;
  brickPresetKey?: string;
  customBrickLengthIn?: number;
  customBrickWidthIn?: number;
  customBrickHeightIn?: number;
  customBrickInnerLengthIn?: number;
  customBrickOuterLengthIn?: number;
  customCapLengthIn?: number;
  customCapWidthIn?: number;
  customCapHeightIn?: number;
  customCapInnerLengthIn?: number;
  customCapOuterLengthIn?: number;
}

export interface SafetyWarning {
  code:
    | 'clearance-too-low'
    | 'wood-liner-recommended'
    | 'tight-radius-cut-required'
    | 'gas-vent-area-out-of-range'
    | 'gas-vent-layout-invalid'
    | 'gas-line-near-vent';
  message: string;
  actualValue?: number;
  requiredValue?: number;
}

export interface CutPlanSpec {
  requiresCutting: boolean;
  innerJointIn: number;
  centerlineModuleSpacingIn: number;
  recommendedTaperPerBrickIn: number;
  recommendedCutPerSideIn: number;
  recommendedCutAngleDeg: number;
  minimumRecommendedInnerDiameterIn: number;
  notes: string[];
}

export interface VentSpec {
  ventCount: number;
  targetCourseIndexes: number[];
  placement: 'base' | 'upper';
  totalOpenAreaSqIn: number;
  openingAreaSqIn: number;
  recommendedAreaMinSqIn: number;
  recommendedAreaMaxSqIn?: number;
  layout: 'evenly-spaced' | 'opposed-pairs';
  crossVentilationValid: boolean;
  ventAnglesDeg: number[];
  ventBrickIndexes: number[];
  gasLineEntryAngleDeg?: number;
  gasLineEntryBrickIndex?: number;
  gasLineEntryClear: boolean;
  gasLineAutoAdjusted: boolean;
}

export interface LinerSpec {
  enabled: boolean;
  recommended: boolean;
  type: LinerType;
  thicknessIn: number;
  expansionGapIn: number;
  outerShellInnerDiameterIn: number;
  outerShellInnerWidthIn: number;
  outerShellInnerDepthIn: number;
  linerOuterDiameterIn: number;
  linerOuterWidthIn: number;
  linerOuterDepthIn: number;
  linerInnerDiameterIn: number;
  linerInnerWidthIn: number;
  linerInnerDepthIn: number;
  description: string;
}

export interface FoundationSpec {
  footprintDiameterIn: number;
  footprintWidthIn: number;
  footprintDepthIn: number;
  stoneDepthIn: number;
  footprintAreaSquareFeet: number;
  stoneVolumeCubicFeet: number;
  stoneVolumeCubicYards: number;
}

export interface LogisticsSpec {
  wasteFactorPct: number;
  estimatedBrickWeightLb: number;
  estimatedStoneWeightLb: number;
  purchasedUnits: number;
  purchasedCapUnits: number;
  estimatedCapWeightLb: number;
  estimatedMortarVolumeCubicFeet: number;
}

export interface CapstoneJointSpec {
  actualJointIn: number;
  innerJointIn: number;
  outerJointIn: number;
  actualModuleSpacingIn: number;
}

export interface CapstoneSpec {
  overhangIn: number;
  capCourseWidthIn: number;
  innerExtensionIn: number;
  outerExtensionIn: number;
  requiresTaperCutting: boolean;
  capOuterDiameterIn: number;
  capOuterWidthIn: number;
  capOuterDepthIn: number;
  capInnerDiameterIn: number;
  capInnerWidthIn: number;
  capInnerDepthIn: number;
  capCenterlineDiameterIn: number;
  capCenterlineWidthIn: number;
  capCenterlineDepthIn: number;
  capUnitsPerCourseRaw: number;
  capUnitsPerCourseRounded: number;
  joint: CapstoneJointSpec;
}

export interface CoursePlan {
  courseIndex: number;
  unitCount: number;
  offsetIn: number;
}

export interface MasonryOutput {
  planShape: PlanShape;
  innerSpanWidthIn: number;
  innerSpanDepthIn: number;
  outerSpanWidthIn: number;
  outerSpanDepthIn: number;
  effectiveOuterDiameterIn: number;
  centerlineDiameterIn: number;
  centerlineSpanWidthIn: number;
  centerlineSpanDepthIn: number;
  mortarJointIn: number;
  resolvedUnit: MasonryUnit;
  resolvedCapUnit: MasonryUnit;
  courses: CoursePlan[];
  unitsPerCourseRaw: number;
  unitsPerCourseRounded: number;
  totalUnits: number;
  ventSpec: VentSpec;
  cutPlan: CutPlanSpec;
  linerSpec: LinerSpec;
  foundation: FoundationSpec;
  capstone: CapstoneSpec;
  logistics: LogisticsSpec;
  warnings: SafetyWarning[];
}
